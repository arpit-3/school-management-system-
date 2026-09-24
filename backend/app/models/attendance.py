import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class StudentAttendance(db.Model):
    __tablename__ = "student_attendances"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey("academic_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    class_section_id = db.Column(db.Integer, db.ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id = db.Column(db.Integer, db.ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)

    term = db.Column(db.Integer, default=1, nullable=False) # 1: Term 1 (Apr-Sep), 2: Term 2 (Oct-Mar), 0: Annual
    month = db.Column(db.String(20), default="TERM_1", nullable=False) # e.g. "TERM_1", "TERM_2", "ANNUAL", "APR", "SEP"

    working_days = db.Column(db.Float, default=110.0, nullable=False)
    present_days = db.Column(db.Float, default=0.0, nullable=False)
    absent_days = db.Column(db.Float, default=0.0, nullable=False)
    percentage = db.Column(db.Float, default=0.0, nullable=False)
    is_low_attendance = db.Column(db.Boolean, default=False, nullable=False) # Warning if < 75%

    remarks = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    student = db.relationship("Student", backref="attendances")
    classroom = db.relationship("ClassSection", backref="attendances")

    __table_args__ = (
        db.UniqueConstraint("student_id", "session_id", "term", "month", name="uq_student_session_term_month_attendance"),
    )

    def calculate_metrics(self):
        if self.working_days > 0:
            self.absent_days = max(0.0, round(self.working_days - self.present_days, 1))
            self.percentage = round((self.present_days / self.working_days) * 100.0, 1)
            self.is_low_attendance = self.percentage < 75.0
        else:
            self.absent_days = 0.0
            self.percentage = 0.0
            self.is_low_attendance = False

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
            "term": self.term,
            "month": self.month,
            "working_days": self.working_days,
            "present_days": self.present_days,
            "absent_days": self.absent_days,
            "percentage": self.percentage,
            "is_low_attendance": self.is_low_attendance,
            "remarks": self.remarks,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def __repr__(self):
        return f"<StudentAttendance student_id={self.student_id} term={self.term} present={self.present_days}/{self.working_days} ({self.percentage}%)>"
