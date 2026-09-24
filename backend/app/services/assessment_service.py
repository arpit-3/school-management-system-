import datetime
from app.extensions import db
from app.models.assessment import Assessment, AssessmentTypeEnum
from app.utils.student_importer import parse_student_date

class AssessmentService:
    @staticmethod
    def get_assessments(school_id=None, session_id=None, assessment_type=None, term=None):
        query = Assessment.query
        if school_id:
            query = query.filter_by(school_id=school_id)
        if session_id:
            query = query.filter_by(session_id=session_id)
        if assessment_type:
            query = query.filter_by(assessment_type=assessment_type.upper())
        if term:
            query = query.filter_by(term=term)

        return query.order_by(Assessment.term.asc(), Assessment.start_date.asc(), Assessment.id.asc()).all()

    @staticmethod
    def get_assessment_by_id(assessment_id: int):
        return db.session.get(Assessment, assessment_id)

    @staticmethod
    def create_assessment(data: dict):
        school_id = data["school_id"]
        session_id = data["session_id"]
        code = data["code"].strip().upper()

        existing = Assessment.query.filter_by(
            school_id=school_id,
            session_id=session_id,
            code=code
        ).first()
        if existing:
            raise ValueError(f"Assessment with code '{code}' already exists for this session.")

        assessment = Assessment(
            school_id=school_id,
            session_id=session_id,
            name=data["name"].strip(),
            code=code,
            assessment_type=AssessmentTypeEnum(data["assessment_type"].upper()),
            term=int(data.get("term", 1)),
            max_marks=float(data.get("max_marks", 20.0)),
            weightage=float(data.get("weightage", 10.0)),
            start_date=parse_student_date(data.get("start_date")),
            end_date=parse_student_date(data.get("end_date")),
            round_number=int(data["round_number"]) if data.get("round_number") else None,
            is_active=data.get("is_active", True),
            is_locked=data.get("is_locked", False)
        )
        db.session.add(assessment)
        db.session.commit()
        return assessment

    @staticmethod
    def update_assessment(assessment_id: int, data: dict):
        assessment = db.session.get(Assessment, assessment_id)
        if not assessment:
            return None

        if "start_date" in data:
            assessment.start_date = parse_student_date(data["start_date"])
        if "end_date" in data:
            assessment.end_date = parse_student_date(data["end_date"])

        for field in ["name", "term", "max_marks", "weightage", "is_active", "is_locked"]:
            if field in data:
                setattr(assessment, field, data[field])

        db.session.commit()
        return assessment

    @staticmethod
    def delete_assessment(assessment_id: int):
        assessment = db.session.get(Assessment, assessment_id)
        if not assessment:
            return False
        db.session.delete(assessment)
        db.session.commit()
        return True

    @staticmethod
    def seed_default_assessments(school_id: int, session_id: int):
        """
        Seeds standard Periodic Assessments, Term Exams, and FLN evaluation rounds
        matching the workbook's DATEWISE and PASHEET structures.
        """
        defaults = [
            # Periodic Assessments (Max 20 marks each)
            {"name": "Periodic Assessment 1 (PA-1)", "code": "PA1", "type": "PERIODIC", "term": 1, "max_marks": 20.0, "weightage": 10.0, "start_date": "2026-07-15", "end_date": "2026-07-22"},
            {"name": "Periodic Assessment 2 (PA-2)", "code": "PA2", "type": "PERIODIC", "term": 1, "max_marks": 20.0, "weightage": 10.0, "start_date": "2026-09-01", "end_date": "2026-09-08"},
            {"name": "Periodic Assessment 3 (PA-3)", "code": "PA3", "type": "PERIODIC", "term": 2, "max_marks": 20.0, "weightage": 10.0, "start_date": "2026-12-05", "end_date": "2026-12-12"},
            {"name": "Periodic Assessment 4 (PA-4)", "code": "PA4", "type": "PERIODIC", "term": 2, "max_marks": 20.0, "weightage": 10.0, "start_date": "2027-02-05", "end_date": "2027-02-12"},
            
            # Term Examinations (Max 50 marks each)
            {"name": "Mid-Term Examination (Half Yearly)", "code": "MID_TERM", "type": "TERM", "term": 1, "max_marks": 50.0, "weightage": 40.0, "start_date": "2026-09-20", "end_date": "2026-09-30"},
            {"name": "Final Examination (Annual)", "code": "FINAL_EXAM", "type": "TERM", "term": 2, "max_marks": 50.0, "weightage": 50.0, "start_date": "2027-03-01", "end_date": "2027-03-15"},
            
            # Internal Assessments (Max 5 marks each from MARKS sheet)
            {"name": "Multiple Assessment", "code": "MULTIPLE_ASSESS", "type": "INTERNAL", "term": 1, "max_marks": 5.0, "weightage": 5.0},
            {"name": "Portfolio Submission", "code": "PORTFOLIO", "type": "INTERNAL", "term": 1, "max_marks": 5.0, "weightage": 5.0},
            {"name": "Subject Enrichment", "code": "SUB_ENRICHMENT", "type": "INTERNAL", "term": 1, "max_marks": 5.0, "weightage": 5.0},
            
            # FLN Mission Buniyad Baseline & Periodic Rounds (from DATEWISE sheet)
            {"name": "FLN Baseline Assessment", "code": "FLN_BASELINE", "type": "FLN", "term": 1, "max_marks": 5.0, "weightage": 0.0, "round_number": 1, "start_date": "2026-04-15"},
            {"name": "FLN Round 2 Assessment", "code": "FLN_ROUND_2", "type": "FLN", "term": 1, "max_marks": 5.0, "weightage": 0.0, "round_number": 2, "start_date": "2026-05-02"},
            {"name": "FLN Round 3 Assessment", "code": "FLN_ROUND_3", "type": "FLN", "term": 1, "max_marks": 5.0, "weightage": 0.0, "round_number": 3, "start_date": "2026-07-10"},
            {"name": "FLN Round 4 Assessment", "code": "FLN_ROUND_4", "type": "FLN", "term": 1, "max_marks": 5.0, "weightage": 0.0, "round_number": 4, "start_date": "2026-08-05"},
            {"name": "FLN Mid-Term Round", "code": "FLN_MID_TERM", "type": "FLN", "term": 1, "max_marks": 5.0, "weightage": 0.0, "round_number": 10, "start_date": "2026-09-25"},
            {"name": "FLN Endline Assessment", "code": "FLN_ENDLINE", "type": "FLN", "term": 2, "max_marks": 5.0, "weightage": 0.0, "round_number": 25, "start_date": "2027-03-10"}
        ]

        created = 0
        for a in defaults:
            existing = Assessment.query.filter_by(school_id=school_id, session_id=session_id, code=a["code"]).first()
            if not existing:
                item = Assessment(
                    school_id=school_id,
                    session_id=session_id,
                    name=a["name"],
                    code=a["code"],
                    assessment_type=AssessmentTypeEnum(a["type"]),
                    term=a["term"],
                    max_marks=a["max_marks"],
                    weightage=a["weightage"],
                    start_date=parse_student_date(a.get("start_date")),
                    end_date=parse_student_date(a.get("end_date")),
                    round_number=a.get("round_number"),
                    is_active=True
                )
                db.session.add(item)
                created += 1

        db.session.commit()
        return created
