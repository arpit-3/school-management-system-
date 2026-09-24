import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Subject(db.Model):
    __tablename__ = "subjects"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    
    name = db.Column(db.String(100), nullable=False) # e.g. "HINDI", "MATHEMATICS", "ENGLISH"
    code = db.Column(db.String(20), nullable=False)  # e.g. "HIN", "MATH", "ENG"
    
    # FLN Assessment indicator (from FLN sheet: Hindi, Maths, English)
    is_fln_subject = db.Column(db.Boolean, default=False, nullable=False)
    
    # Standard Max Marks (from PASHEET & MARKS sheets)
    max_pa_marks = db.Column(db.Float, default=20.0, nullable=False)      # PA-1 to PA-4: max 20
    max_term_marks = db.Column(db.Float, default=50.0, nullable=False)    # Mid-term / Final: max 50
    
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("school_id", "code", name="uq_school_subject_code"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "school_id": self.school_id,
            "name": self.name,
            "code": self.code,
            "is_fln_subject": self.is_fln_subject,
            "max_pa_marks": self.max_pa_marks,
            "max_term_marks": self.max_term_marks,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Subject id={self.id} code='{self.code}' name='{self.name}'>"
