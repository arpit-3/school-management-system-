import os
import openpyxl
import datetime
from app.extensions import db
from app.models.student import Student
from app.models.classroom import ClassSection
from app.models.attendance import StudentAttendance

MONTH_CATALOG = [
    # Term 1 Academic Months
    {"code": "APR", "label": "April", "term": 1, "default_days": 22.0, "is_month": True},
    {"code": "MAY", "label": "May", "term": 1, "default_days": 10.0, "is_month": True},
    {"code": "JUL", "label": "July", "term": 1, "default_days": 24.0, "is_month": True},
    {"code": "AUG", "label": "August", "term": 1, "default_days": 23.0, "is_month": True},
    {"code": "SEP", "label": "September", "term": 1, "default_days": 22.0, "is_month": True},
    {"code": "TERM_1", "label": "Term 1 (Cumulative)", "term": 1, "default_days": 110.0, "is_month": False},
    # Term 2 Academic Months
    {"code": "OCT", "label": "October", "term": 2, "default_days": 20.0, "is_month": True},
    {"code": "NOV", "label": "November", "term": 2, "default_days": 22.0, "is_month": True},
    {"code": "DEC", "label": "December", "term": 2, "default_days": 21.0, "is_month": True},
    {"code": "JAN", "label": "January", "term": 2, "default_days": 20.0, "is_month": True},
    {"code": "FEB", "label": "February", "term": 2, "default_days": 22.0, "is_month": True},
    {"code": "MAR", "label": "March", "term": 2, "default_days": 23.0, "is_month": True},
    {"code": "TERM_2", "label": "Term 2 (Cumulative)", "term": 2, "default_days": 110.0, "is_month": False},
    # Full Academic Year
    {"code": "ANNUAL", "label": "Annual (Cumulative)", "term": 0, "default_days": 220.0, "is_month": False},
]

MONTH_MAP = {m["code"]: m for m in MONTH_CATALOG}

class AttendanceService:
    @staticmethod
    def get_month_catalog():
        return MONTH_CATALOG

    @staticmethod
    def get_default_working_days(month: str, term: int = 1) -> float:
        m_info = MONTH_MAP.get(month.upper())
        if m_info:
            return m_info["default_days"]
        if term in [1, 2]:
            return 110.0
        return 220.0

    @staticmethod
    def get_attendance_sheet(class_section_id: int, term: int = 1, month: str = "TERM_1"):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        m_code = month.upper()
        m_info = MONTH_MAP.get(m_code, {"code": m_code, "label": m_code, "term": term, "default_days": 110.0})
        effective_term = m_info["term"] if "term" in m_info else term

        students = Student.query.filter_by(
            class_section_id=class_section_id,
            status="ACTIVE"
        ).order_by(Student.roll_no.asc()).all()

        records = StudentAttendance.query.filter_by(
            class_section_id=class_section_id,
            term=effective_term,
            month=m_code
        ).all()

        rec_map = {r.student_id: r for r in records}

        # Check if there is an existing customized working days in the records
        saved_working_days = None
        for r in records:
            if r.working_days and r.working_days > 0:
                saved_working_days = r.working_days
                break

        default_working_days = saved_working_days if saved_working_days is not None else m_info.get("default_days", 110.0)

        rows = []
        percentages = []
        low_count = 0
        high_count = 0
        total_present = 0.0
        total_working = 0.0

        for st in students:
            rec = rec_map.get(st.id)
            working_days = rec.working_days if rec else default_working_days
            present_days = rec.present_days if rec else 0.0
            absent_days = rec.absent_days if rec else max(0.0, working_days - present_days)
            pct = rec.percentage if rec else (round((present_days / working_days) * 100.0, 1) if working_days > 0 else 0.0)
            is_low = rec.is_low_attendance if rec else (pct < 75.0)

            if rec and rec.present_days > 0:
                percentages.append(pct)
                if is_low:
                    low_count += 1
                if pct >= 85.0:
                    high_count += 1
                total_present += present_days
                total_working += working_days

            rows.append({
                "student_id": st.id,
                "roll_no": st.roll_no,
                "name": st.name,
                "admission_no": st.admission_no,
                "attendance_id": rec.id if rec else None,
                "working_days": working_days,
                "present_days": present_days,
                "absent_days": absent_days,
                "percentage": pct,
                "is_low_attendance": is_low,
                "remarks": rec.remarks if rec else None
            })

        avg_pct = round(sum(percentages) / len(percentages), 1) if percentages else 0.0

        return {
            "classroom": classroom.to_dict(),
            "term": effective_term,
            "month": m_code,
            "month_label": m_info.get("label", m_code),
            "default_working_days": default_working_days,
            "month_catalog": MONTH_CATALOG,
            "stats": {
                "total_students": len(students),
                "recorded_count": len(percentages),
                "average_percentage": avg_pct,
                "low_attendance_count": low_count,
                "excellent_attendance_count": high_count,
                "total_present_days": round(total_present, 1),
                "total_working_days": round(total_working, 1)
            },
            "rows": rows
        }

    @staticmethod
    def get_monthly_matrix(class_section_id: int):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        students = Student.query.filter_by(
            class_section_id=class_section_id,
            status="ACTIVE"
        ).order_by(Student.roll_no.asc()).all()

        records = StudentAttendance.query.filter_by(
            class_section_id=class_section_id
        ).all()

        # Group by student_id and month
        matrix_map = {}
        for r in records:
            if r.student_id not in matrix_map:
                matrix_map[r.student_id] = {}
            matrix_map[r.student_id][r.month] = {
                "working_days": r.working_days,
                "present_days": r.present_days,
                "absent_days": r.absent_days,
                "percentage": r.percentage,
                "is_low": r.is_low_attendance
            }

        month_cols = [m for m in MONTH_CATALOG if m["is_month"]]

        rows = []
        for st in students:
            st_data = matrix_map.get(st.id, {})
            months_dict = {}
            total_present = 0.0
            total_working = 0.0

            for m in month_cols:
                rec = st_data.get(m["code"])
                if rec:
                    months_dict[m["code"]] = rec
                    total_present += rec["present_days"]
                    total_working += rec["working_days"]
                else:
                    months_dict[m["code"]] = {
                        "working_days": m["default_days"],
                        "present_days": 0.0,
                        "absent_days": m["default_days"],
                        "percentage": 0.0,
                        "is_low": True
                    }

            # Check for cumulative Term 1, Term 2, Annual if stored directly
            t1_rec = st_data.get("TERM_1")
            t2_rec = st_data.get("TERM_2")
            ann_rec = st_data.get("ANNUAL")

            cumulative_working = ann_rec["working_days"] if ann_rec else (total_working if total_working > 0 else 220.0)
            cumulative_present = ann_rec["present_days"] if ann_rec else total_present
            cumulative_pct = round((cumulative_present / cumulative_working) * 100.0, 1) if cumulative_working > 0 else 0.0

            rows.append({
                "student_id": st.id,
                "roll_no": st.roll_no,
                "name": st.name,
                "admission_no": st.admission_no,
                "months": months_dict,
                "term_1": t1_rec,
                "term_2": t2_rec,
                "annual": ann_rec,
                "cumulative_working_days": cumulative_working,
                "cumulative_present_days": cumulative_present,
                "cumulative_percentage": cumulative_pct,
                "is_low_attendance": cumulative_pct < 75.0
            })

        return {
            "classroom": classroom.to_dict(),
            "month_columns": month_cols,
            "total_students": len(students),
            "rows": rows
        }

    @staticmethod
    def save_single_attendance(data: dict):
        student_id = data["student_id"]
        student = db.session.get(Student, student_id)
        if not student:
            raise ValueError("Student not found.")

        month = str(data.get("month", "TERM_1")).upper()
        m_info = MONTH_MAP.get(month, {"term": int(data.get("term", 1)), "default_days": 110.0})
        term = m_info.get("term", int(data.get("term", 1)))

        working_days = float(data.get("working_days", m_info.get("default_days", 110.0)))
        present_days = float(data.get("present_days", 0.0))

        if present_days > working_days:
            raise ValueError(f"Present days ({present_days}) cannot exceed working days ({working_days}).")
        if present_days < 0 or working_days < 0:
            raise ValueError("Days cannot be negative.")

        rec = StudentAttendance.query.filter_by(
            student_id=student_id,
            session_id=student.classroom.session_id if student.classroom else 1,
            term=term,
            month=month
        ).first()

        if rec:
            rec.working_days = working_days
            rec.present_days = present_days
            rec.remarks = data.get("remarks", rec.remarks)
            rec.calculate_metrics()
        else:
            rec = StudentAttendance(
                school_id=student.school_id,
                session_id=student.classroom.session_id if student.classroom else 1,
                class_section_id=student.class_section_id,
                student_id=student_id,
                term=term,
                month=month,
                working_days=working_days,
                present_days=present_days,
                remarks=data.get("remarks")
            )
            rec.calculate_metrics()
            db.session.add(rec)

        db.session.commit()
        return rec

    @staticmethod
    def bulk_save_attendance(class_section_id: int, term: int, month: str, working_days: float, entries: list):
        m_code = month.upper()
        m_info = MONTH_MAP.get(m_code, {"term": term, "default_days": working_days})
        effective_term = m_info.get("term", term)

        saved = 0
        for entry in entries:
            student_id = entry.get("student_id")
            if not student_id:
                continue

            entry_working = float(entry.get("working_days", working_days))
            entry_present = float(entry.get("present_days", 0.0))

            # Auto cap present days if slight mismatch
            if entry_present > entry_working:
                entry_working = max(entry_working, entry_present)

            AttendanceService.save_single_attendance({
                "student_id": student_id,
                "term": effective_term,
                "month": m_code,
                "working_days": entry_working,
                "present_days": entry_present,
                "remarks": entry.get("remarks")
            })
            saved += 1

        return saved

    @staticmethod
    def update_month_working_days(class_section_id: int, month: str, working_days: float):
        if working_days <= 0:
            raise ValueError("Working days must be greater than zero.")

        m_code = month.upper()
        m_info = MONTH_MAP.get(m_code, {"term": 1, "default_days": working_days})
        effective_term = m_info.get("term", 1)

        records = StudentAttendance.query.filter_by(
            class_section_id=class_section_id,
            term=effective_term,
            month=m_code
        ).all()

        updated = 0
        for r in records:
            r.working_days = working_days
            r.calculate_metrics()
            updated += 1

        db.session.commit()
        return updated

    @staticmethod
    def seed_attendance_from_workbook(class_section_id: int):
        """
        Seeds Term 1 and Term 2 attendance from PASHEET of FLN III-A 2026-27 (1).xlsx.
        """
        template_path = r"A:\fln xml system\templates_storage\FLN_TEMPLATE.xlsx"
        if not os.path.exists(template_path):
            template_path = r"A:\fln xml system\FLN III-A 2026-27 (1).xlsx"

        if not os.path.exists(template_path):
            raise FileNotFoundError("Workbook template not found.")

        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        wb = openpyxl.load_workbook(template_path, read_only=True, data_only=True)
        if "PASHEET" not in wb.sheetnames:
            wb.close()
            raise ValueError("PASHEET sheet not found.")

        ws = wb["PASHEET"]
        saved = 0

        # Row 3 onwards:
        # Col 0: Roll No
        # Col 85: SEP (Term 1 Present Days)
        # Col 86: MAR (Term 2 / Cumulative Present Days)
        # Col 87: TOTAL (Working Days)
        for row in ws.iter_rows(values_only=True):
            if not row or row[0] is None or not str(row[0]).strip().isdigit():
                continue

            roll_no = int(row[0])
            st = Student.query.filter_by(class_section_id=class_section_id, roll_no=roll_no).first()
            if not st:
                continue

            # Term 1 Attendance (Default 110 working days)
            if len(row) > 85 and row[85] is not None:
                try:
                    present_t1 = float(row[85])
                    w_days_t1 = 180.0 if present_t1 > 110.0 else 110.0
                    present_t1 = min(present_t1, w_days_t1)
                    AttendanceService.save_single_attendance({
                        "student_id": st.id,
                        "term": 1,
                        "month": "TERM_1",
                        "working_days": w_days_t1,
                        "present_days": present_t1
                    })
                    saved += 1
                except (ValueError, TypeError):
                    pass

            # Annual / Cumulative Attendance (Col 86 Present, Col 87 Working)
            if len(row) > 86 and row[86] is not None:
                try:
                    present_ann = float(row[86])
                    total_work = float(row[87]) if len(row) > 87 and row[87] is not None else 417.0
                    total_work = max(total_work, present_ann)
                    AttendanceService.save_single_attendance({
                        "student_id": st.id,
                        "term": 0,
                        "month": "ANNUAL",
                        "working_days": total_work,
                        "present_days": present_ann
                    })
                    saved += 1
                except (ValueError, TypeError):
                    pass

        wb.close()
        return saved
