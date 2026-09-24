import os
import openpyxl
import datetime
from app.extensions import db
from app.models.student import Student
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.assessment import Assessment
from app.models.fln_record import FLNRecord

LEVEL_DESCRIPTIONS = {
    "HIN": {
        1: "Beginner / प्रारंभिक",
        2: "Letter / अक्षर (Alphabets)",
        3: "Word / शब्द",
        4: "Paragraph / अनुच्छेद",
        5: "Story / कहानी"
    },
    "MATH": {
        1: "Beginner / प्रारंभिक (0-9)",
        2: "Number Recognition / संख्या पहचान (10-99)",
        3: "Addition / Subtraction / जोड़-घटाव",
        4: "Multiplication / गुणा",
        5: "Division / भाग"
    },
    "ENG": {
        1: "Character / Letters",
        2: "Words / शब्द",
        3: "Sentences / वाक्य",
        4: "Story Reading",
        5: "Comprehension"
    }
}

def resolve_level_name(subject_code: str, level: int | None, is_absent: bool = False) -> str:
    if is_absent:
        return "Absent (Ab)"
    if not level or level < 1 or level > 5:
        return "Not Evaluated"
    code = (subject_code or "").upper()
    return LEVEL_DESCRIPTIONS.get(code, {}).get(level, f"Level {level}")

class FLNService:
    @staticmethod
    def get_matrix(class_section_id: int, assessment_id: int):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        assessment = db.session.get(Assessment, assessment_id)
        if not assessment:
            raise ValueError("Assessment not found.")

        # Get FLN core subjects (Hindi, Maths, English)
        fln_subjects = Subject.query.filter_by(school_id=classroom.school_id, is_fln_subject=True, is_active=True).order_by(Subject.id.asc()).all()
        
        # Get active students in this class
        students = Student.query.filter_by(class_section_id=class_section_id, status="ACTIVE").order_by(Student.roll_no.asc()).all()

        # Get existing records
        records = FLNRecord.query.filter_by(class_section_id=class_section_id, assessment_id=assessment_id).all()
        record_map = {}
        for r in records:
            record_map[(r.student_id, r.subject_id)] = r

        # Build matrix
        matrix = []
        for st in students:
            row = {
                "student_id": st.id,
                "roll_no": st.roll_no,
                "name": st.name,
                "admission_no": st.admission_no,
                "subjects": {}
            }
            for sub in fln_subjects:
                rec = record_map.get((st.id, sub.id))
                row["subjects"][sub.code] = {
                    "record_id": rec.id if rec else None,
                    "subject_id": sub.id,
                    "level": rec.level if rec else None,
                    "level_name": rec.level_name if rec else None,
                    "is_absent": rec.is_absent if rec else False,
                    "remarks": rec.remarks if rec else None
                }
            matrix.append(row)

        return {
            "classroom": classroom.to_dict(),
            "assessment": assessment.to_dict(),
            "subjects": [s.to_dict() for s in fln_subjects],
            "matrix": matrix
        }

    @staticmethod
    def save_record(data: dict, evaluator_id: int = None):
        student_id = data["student_id"]
        assessment_id = data["assessment_id"]
        subject_id = data["subject_id"]

        student = db.session.get(Student, student_id)
        subject = db.session.get(Subject, subject_id)
        assessment = db.session.get(Assessment, assessment_id)

        if not student or not subject or not assessment:
            raise ValueError("Student, Subject, or Assessment not found.")

        is_absent = data.get("is_absent", False)
        level = None if is_absent else int(data.get("level"))
        level_name = resolve_level_name(subject.code, level, is_absent)

        rec = FLNRecord.query.filter_by(
            student_id=student_id,
            assessment_id=assessment_id,
            subject_id=subject_id
        ).first()

        if rec:
            rec.level = level
            rec.level_name = level_name
            rec.is_absent = is_absent
            rec.evaluator_id = evaluator_id or rec.evaluator_id
            rec.remarks = data.get("remarks", rec.remarks)
            rec.assessment_date = datetime.date.today()
        else:
            rec = FLNRecord(
                school_id=student.school_id,
                class_section_id=student.class_section_id,
                student_id=student_id,
                assessment_id=assessment_id,
                subject_id=subject_id,
                level=level,
                level_name=level_name,
                is_absent=is_absent,
                evaluator_id=evaluator_id,
                remarks=data.get("remarks"),
                assessment_date=datetime.date.today()
            )
            db.session.add(rec)

        db.session.commit()
        return rec

    @staticmethod
    def bulk_save_matrix(class_section_id: int, assessment_id: int, entries: list, evaluator_id: int = None):
        """
        Entries is an array of:
        {
           student_id: 1,
           subject_id: 2,
           level: 3, # or None
           is_absent: false
        }
        """
        saved_count = 0
        for entry in entries:
            FLNService.save_record({
                "student_id": entry["student_id"],
                "assessment_id": assessment_id,
                "subject_id": entry["subject_id"],
                "level": entry.get("level"),
                "is_absent": entry.get("is_absent", False),
                "remarks": entry.get("remarks")
            }, evaluator_id=evaluator_id)
            saved_count += 1

        return saved_count

    @staticmethod
    def get_summary(class_section_id: int, assessment_id: int):
        records = FLNRecord.query.filter_by(class_section_id=class_section_id, assessment_id=assessment_id).all()
        classroom = db.session.get(ClassSection, class_section_id)
        fln_subjects = Subject.query.filter_by(school_id=classroom.school_id, is_fln_subject=True).all() if classroom else []

        summary = {}
        for sub in fln_subjects:
            summary[sub.code] = {
                "subject_name": sub.name,
                "L1": 0, "L2": 0, "L3": 0, "L4": 0, "L5": 0, "Ab": 0, "total": 0
            }

        for r in records:
            if not r.subject:
                continue
            code = r.subject.code
            if code not in summary:
                continue

            summary[code]["total"] += 1
            if r.is_absent:
                summary[code]["Ab"] += 1
            elif r.level and 1 <= r.level <= 5:
                summary[code][f"L{r.level}"] += 1

        return summary

    @staticmethod
    def seed_fln_from_workbook(class_section_id: int, assessment_id: int):
        """
        Ingests the ground-truth baseline FLN entries from sheet FLN of FLN III-A 2026-27 (1).xlsx.
        """
        template_path = r"A:\fln xml system\templates_storage\FLN_TEMPLATE.xlsx"
        if not os.path.exists(template_path):
            template_path = r"A:\fln xml system\FLN III-A 2026-27 (1).xlsx"

        if not os.path.exists(template_path):
            raise FileNotFoundError("Workbook file not found.")

        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        # Subjects
        hin = Subject.query.filter_by(school_id=classroom.school_id, code="HIN").first()
        eng = Subject.query.filter_by(school_id=classroom.school_id, code="ENG").first()
        math = Subject.query.filter_by(school_id=classroom.school_id, code="MATH").first()

        wb = openpyxl.load_workbook(template_path, read_only=True, data_only=True)
        if "FLN" not in wb.sheetnames:
            wb.close()
            raise ValueError("FLN sheet not found in workbook.")

        ws = wb["FLN"]
        ingested = 0

        for row in ws.iter_rows(values_only=True):
            if not row or row[0] is None or not str(row[0]).strip().isdigit():
                continue

            roll_no = int(row[0])
            student = Student.query.filter_by(class_section_id=class_section_id, roll_no=roll_no).first()
            if not student:
                continue

            # Row 3 format:
            # Col 5: Hindi name, Col 6: Maths name, Col 7: English name
            # Col 8: Hindi level numeric, Col 9: English level numeric, Col 10: Maths level numeric
            # Parse Hindi
            hin_val = row[8]
            if hin and hin_val is not None:
                is_ab = str(hin_val).strip().lower() in ["ab", "absent", "a"]
                try:
                    lvl = int(hin_val) if not is_ab else None
                except ValueError:
                    lvl = None
                    is_ab = True

                FLNService.save_record({
                    "student_id": student.id,
                    "assessment_id": assessment_id,
                    "subject_id": hin.id,
                    "level": lvl,
                    "is_absent": is_ab
                })
                ingested += 1

            # Parse English
            eng_val = row[9]
            if eng and eng_val is not None:
                is_ab = str(eng_val).strip().lower() in ["ab", "absent", "a"]
                try:
                    lvl = int(eng_val) if not is_ab else None
                except ValueError:
                    lvl = None
                    is_ab = True

                FLNService.save_record({
                    "student_id": student.id,
                    "assessment_id": assessment_id,
                    "subject_id": eng.id,
                    "level": lvl,
                    "is_absent": is_ab
                })
                ingested += 1

            # Parse Maths
            math_val = row[10]
            if math and math_val is not None:
                is_ab = str(math_val).strip().lower() in ["ab", "absent", "a"]
                try:
                    lvl = int(math_val) if not is_ab else None
                except ValueError:
                    lvl = None
                    is_ab = True

                FLNService.save_record({
                    "student_id": student.id,
                    "assessment_id": assessment_id,
                    "subject_id": math.id,
                    "level": lvl,
                    "is_absent": is_ab
                })
                ingested += 1

        wb.close()
        return ingested

    @staticmethod
    def get_class_students_progress(class_section_id: int):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        fln_assessments = Assessment.query.filter_by(school_id=classroom.school_id, assessment_type="FLN").order_by(Assessment.start_date.asc(), Assessment.id.asc()).all()
        fln_subjects = Subject.query.filter_by(school_id=classroom.school_id, is_fln_subject=True, is_active=True).order_by(Subject.id.asc()).all()
        students = Student.query.filter_by(class_section_id=class_section_id, status="ACTIVE").order_by(Student.roll_no.asc()).all()

        records = FLNRecord.query.filter_by(class_section_id=class_section_id).all()
        rec_map = {}
        for r in records:
            rec_map[(r.student_id, r.assessment_id, r.subject_id)] = r

        students_progress = []
        for st in students:
            rounds_data = []
            latest_hindi = None
            latest_maths = None
            latest_english = None
            latest_remark = ""

            for assess in fln_assessments:
                hin_rec = next((rec_map.get((st.id, assess.id, s.id)) for s in fln_subjects if "hin" in s.code.lower()), None)
                math_rec = next((rec_map.get((st.id, assess.id, s.id)) for s in fln_subjects if "math" in s.code.lower() or "ganit" in s.code.lower()), None)
                eng_rec = next((rec_map.get((st.id, assess.id, s.id)) for s in fln_subjects if "eng" in s.code.lower()), None)

                assess_remark = ""
                for r_candidate in [hin_rec, math_rec, eng_rec]:
                    if r_candidate and r_candidate.remarks:
                        assess_remark = r_candidate.remarks
                        break

                if assess_remark:
                    latest_remark = assess_remark

                if hin_rec and not hin_rec.is_absent and hin_rec.level:
                    latest_hindi = hin_rec.level
                if math_rec and not math_rec.is_absent and math_rec.level:
                    latest_maths = math_rec.level
                if eng_rec and not eng_rec.is_absent and eng_rec.level:
                    latest_english = eng_rec.level

                rounds_data.append({
                    "assessment_id": assess.id,
                    "assessment_name": assess.name,
                    "assessment_code": assess.code,
                    "assessment_date": assess.start_date.strftime("%d/%m/%Y") if assess.start_date else "",
                    "hindi": {"level": hin_rec.level, "level_name": hin_rec.level_name, "is_absent": hin_rec.is_absent} if hin_rec else None,
                    "maths": {"level": math_rec.level, "level_name": math_rec.level_name, "is_absent": math_rec.is_absent} if math_rec else None,
                    "english": {"level": eng_rec.level, "level_name": eng_rec.level_name, "is_absent": eng_rec.is_absent} if eng_rec else None,
                    "remarks": assess_remark
                })

            avg_level = 0
            evaluated_count = 0
            for l in [latest_hindi, latest_maths, latest_english]:
                if l is not None:
                    avg_level += l
                    evaluated_count += 1
            avg_level = round(avg_level / evaluated_count, 1) if evaluated_count > 0 else 1.0

            status_tag = "On Track"
            if avg_level >= 4.0:
                status_tag = "Advanced Mastery"
            elif avg_level <= 2.0:
                status_tag = "Remedial Attention"
            else:
                status_tag = "Steady Progress"

            students_progress.append({
                "student_id": st.id,
                "name": st.name,
                "roll_no": st.roll_no,
                "admission_no": st.admission_no,
                "photo_url": st.photo_url,
                "father_name": st.father_name,
                "latest_hindi_level": latest_hindi,
                "latest_maths_level": latest_maths,
                "latest_english_level": latest_english,
                "avg_level": avg_level,
                "status_tag": status_tag,
                "latest_remark": latest_remark,
                "rounds": rounds_data
            })

        return {
            "classroom": classroom.to_dict(),
            "assessments": [a.to_dict() for a in fln_assessments],
            "subjects": [s.to_dict() for s in fln_subjects],
            "students": students_progress
        }

    @staticmethod
    def save_student_remarks(class_section_id: int, assessment_id: int, remarks_list: list, evaluator_id: int = None):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")
        fln_subjects = Subject.query.filter_by(school_id=classroom.school_id, is_fln_subject=True, is_active=True).all()
        default_sub = fln_subjects[0] if fln_subjects else None

        updated_count = 0
        for item in remarks_list:
            st_id = item.get("student_id")
            rem_text = item.get("remarks", "")
            if not st_id:
                continue

            existing_records = FLNRecord.query.filter_by(student_id=st_id, assessment_id=assessment_id).all()
            if existing_records:
                for r in existing_records:
                    r.remarks = rem_text
                    if evaluator_id:
                        r.evaluator_id = evaluator_id
                updated_count += 1
            elif default_sub:
                student = db.session.get(Student, st_id)
                if student:
                    rec = FLNRecord(
                        school_id=student.school_id,
                        class_section_id=class_section_id,
                        student_id=st_id,
                        assessment_id=assessment_id,
                        subject_id=default_sub.id,
                        level=None,
                        level_name="Not Evaluated",
                        is_absent=False,
                        remarks=rem_text,
                        evaluator_id=evaluator_id,
                        assessment_date=datetime.date.today()
                    )
                    db.session.add(rec)
                    updated_count += 1

        db.session.commit()
        return updated_count

