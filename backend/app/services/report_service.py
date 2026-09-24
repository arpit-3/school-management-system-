import datetime
from app.extensions import db
from app.models.student import Student
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.assessment import Assessment
from app.models.mark import StudentMark
from app.models.fln_record import FLNRecord
from app.models.attendance import StudentAttendance
from app.services.calculation_engine import CalculationEngine, assign_grade

class ReportService:
    @staticmethod
    def get_student_report_card(student_id: int):
        student = db.session.get(Student, student_id)
        if not student:
            raise ValueError("Student not found.")

        classroom = student.classroom
        school = student.school
        active_session = school.active_session if school else None

        # Calculate class results to obtain rank and percentile
        class_results = CalculationEngine.calculate_annual_class_results(classroom.id)
        student_result = next((r for r in class_results["roster"] if r["student_id"] == student.id), None)

        # Subjects
        subjects = Subject.query.filter_by(school_id=school.id, is_active=True).order_by(Subject.id.asc()).all()

        # FLN Records
        fln_records = FLNRecord.query.filter_by(student_id=student.id).all()
        fln_summary = {}
        for f in fln_records:
            sub_name = f.subject.name if f.subject else "General"
            fln_summary[sub_name] = {
                "level": f.level,
                "level_name": f.level_name,
                "is_absent": f.is_absent
            }

        # Attendance
        att = StudentAttendance.query.filter_by(student_id=student.id, term=1).first()

        # Teacher & Principal
        teacher_name = classroom.class_teacher.full_name if classroom and classroom.class_teacher else "Indrajeet"
        hos_name = school.principal_name if school and school.principal_name else "Shambhu Dayal Meena"

        # Remarks
        pct = student_result["overall_percentage"] if student_result else 0.0
        if pct >= 80.0:
            remarks = "Exceptional performance! Demonstrates outstanding intellectual curiosity and consistency."
        elif pct >= 60.0:
            remarks = "Good academic progress. Consistent effort observed; encourage daily English reading fluency."
        elif pct >= 33.0:
            remarks = "Promoted with passing grade. Needs focused guidance in foundational literacy and numeracy."
        else:
            remarks = "Requires intensive academic intervention and remedial support in core subjects."

        return {
            "school": {
                "name": school.name if school else "MCP NITHARI NO 1 BOYS",
                "code": school.code if school else "1253018",
                "zone": school.zone if school else "ROHINI",
                "state": school.state if school else "NEW DELHI",
                "session": active_session.session_name if active_session else "2026-27",
                "principal_name": hos_name
            },
            "student": {
                "id": student.id,
                "roll_no": student.roll_no,
                "name": student.name,
                "admission_no": student.admission_no,
                "dob": student.dob.strftime("%d/%m/%Y") if student.dob else "N/A",
                "father_name": student.father_name or "N/A",
                "mother_name": student.mother_name or "N/A",
                "class_section": classroom.display_name if classroom else "Class III-A",
                "class_teacher": teacher_name,
                "photo_url": student.photo_url
            },
            "academic_evaluation": {
                "subjects": student_result["subjects"] if student_result else {},
                "grand_total_obtained": student_result["grand_total_obtained"] if student_result else 0.0,
                "grand_total_max": student_result["grand_total_max"] if student_result else 80.0,
                "overall_percentage": student_result["overall_percentage"] if student_result else 0.0,
                "overall_grade": student_result["overall_grade"] if student_result else "E",
                "grade_desc": student_result["grade_desc"] if student_result else "Needs Improvement",
                "rank": student_result["rank"] if student_result else None,
                "total_students": class_results["summary_stats"]["total_students"],
                "status": student_result["status"] if student_result else "PENDING"
            },
            "fln_progress": fln_summary,
            "attendance": {
                "working_days": att.working_days if att else 110.0,
                "present_days": att.present_days if att else 0.0,
                "absent_days": att.absent_days if att else 110.0,
                "percentage": att.percentage if att else 0.0,
                "is_low_attendance": att.is_low_attendance if att else True
            },
            "teacher_remarks": remarks
        }

    @staticmethod
    def get_class_full_packet(class_section_id: int):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Class section not found.")

        students = Student.query.filter_by(class_section_id=class_section_id, status="ACTIVE").order_by(Student.roll_no.asc()).all()
        report_cards = []
        for s in students:
            try:
                rc = ReportService.get_student_report_card(s.id)
                report_cards.append(rc)
            except Exception:
                pass

        broadsheet = CalculationEngine.calculate_annual_class_results(class_section_id)

        return {
            "classroom": classroom.to_dict(),
            "total_students": len(report_cards),
            "broadsheet": broadsheet,
            "report_cards": report_cards
        }

    @staticmethod
    def get_class_broadsheet(class_section_id: int):
        return CalculationEngine.calculate_annual_class_results(class_section_id)

    @staticmethod
    def get_school_summary(school_id: int):
        school = db.session.get(School, school_id)
        if not school:
            raise ValueError("School not found.")

        classrooms = ClassSection.query.filter_by(school_id=school_id).all()
        total_students = Student.query.filter_by(school_id=school_id, status="ACTIVE").count()

        # Compute overall class summaries
        class_summaries = []
        overall_pcts = []
        total_promoted = 0
        total_evaluated = 0

        for c in classrooms:
            res = CalculationEngine.calculate_annual_class_results(c.id)
            stats = res["summary_stats"]
            class_summaries.append({
                "class_id": c.id,
                "display_name": c.display_name,
                "total_students": stats["total_students"],
                "class_mean": stats["class_mean_percentage"],
                "pass_percentage": stats["pass_percentage"],
                "promoted_count": stats["promoted_count"],
                "compartment_count": stats["compartment_count"]
            })
            if stats["class_mean_percentage"] > 0:
                overall_pcts.append(stats["class_mean_percentage"])
            total_promoted += stats["promoted_count"]
            total_evaluated += stats["evaluated_count"]

        school_mean = round(sum(overall_pcts) / len(overall_pcts), 1) if overall_pcts else 0.0
        school_pass_pct = round((total_promoted / total_evaluated) * 100.0, 1) if total_evaluated > 0 else 0.0

        return {
            "school": school.to_dict(),
            "metrics": {
                "total_classes": len(classrooms),
                "total_students": total_students,
                "school_mean_percentage": school_mean,
                "school_pass_percentage": school_pass_pct,
                "total_promoted": total_promoted,
                "total_evaluated": total_evaluated
            },
            "classes": class_summaries
        }

    @staticmethod
    def get_annexure_f1(student_id: int):
        student = db.session.get(Student, student_id)
        if not student:
            raise ValueError("Student not found.")

        classroom = student.classroom
        school = student.school
        active_session = school.active_session if school else None

        # Fetch all FLN assessments
        fln_records = FLNRecord.query.filter_by(student_id=student.id).order_by(FLNRecord.assessment_date.asc(), FLNRecord.id.asc()).all()

        # Group by assessment / date
        assessments_map = {}
        for r in fln_records:
            key = r.assessment_id
            if key not in assessments_map:
                assess_obj = r.assessment
                assessments_map[key] = {
                    "assessment_id": key,
                    "assessment_name": assess_obj.name if assess_obj else f"Round {r.assessment_id}",
                    "assessment_date": r.assessment_date.strftime("%d/%m/%Y") if r.assessment_date else (assess_obj.start_date.strftime("%d/%m/%Y") if assess_obj and assess_obj.start_date else ""),
                    "hindi": None,
                    "maths": None,
                    "english": None,
                    "remarks": r.remarks or ""
                }
            
            sub_name = (r.subject.name if r.subject else "").lower()
            val = {
                "level": r.level,
                "level_name": r.level_name,
                "is_absent": r.is_absent
            }
            if "hin" in sub_name:
                assessments_map[key]["hindi"] = val
            elif "math" in sub_name or "ganit" in sub_name:
                assessments_map[key]["maths"] = val
            elif "eng" in sub_name:
                assessments_map[key]["english"] = val
            if r.remarks and not assessments_map[key]["remarks"]:
                assessments_map[key]["remarks"] = r.remarks

        # Convert to ordered list
        rows = list(assessments_map.values())

        # If empty or fewer than 25, pad with empty entries for clean register printing
        total_rows_needed = max(len(rows), 24)
        padded_rows = []
        for i in range(total_rows_needed):
            if i < len(rows):
                padded_rows.append(rows[i])
            else:
                padded_rows.append({
                    "assessment_id": None,
                    "assessment_name": "",
                    "assessment_date": "",
                    "hindi": None,
                    "maths": None,
                    "english": None,
                    "remarks": ""
                })

        teacher_name = classroom.class_teacher.full_name if classroom and classroom.class_teacher else "Indrajeet"
        hos_name = school.principal_name if school and school.principal_name else "Shambhu Dayal Meena"

        return {
            "school": {
                "name": school.name if school else "MCP NITHARI NO 1 BOYS",
                "code": school.code if school else "20",
                "udise_id": school.udise_id if school else "07020102001",
                "corporation_name": school.corporation_name or "MUNICIPAL CORPORATION OF DELHI",
                "department_name": school.department_name or "EDUCATION DEPARTMENT",
                "zone": school.zone or "ROHINI ZONE",
                "ward_number": school.ward_number or "40",
                "state": school.state or "NEW DELHI",
                "session": active_session.session_name if active_session else "2026-27",
                "principal_name": hos_name,
                "teacher_name": teacher_name
            },
            "student": {
                "id": student.id,
                "name": student.name,
                "father_name": student.father_name or "",
                "mother_name": student.mother_name or "",
                "admission_no": student.admission_no or "",
                "roll_no": student.roll_no or "",
                "class_section": classroom.display_name if classroom else "III-A",
                "dob": student.dob.strftime("%d/%m/%Y") if student.dob else "",
                "photo_url": student.photo_url
            },
            "progress_rows": padded_rows
        }

    @staticmethod
    def get_annexure_f2(class_section_id: int):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Class section not found.")

        school = classroom.school
        active_session = school.active_session if school else None
        students = Student.query.filter_by(class_section_id=class_section_id, status="ACTIVE").all()
        total_enrolled = len(students)
        student_ids = [s.id for s in students]

        # Get all assessments evaluated for this class
        assessments = Assessment.query.filter_by(school_id=school.id).order_by(Assessment.start_date.asc(), Assessment.id.asc()).all()

        rows = []
        for assess in assessments:
            records = FLNRecord.query.filter(
                FLNRecord.class_section_id == class_section_id,
                FLNRecord.assessment_id == assess.id,
                FLNRecord.student_id.in_(student_ids) if student_ids else False
            ).all()

            if not records:
                continue

            # Group by subject and calculate L1-L5 counts
            subjects_data = {"hindi": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, "maths": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, "english": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}
            assessed_student_set = set()
            absent_student_set = set()

            for r in records:
                sub_name = (r.subject.name if r.subject else "").lower()
                target_sub = "hindi" if "hin" in sub_name else ("maths" if ("math" in sub_name or "ganit" in sub_name) else ("english" if "eng" in sub_name else None))
                if target_sub:
                    if r.is_absent:
                        absent_student_set.add(r.student_id)
                    else:
                        assessed_student_set.add(r.student_id)
                        if r.level and 1 <= r.level <= 5:
                            subjects_data[target_sub][r.level] += 1

            total_assessed = len(assessed_student_set)
            total_absent = len(absent_student_set)

            # Build % distributions
            def compute_pcts(counts, total):
                res = {}
                for lvl in range(1, 6):
                    c = counts.get(lvl, 0)
                    pct = round((c / total * 100.0), 1) if total > 0 else 0.0
                    res[f"L{lvl}"] = {"num": c, "pct": pct}
                return res

            rows.append({
                "assessment_id": assess.id,
                "assessment_name": assess.name,
                "assessment_date": assess.start_date.strftime("%d/%m/%Y") if assess.start_date else "",
                "total_enrolled": total_enrolled,
                "total_absent": total_absent,
                "total_assessed": total_assessed,
                "hindi": compute_pcts(subjects_data["hindi"], total_assessed),
                "maths": compute_pcts(subjects_data["maths"], total_assessed),
                "english": compute_pcts(subjects_data["english"], total_assessed),
            })

        # Pad rows to 16 for clean 2-page print
        total_rows_needed = max(len(rows), 16)
        padded_rows = []
        for i in range(total_rows_needed):
            if i < len(rows):
                padded_rows.append(rows[i])
            else:
                padded_rows.append({
                    "assessment_id": None,
                    "assessment_name": "",
                    "assessment_date": "",
                    "total_enrolled": total_enrolled if i == 0 else "",
                    "total_absent": "",
                    "total_assessed": "",
                    "hindi": {f"L{lvl}": {"num": "", "pct": ""} for lvl in range(1, 6)},
                    "maths": {f"L{lvl}": {"num": "", "pct": ""} for lvl in range(1, 6)},
                    "english": {f"L{lvl}": {"num": "", "pct": ""} for lvl in range(1, 6)},
                })

        teacher = classroom.class_teacher
        return {
            "school": {
                "name": school.name if school else "MCP NITHARI NO 1 BOYS",
                "code": school.code or "20",
                "udise_id": school.udise_id or "07020102001",
                "ward_number": school.ward_number or "40",
                "zone": school.zone or "ROHINI ZONE",
                "session": active_session.session_name if active_session else "2026-27",
                "corporation_name": school.corporation_name or "MUNICIPAL CORPORATION OF DELHI",
                "department_name": school.department_name or "EDUCATION DEPARTMENT",
                "hos_name": school.principal_name or "SHAMBHU DAYAL MEENA"
            },
            "class_info": {
                "display_name": classroom.display_name,
                "class_name": classroom.class_name,
                "section_name": classroom.section_name,
                "teacher_name": teacher.full_name if teacher else "Indrajeet",
                "bmid": teacher.employee_id if teacher and teacher.employee_id else "100234",
                "contact_no": teacher.phone if teacher and teacher.phone else "9876543210"
            },
            "rows": padded_rows
        }

    @staticmethod
    def get_annexure_f3(school_id: int, class_group: str = "1_2"):
        school = db.session.get(School, school_id)
        if not school:
            raise ValueError("School not found.")

        active_session = school.active_session
        
        # Select target classes
        if class_group == "1_2":
            target_classes = ["I", "II", "1", "2", "KG", "NURSERY"]
            title_suffix = "CLASS 1 & 2"
        else:
            target_classes = ["III", "IV", "V", "3", "4", "5"]
            title_suffix = "CLASS 3 TO 5"

        classrooms = ClassSection.query.filter_by(school_id=school_id).all()
        # Filter matching classes (or all if none match specifically)
        matched_class_ids = [c.id for c in classrooms if any(tc in c.class_name.upper() for tc in target_classes)]
        if not matched_class_ids:
            matched_class_ids = [c.id for c in classrooms]

        students = Student.query.filter(Student.class_section_id.in_(matched_class_ids), Student.status == "ACTIVE").all()
        total_enrolled = len(students)
        student_ids = [s.id for s in students]

        assessments = Assessment.query.filter_by(school_id=school_id).order_by(Assessment.start_date.asc(), Assessment.id.asc()).all()

        rows = []
        for assess in assessments:
            records = FLNRecord.query.filter(
                FLNRecord.class_section_id.in_(matched_class_ids),
                FLNRecord.assessment_id == assess.id,
                FLNRecord.student_id.in_(student_ids) if student_ids else False
            ).all()

            if not records:
                continue

            subjects_data = {"hindi": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, "maths": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}, "english": {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}}
            assessed_student_set = set()
            absent_student_set = set()

            for r in records:
                sub_name = (r.subject.name if r.subject else "").lower()
                target_sub = "hindi" if "hin" in sub_name else ("maths" if ("math" in sub_name or "ganit" in sub_name) else ("english" if "eng" in sub_name else None))
                if target_sub:
                    if r.is_absent:
                        absent_student_set.add(r.student_id)
                    else:
                        assessed_student_set.add(r.student_id)
                        if r.level and 1 <= r.level <= 5:
                            subjects_data[target_sub][r.level] += 1

            total_assessed = len(assessed_student_set)
            total_absent = len(absent_student_set)

            def compute_pcts(counts, total):
                res = {}
                for lvl in range(1, 6):
                    c = counts.get(lvl, 0)
                    pct = round((c / total * 100.0), 1) if total > 0 else 0.0
                    res[f"L{lvl}"] = {"num": c, "pct": pct}
                return res

            rows.append({
                "assessment_id": assess.id,
                "assessment_name": assess.name,
                "assessment_date": assess.start_date.strftime("%d/%m/%Y") if assess.start_date else "",
                "total_enrolled": total_enrolled,
                "total_absent": total_absent,
                "total_assessed": total_assessed,
                "hindi": compute_pcts(subjects_data["hindi"], total_assessed),
                "maths": compute_pcts(subjects_data["maths"], total_assessed),
                "english": compute_pcts(subjects_data["english"], total_assessed),
            })

        total_rows_needed = max(len(rows), 16)
        padded_rows = []
        for i in range(total_rows_needed):
            if i < len(rows):
                padded_rows.append(rows[i])
            else:
                padded_rows.append({
                    "assessment_id": None,
                    "assessment_name": "",
                    "assessment_date": "",
                    "total_enrolled": total_enrolled if i == 0 else "",
                    "total_absent": "",
                    "total_assessed": "",
                    "hindi": {f"L{lvl}": {"num": "", "pct": ""} for lvl in range(1, 6)},
                    "maths": {f"L{lvl}": {"num": "", "pct": ""} for lvl in range(1, 6)},
                    "english": {f"L{lvl}": {"num": "", "pct": ""} for lvl in range(1, 6)},
                })

        return {
            "school": {
                "name": school.name if school else "MCP NITHARI NO 1 BOYS",
                "code": school.code or "20",
                "udise_id": school.udise_id or "07020102001",
                "ward_number": school.ward_number or "40",
                "zone": school.zone or "ROHINI ZONE",
                "session": active_session.session_name if active_session else "2026-27",
                "corporation_name": school.corporation_name or "MUNICIPAL CORPORATION OF DELHI",
                "department_name": school.department_name or "EDUCATION DEPARTMENT",
                "hos_name": school.principal_name or "SHAMBHU DAYAL MEENA",
                "hos_phone": school.principal_phone or "9876543210",
                "academic_co_name": school.academic_coordinator_name or "DEVENDER SINGH",
                "academic_co_phone": school.academic_coordinator_phone or "9812345678"
            },
            "title_suffix": title_suffix,
            "rows": padded_rows
        }

