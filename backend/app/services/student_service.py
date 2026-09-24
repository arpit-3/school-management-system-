import datetime
from app.extensions import db
from app.models.student import Student
from app.models.classroom import ClassSection
from app.utils.student_importer import parse_students_from_excel, parse_student_date

class StudentService:
    @staticmethod
    def get_students(
        class_section_id=None,
        school_id=None,
        search=None,
        category=None,
        status="ACTIVE",
        page=1,
        per_page=50
    ):
        query = Student.query
        if school_id:
            query = query.filter(Student.school_id == school_id)
        if class_section_id:
            query = query.filter(Student.class_section_id == class_section_id)
        if category:
            query = query.filter(Student.category == category.upper())
        if status:
            query = query.filter(Student.status == status.upper())

        if search:
            s_term = f"%{search.strip()}%"
            query = query.filter(
                (Student.name.ilike(s_term)) |
                (Student.student_id.ilike(s_term)) |
                (Student.admission_no.ilike(s_term)) |
                (Student.father_name.ilike(s_term))
            )

        query = query.order_by(Student.roll_no.asc(), Student.name.asc())
        pagination = query.paginate(page=page, per_page=per_page, error_out=False)
        return pagination

    @staticmethod
    def get_student_by_id(student_id: int):
        return db.session.get(Student, student_id)

    @staticmethod
    def create_student(data: dict):
        class_section_id = data["class_section_id"]
        roll_no = int(data["roll_no"])

        existing_roll = Student.query.filter_by(class_section_id=class_section_id, roll_no=roll_no).first()
        if existing_roll:
            raise ValueError(f"Roll No. {roll_no} is already assigned to {existing_roll.name} in this class.")

        dob = parse_student_date(data.get("dob"))

        student = Student(
            school_id=data["school_id"],
            class_section_id=class_section_id,
            roll_no=roll_no,
            student_id=data.get("student_id"),
            admission_no=data.get("admission_no"),
            name=data["name"].strip().upper(),
            dob=dob,
            gender=data.get("gender", "BOY").upper(),
            category=data.get("category", "GEN").upper(),
            father_name=data.get("father_name", "").strip().upper() or None,
            mother_name=data.get("mother_name", "").strip().upper() or None,
            contact_no=data.get("contact_no"),
            address=data.get("address"),
            aadhar_no=data.get("aadhar_no"),
            cwsn_status=data.get("cwsn_status", "NO").upper(),
            blood_group=data.get("blood_group"),
            bank_name=data.get("bank_name"),
            bank_account_no=data.get("bank_account_no"),
            ifsc_code=data.get("ifsc_code"),
            bank_branch=data.get("bank_branch"),
            account_holder_name=data.get("account_holder_name"),
            status=data.get("status", "ACTIVE")
        )
        db.session.add(student)
        
        # Update class total_students
        classroom = db.session.get(ClassSection, class_section_id)
        if classroom:
            classroom.total_students = Student.query.filter_by(class_section_id=class_section_id, status="ACTIVE").count() + 1
            
        db.session.commit()
        return student

    @staticmethod
    def update_student(student_id: int, data: dict):
        student = db.session.get(Student, student_id)
        if not student:
            return None

        if "roll_no" in data and data["roll_no"] is not None:
            new_roll = int(data["roll_no"])
            if new_roll != student.roll_no:
                existing = Student.query.filter_by(
                    class_section_id=student.class_section_id,
                    roll_no=new_roll
                ).first()
                if existing and existing.id != student.id:
                    raise ValueError(f"Roll No. {new_roll} is already assigned to {existing.name}.")
                student.roll_no = new_roll

        if "dob" in data:
            student.dob = parse_student_date(data["dob"])

        for field in [
            "name", "student_id", "admission_no", "gender", "category",
            "father_name", "mother_name", "contact_no", "address",
            "aadhar_no", "cwsn_status", "blood_group", "bank_name",
            "bank_account_no", "ifsc_code", "bank_branch", "account_holder_name",
            "status", "photo_url"
        ]:
            if field in data:
                val = data[field]
                if isinstance(val, str) and field in ["name", "father_name", "mother_name", "category", "gender", "status", "ifsc_code"]:
                    val = val.strip().upper()
                setattr(student, field, val)

        db.session.commit()
        return student

    @staticmethod
    def delete_student(student_id: int):
        from app.models.mark import StudentMark
        from app.models.fln_record import FLNRecord
        from app.models.attendance import StudentAttendance
        from app.models.student_test_copy import StudentTestCopy

        student = db.session.get(Student, student_id)
        if not student:
            return False
        class_id = student.class_section_id

        # Cascade delete dependent records
        StudentMark.query.filter_by(student_id=student_id).delete()
        FLNRecord.query.filter_by(student_id=student_id).delete()
        StudentAttendance.query.filter_by(student_id=student_id).delete()
        StudentTestCopy.query.filter_by(student_id=student_id).delete()

        db.session.delete(student)
        db.session.flush()

        classroom = db.session.get(ClassSection, class_id)
        if classroom:
            classroom.total_students = Student.query.filter_by(class_section_id=class_id, status="ACTIVE").count()
            
        db.session.commit()
        return True

    @staticmethod
    def import_students(file_source, school_id: int, class_section_id: int):
        records = parse_students_from_excel(file_source, school_id, class_section_id)
        imported_count = 0
        updated_count = 0

        for r in records:
            existing = Student.query.filter_by(
                class_section_id=class_section_id,
                roll_no=r["roll_no"]
            ).first()

            if existing:
                for k, v in r.items():
                    setattr(existing, k, v)
                updated_count += 1
            else:
                student = Student(**r)
                db.session.add(student)
                imported_count += 1

        classroom = db.session.get(ClassSection, class_section_id)
        if classroom:
            classroom.total_students = len(records)

        db.session.commit()
        return {"imported": imported_count, "updated": updated_count, "total": len(records)}

    @staticmethod
    def get_stats(school_id=None, class_section_id=None):
        query = Student.query
        if school_id:
            query = query.filter_by(school_id=school_id)
        if class_section_id:
            query = query.filter_by(class_section_id=class_section_id)

        all_students = query.all()
        total = len(all_students)
        active = sum(1 for s in all_students if s.status == "ACTIVE")
        boys = sum(1 for s in all_students if s.gender in ["BOY", "MALE"])
        girls = sum(1 for s in all_students if s.gender in ["GIRL", "FEMALE"])

        categories = {}
        for s in all_students:
            cat = s.category or "GEN"
            categories[cat] = categories.get(cat, 0) + 1

        return {
            "total": total,
            "active": active,
            "boys": boys,
            "girls": girls,
            "categories": categories
        }
