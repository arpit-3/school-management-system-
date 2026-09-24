import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class StudentTestCopy(db.Model):
    __tablename__ = "student_test_copies"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = db.Column(db.Integer, db.ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True, index=True)
    subject_id = db.Column(db.Integer, db.ForeignKey("subjects.id", ondelete="SET NULL"), nullable=True, index=True)
    teacher_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title = db.Column(db.String(150), nullable=False)                    # e.g., "Term 1 Maths Answer Sheet"
    file_name = db.Column(db.String(255), nullable=False)                # original filename
    file_path = db.Column(db.String(255), nullable=False)                # storage relative path
    file_type = db.Column(db.String(50), nullable=True)                  # "image/png", "application/pdf", etc.
    file_size = db.Column(db.Integer, nullable=True)                     # size in bytes
    marks_awarded = db.Column(db.Float, nullable=True)                   # verified marks on copy
    notes = db.Column(db.Text, nullable=True)                            # teacher remarks / evaluation notes
    
    uploaded_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    # Relationships
    student = db.relationship("Student", backref=db.backref("test_copies", lazy="dynamic", cascade="all, delete-orphan"))
    assessment = db.relationship("Assessment")
    subject = db.relationship("Subject")
    teacher = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "student_id": self.student_id,
            "student_name": self.student.name if self.student else None,
            "student_roll": self.student.roll_no if self.student else None,
            "assessment_id": self.assessment_id,
            "assessment_name": self.assessment.name if self.assessment else None,
            "assessment_code": self.assessment.code if self.assessment else None,
            "subject_id": self.subject_id,
            "subject_name": self.subject.name if self.subject else None,
            "subject_code": self.subject.code if self.subject else None,
            "teacher_id": self.teacher_id,
            "teacher_name": self.teacher.full_name if self.teacher else None,
            "title": self.title,
            "file_name": self.file_name,
            "file_url": f"/api/students/test-copies/file/{self.id}",
            "file_type": self.file_type,
            "file_size": self.file_size,
            "marks_awarded": self.marks_awarded,
            "notes": self.notes,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None
        }

    def __repr__(self):
        return f"<StudentTestCopy id={self.id} student_id={self.student_id} title='{self.title}'>"
