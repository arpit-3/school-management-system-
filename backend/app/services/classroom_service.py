from app.extensions import db
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.class_subject_teacher import ClassSubjectTeacher
from app.models.user import User
from app.models.school import School
from app.models.academic_session import AcademicSession

class ClassroomService:
    @staticmethod
    def get_classrooms(school_id=None, session_id=None, teacher_id=None):
        query = ClassSection.query
        if school_id:
            query = query.filter_by(school_id=school_id)
        if session_id:
            query = query.filter_by(session_id=session_id)
        if teacher_id:
            query = query.filter(
                (ClassSection.class_teacher_id == teacher_id) |
                (ClassSection.id.in_(
                    db.session.query(ClassSubjectTeacher.class_section_id).filter_by(teacher_id=teacher_id)
                ))
            )
        return query.order_by(ClassSection.class_name.asc(), ClassSection.section_name.asc()).all()

    @staticmethod
    def get_classroom_by_id(class_id: int):
        return db.session.get(ClassSection, class_id)

    @staticmethod
    def create_classroom(data: dict):
        school_id = data.get("school_id")
        if not school_id:
            primary_school = School.query.filter_by(is_active=True).first()
            school_id = primary_school.id if primary_school else 1

        session_id = data.get("session_id")
        if not session_id:
            active_session = AcademicSession.query.filter_by(school_id=school_id, is_active=True).first()
            session_id = active_session.id if active_session else 1

        class_name = data["class_name"].strip().upper()
        section_name = data["section_name"].strip().upper()

        existing = ClassSection.query.filter_by(
            school_id=school_id,
            session_id=session_id,
            class_name=class_name,
            section_name=section_name
        ).first()
        if existing:
            raise ValueError(f"Class {class_name}-{section_name} already exists for this session.")

        display_name = data.get("display_name") or f"Class {class_name}-{section_name}"

        classroom = ClassSection(
            school_id=school_id,
            session_id=session_id,
            class_name=class_name,
            section_name=section_name,
            display_name=display_name,
            category=data.get("category", "BOYS"),
            room_number=data.get("room_number"),
            max_capacity=int(data.get("max_capacity", 45)),
            class_teacher_id=data.get("class_teacher_id"),
            total_students=data.get("total_students", 0),
            is_active=data.get("is_active", True)
        )
        db.session.add(classroom)
        db.session.commit()
        return classroom

    @staticmethod
    def update_classroom(class_id: int, data: dict):
        classroom = db.session.get(ClassSection, class_id)
        if not classroom:
            return None

        if "class_teacher_id" in data:
            teacher_id = data["class_teacher_id"]
            if teacher_id is not None:
                teacher = db.session.get(User, teacher_id)
                if not teacher:
                    raise ValueError("Teacher not found.")
            classroom.class_teacher_id = teacher_id

        for field in ["display_name", "category", "room_number", "max_capacity", "total_students", "is_active"]:
            if field in data:
                setattr(classroom, field, data[field])

        db.session.commit()
        return classroom

    @staticmethod
    def delete_classroom(class_id: int):
        classroom = db.session.get(ClassSection, class_id)
        if not classroom:
            return False
        db.session.delete(classroom)
        db.session.commit()
        return True

    # Subjects
    @staticmethod
    def get_subjects(school_id: int, is_fln_only: bool = False):
        query = Subject.query.filter_by(school_id=school_id, is_active=True)
        if is_fln_only:
            query = query.filter_by(is_fln_subject=True)
        return query.order_by(Subject.name.asc()).all()

    @staticmethod
    def get_subject_by_id(subject_id: int):
        return db.session.get(Subject, subject_id)

    @staticmethod
    def create_subject(data: dict):
        school_id = data.get("school_id")
        if not school_id:
            primary_school = School.query.filter_by(is_active=True).first()
            school_id = primary_school.id if primary_school else 1

        name = data["name"].strip().upper()
        code = data["code"].strip().upper()

        existing = Subject.query.filter_by(school_id=school_id, code=code).first()
        if existing:
            raise ValueError(f"Subject with code '{code}' already exists.")

        subject = Subject(
            school_id=school_id,
            name=name,
            code=code,
            is_fln_subject=data.get("is_fln_subject", False),
            total_max_marks=data.get("total_max_marks", 100),
            is_active=data.get("is_active", True)
        )
        db.session.add(subject)
        db.session.commit()
        return subject

    @staticmethod
    def update_subject(subject_id: int, data: dict):
        subject = db.session.get(Subject, subject_id)
        if not subject:
            return None

        for field in ["name", "code", "is_fln_subject", "total_max_marks", "is_active"]:
            if field in data:
                setattr(subject, field, data[field])

        db.session.commit()
        return subject

    @staticmethod
    def delete_subject(subject_id: int):
        subject = db.session.get(Subject, subject_id)
        if not subject:
            return False
        db.session.delete(subject)
        db.session.commit()
        return True

    # Allocations
    @staticmethod
    def get_class_allocations(class_section_id: int):
        return ClassSubjectTeacher.query.filter_by(class_section_id=class_section_id).all()

    @staticmethod
    def allocate_subject_teacher(data: dict):
        class_section_id = data["class_section_id"]
        subject_id = data["subject_id"]
        teacher_id = data["teacher_id"]

        existing = ClassSubjectTeacher.query.filter_by(
            class_section_id=class_section_id,
            subject_id=subject_id
        ).first()

        if existing:
            existing.teacher_id = teacher_id
            db.session.commit()
            return existing

        allocation = ClassSubjectTeacher(
            class_section_id=class_section_id,
            subject_id=subject_id,
            teacher_id=teacher_id
        )
        db.session.add(allocation)
        db.session.commit()
        return allocation

    @staticmethod
    def remove_allocation(allocation_id: int):
        allocation = db.session.get(ClassSubjectTeacher, allocation_id)
        if not allocation:
            return False
        db.session.delete(allocation)
        db.session.commit()
        return True
