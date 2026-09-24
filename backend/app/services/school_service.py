import datetime
from app.extensions import db
from app.models.school import School
from app.models.academic_session import AcademicSession

class SchoolService:
    @staticmethod
    def get_all_schools(search=None, is_active=None):
        query = School.query
        if is_active is not None:
            query = query.filter_by(is_active=is_active)
        if search:
            search_term = f"%{search.strip()}%"
            query = query.filter(
                (School.name.ilike(search_term)) |
                (School.code.ilike(search_term)) |
                (School.zone.ilike(search_term)) |
                (School.principal_name.ilike(search_term))
            )
        return query.order_by(School.name.asc()).all()

    @staticmethod
    def get_school_by_id(school_id: int):
        return db.session.get(School, school_id)

    @staticmethod
    def create_school(data: dict):
        code = data.get("code", "").strip() or None
        udise_id = data.get("udise_id", "").strip() or None

        if code and School.query.filter_by(code=code).first():
            raise ValueError(f"School code '{code}' already exists.")

        if udise_id and School.query.filter_by(udise_id=udise_id).first():
            raise ValueError(f"School U-DISE ID '{udise_id}' already exists.")

        school = School(
            name=data["name"].strip(),
            code=code,
            udise_id=udise_id,
            corporation_name=data.get("corporation_name", "MUNICIPAL CORPORATION OF DELHI"),
            corporation_short_name=data.get("corporation_short_name", "MCD"),
            department_name=data.get("department_name", "EDUCATION DEPARTMENT"),
            zone=data.get("zone", "ROHINI ZONE"),
            ward_number=data.get("ward_number", "40"),
            state=data.get("state", "NEW DELHI"),
            address=data.get("address"),
            principal_name=data.get("principal_name"),
            principal_phone=data.get("principal_phone"),
            mentor_name=data.get("mentor_name"),
            school_inspector_name=data.get("school_inspector_name"),
            academic_coordinator_name=data.get("academic_coordinator_name"),
            academic_coordinator_phone=data.get("academic_coordinator_phone"),
            total_school_students=data.get("total_school_students", 0),
            is_active=data.get("is_active", True)
        )
        db.session.add(school)
        db.session.commit()

        # If session_name was provided in payload, create initial active session
        if data.get("session_name"):
            session = AcademicSession(
                school_id=school.id,
                session_name=data["session_name"].strip(),
                is_active=True
            )
            db.session.add(session)
            db.session.commit()

        return school

    @staticmethod
    def update_school(school_id: int, data: dict):
        school = db.session.get(School, school_id)
        if not school:
            return None

        # Check unique code if updated
        if "code" in data:
            new_code = data["code"].strip() or None
            if new_code and new_code != school.code:
                if School.query.filter_by(code=new_code).first():
                    raise ValueError(f"School code '{new_code}' is already taken.")
            school.code = new_code

        # Check unique udise_id if updated
        if "udise_id" in data:
            new_udise = data["udise_id"].strip() or None
            if new_udise and new_udise != school.udise_id:
                if School.query.filter_by(udise_id=new_udise).first():
                    raise ValueError(f"School U-DISE ID '{new_udise}' is already taken.")
            school.udise_id = new_udise

        for field in [
            "name", "corporation_name", "corporation_short_name", "department_name",
            "zone", "ward_number", "state", "address", "principal_name", "principal_phone",
            "mentor_name", "school_inspector_name", "academic_coordinator_name",
            "academic_coordinator_phone", "total_school_students", "is_active"
        ]:
            if field in data:
                setattr(school, field, data[field])

        db.session.commit()
        return school

    @staticmethod
    def delete_school(school_id: int):
        school = db.session.get(School, school_id)
        if not school:
            return False
        db.session.delete(school)
        db.session.commit()
        return True

    @staticmethod
    def add_session(school_id: int, data: dict):
        school = db.session.get(School, school_id)
        if not school:
            return None

        session_name = data["session_name"].strip()
        existing = AcademicSession.query.filter_by(school_id=school_id, session_name=session_name).first()
        if existing:
            raise ValueError(f"Academic session '{session_name}' already exists for this school.")

        # If marked active, deactivate other sessions
        is_active = data.get("is_active", True)
        if is_active:
            AcademicSession.query.filter_by(school_id=school_id).update({"is_active": False})

        def parse_date(d_str):
            if not d_str:
                return None
            try:
                return datetime.date.fromisoformat(d_str)
            except Exception:
                return None

        session = AcademicSession(
            school_id=school_id,
            session_name=session_name,
            start_date=parse_date(data.get("start_date")),
            end_date=parse_date(data.get("end_date")),
            result_date=parse_date(data.get("result_date")),
            working_days_term1=data.get("working_days_term1", 0),
            working_days_annual=data.get("working_days_annual", 0),
            is_active=is_active
        )
        db.session.add(session)
        db.session.commit()
        return session

    @staticmethod
    def activate_session(school_id: int, session_id: int):
        session = db.session.get(AcademicSession, session_id)
        if not session or session.school_id != school_id:
            return None

        AcademicSession.query.filter_by(school_id=school_id).update({"is_active": False})
        session.is_active = True
        db.session.commit()
        return session
