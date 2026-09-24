import datetime
from app.extensions import db

def utc_now():
    return datetime.timezone.utc

class StudentMark(db.Model):
    __tablename__ = "student_marks"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey("academic_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    class_section_id = db.Column(db.Integer, db.ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)

    marks_obtained = db.Column(db.Float, nullable=True) # e.g. 10.5, or None if Absent
    max_marks = db.Column(db.Float, default=20.0, nullable=False) # e.g. 20, 50, 5
    
    is_absent = db.Column(db.Boolean, default=False, nullable=False)
    is_exempt = db.Column(db.Boolean, default=False, nullable=False) # Medical/CWSN exemption
    is_locked = db.Column(db.Boolean, default=False, nullable=False) # Locked once finalized
    
    evaluator_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    remarks = db.Column(db.String(255), nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.datetime.now(datetime.timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.datetime.now(datetime.timezone.utc), onupdate=datetime.datetime.now(datetime.timezone.utc), nullable=False)

    # Relationships
    student = db.relationship("Student", backref="marks")
    assessment = db.relationship("Assessment", backref="student_marks")
    subject = db.relationship("Subject", backref="student_marks")
    evaluator = db.relationship("User", foreign_keys=[evaluator_id])

    __table_args__ = (
        db.UniqueConstraint("student_id", "assessment_id", "subject_id", name="uq_student_assessment_subject_mark"),
    )

    @property
    def percentage(self) -> float | None:
        if self.is_absent or self.marks_obtained is None or self.max_marks <= 0:
            return None
        return round((self.marks_obtained / self.max_marks) * 100.0, 2)

    def to_dict(self):
        return {
            "id": self.id,
            "school_id": self.school_id,
            "session_id": self.session_id,
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
            "marks_obtained": self.marks_obtained,
            "max_marks": self.max_marks,
            "percentage": self.percentage,
            "is_absent": self.is_absent,
            "is_exempt": self.is_exempt,
            "is_locked": self.is_locked,
            "evaluator_name": self.evaluator.full_name if self.evaluator else None,
            "remarks": self.remarks,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<StudentMark student_id={self.student_id} ass_id={self.assessment_id} sub_id={self.subject_id} marks={self.marks_obtained}/{self.max_marks}>"
