import datetime
import enum
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class AssessmentTypeEnum(str, enum.Enum):
    PERIODIC = "PERIODIC"     # PA-1 to PA-4
    TERM = "TERM"             # Mid-Term (Half-Yearly) & Final Exam (Annual)
    INTERNAL = "INTERNAL"     # Portfolio, Subject Enrichment, Multiple Assessment
    FLN = "FLN"               # FLN Mission Buniyad Rounds (Levels 1 to 5)

class Assessment(db.Model):
    __tablename__ = "assessments"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey("academic_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = db.Column(db.String(150), nullable=False) # e.g. "Periodic Assessment 1", "Final Examination"
    code = db.Column(db.String(50), nullable=False)  # e.g. "PA1", "PA2", "MID_TERM", "FINAL_EXAM", "FLN_ROUND_1"
    
    assessment_type = db.Column(db.Enum(AssessmentTypeEnum), nullable=False, index=True)
    term = db.Column(db.Integer, default=1, nullable=False) # Term 1 or Term 2
    
    max_marks = db.Column(db.Float, default=20.0, nullable=False) # 20 for PA, 50 for Term, 5 for Internal, 0 for FLN
    weightage = db.Column(db.Float, default=10.0, nullable=False) # Weightage percentage
    
    start_date = db.Column(db.Date, nullable=True)
    end_date = db.Column(db.Date, nullable=True)
    
    round_number = db.Column(db.Integer, nullable=True) # 1 to 25 for FLN evaluation rounds
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    is_locked = db.Column(db.Boolean, default=False, nullable=False) # Locked once finalized
    
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    school = db.relationship("School", backref="assessments")
    session = db.relationship("AcademicSession", backref="assessments")

    __table_args__ = (
        db.UniqueConstraint("school_id", "session_id", "code", name="uq_school_session_assessment_code"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "school_id": self.school_id,
            "session_id": self.session_id,
            "session_name": self.session.session_name if self.session else None,
            "name": self.name,
            "code": self.code,
            "assessment_type": self.assessment_type.value if hasattr(self.assessment_type, "value") else self.assessment_type,
            "term": self.term,
            "max_marks": self.max_marks,
            "weightage": self.weightage,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "round_number": self.round_number,
            "is_active": self.is_active,
            "is_locked": self.is_locked,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Assessment id={self.id} code='{self.code}' name='{self.name}'>"
