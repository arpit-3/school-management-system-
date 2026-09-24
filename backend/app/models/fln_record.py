import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class FLNRecord(db.Model):
    __tablename__ = "fln_records"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    class_section_id = db.Column(db.Integer, db.ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # FLN Level: 1 to 5, or None if Absent
    level = db.Column(db.Integer, nullable=True) # 1, 2, 3, 4, 5
    level_name = db.Column(db.String(100), nullable=True) # e.g. "Alphabets", "Number Recognition (10-99)", "Character"
    is_absent = db.Column(db.Boolean, default=False, nullable=False)
    
    assessment_date = db.Column(db.Date, nullable=True)
    evaluator_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    student = db.relationship("Student", backref="fln_records")
    assessment = db.relationship("Assessment", backref="fln_records")
    subject = db.relationship("Subject", backref="fln_records")
    evaluator = db.relationship("User", foreign_keys=[evaluator_id])

    __table_args__ = (
        db.UniqueConstraint("student_id", "assessment_id", "subject_id", name="uq_student_assessment_subject"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "school_id": self.school_id,
            "class_section_id": self.class_section_id,
            "student_id": self.student_id,
            "student_name": self.student.name if self.student else None,
            "roll_no": self.student.roll_no if self.student else None,
            "admission_no": self.student.admission_no if self.student else None,
            "assessment_id": self.assessment_id,
            "assessment_name": self.assessment.name if self.assessment else None,
            "assessment_code": self.assessment.code if self.assessment else None,
            "subject_id": self.subject_id,
            "subject_name": self.subject.name if self.subject else None,
            "subject_code": self.subject.code if self.subject else None,
            "level": self.level,
            "level_name": self.level_name,
            "is_absent": self.is_absent,
            "assessment_date": self.assessment_date.isoformat() if self.assessment_date else None,
            "evaluator_name": self.evaluator.full_name if self.evaluator else None,
            "remarks": self.remarks,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<FLNRecord student_id={self.student_id} assessment_id={self.assessment_id} subject_id={self.subject_id} level={self.level}>"
