import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class ClassSubjectTeacher(db.Model):
    __tablename__ = "class_subject_teachers"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_section_id = db.Column(db.Integer, db.ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False, index=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    # Relationships
    subject = db.relationship("Subject", backref="allocations")
    teacher = db.relationship("User", backref="subject_allocations")

    __table_args__ = (
        db.UniqueConstraint("class_section_id", "subject_id", name="uq_class_section_subject"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "class_section_id": self.class_section_id,
            "subject_id": self.subject_id,
            "subject_name": self.subject.name if self.subject else None,
            "subject_code": self.subject.code if self.subject else None,
            "is_fln_subject": self.subject.is_fln_subject if self.subject else False,
            "teacher_id": self.teacher_id,
            "teacher_name": self.teacher.full_name if self.teacher else None,
            "teacher_email": self.teacher.email if self.teacher else None,
            "teacher_bmid": self.teacher.employee_id if self.teacher else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<ClassSubjectTeacher class_section={self.class_section_id} subject={self.subject_id} teacher={self.teacher_id}>"
