import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class ClassSection(db.Model):
    __tablename__ = "class_sections"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = db.Column(db.Integer, db.ForeignKey("academic_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    class_name = db.Column(db.String(20), nullable=False) # e.g. "III" or "3", "I", "II", "IV", "V"
    section_name = db.Column(db.String(10), nullable=False, default="A") # e.g. "A", "B", "C", "D"
    display_name = db.Column(db.String(50), nullable=False) # e.g. "Class III-A"
    
    category = db.Column(db.String(50), default="BOYS") # e.g. "BOYS", "GIRLS", "CO-ED"
    room_number = db.Column(db.String(50), nullable=True)
    max_capacity = db.Column(db.Integer, default=45, nullable=False)
    
    # Primary Class Teacher (from ENTRY sheet: INDRAJEET)
    class_teacher_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    total_students = db.Column(db.Integer, default=0) # from ENTRY sheet: 39 students
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    school = db.relationship("School", backref="class_sections_list")
    class_teacher = db.relationship("User", foreign_keys=[class_teacher_id], backref="assigned_classes")
    session = db.relationship("AcademicSession", backref="classes")
    allocations = db.relationship("ClassSubjectTeacher", backref="class_section", lazy="dynamic", cascade="all, delete-orphan")

    __table_args__ = (
        db.UniqueConstraint("school_id", "session_id", "class_name", "section_name", name="uq_school_session_class_section"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "school_id": self.school_id,
            "session_id": self.session_id,
            "session_name": self.session.session_name if self.session else None,
            "class_name": self.class_name,
            "section_name": self.section_name,
            "display_name": self.display_name,
            "category": self.category,
            "room_number": self.room_number,
            "max_capacity": self.max_capacity,
            "class_teacher_id": self.class_teacher_id,
            "class_teacher": {
                "id": self.class_teacher.id,
                "full_name": self.class_teacher.full_name,
                "email": self.class_teacher.email,
                "employee_id": self.class_teacher.employee_id,
                "phone_number": self.class_teacher.phone_number
            } if self.class_teacher else None,
            "total_students": self.total_students,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<ClassSection id={self.id} display_name='{self.display_name}'>"
