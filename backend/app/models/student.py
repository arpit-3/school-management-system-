import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class Student(db.Model):
    __tablename__ = "students"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    class_section_id = db.Column(db.Integer, db.ForeignKey("class_sections.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Official Identifiers from STUDENT sheet
    student_id = db.Column(db.String(50), nullable=True, index=True)      # e.g. "2021001452"
    admission_no = db.Column(db.String(50), nullable=True, index=True)    # SR No. / Admission No
    roll_no = db.Column(db.Integer, nullable=True, index=True)            # 1 to 39
    
    # Personal Information
    name = db.Column(db.String(150), nullable=False, index=True)          # Student Full Name
    dob = db.Column(db.Date, nullable=True)                               # Date of Birth
    gender = db.Column(db.String(20), default="BOY", nullable=False)      # "BOY", "GIRL", "TRANSGENDER"
    category = db.Column(db.String(20), default="GEN", nullable=False)    # "GEN", "SC", "ST", "OBC", "EWS"
    photo_url = db.Column(db.String(255), nullable=True)                  # Avatar image URL / path
    
    # Parents & Family Information
    father_name = db.Column(db.String(150), nullable=True)
    mother_name = db.Column(db.String(150), nullable=True)
    contact_no = db.Column(db.String(30), nullable=True)
    address = db.Column(db.Text, nullable=True)
    
    # Identification & Welfare
    aadhar_no = db.Column(db.String(30), nullable=True)
    cwsn_status = db.Column(db.String(10), default="NO")                 # Children With Special Needs (YES/NO)
    blood_group = db.Column(db.String(10), nullable=True)
    
    # Banking Details (DBT, Uniform & Scholarship Welfare)
    bank_name = db.Column(db.String(100), nullable=True)
    bank_account_no = db.Column(db.String(50), nullable=True)
    ifsc_code = db.Column(db.String(30), nullable=True)
    bank_branch = db.Column(db.String(150), nullable=True)
    account_holder_name = db.Column(db.String(150), nullable=True)
    
    # Lifecycle
    status = db.Column(db.String(20), default="ACTIVE", nullable=False)   # "ACTIVE", "INACTIVE", "TRANSFERRED"
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    classroom = db.relationship("ClassSection", backref=db.backref("students", lazy="dynamic", cascade="all, delete-orphan"))
    school = db.relationship("School", backref="students")

    __table_args__ = (
        db.UniqueConstraint("class_section_id", "roll_no", name="uq_class_roll_no"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "school_id": self.school_id,
            "class_section_id": self.class_section_id,
            "class_name": self.classroom.class_name if self.classroom else None,
            "section_name": self.classroom.section_name if self.classroom else None,
            "class_display": self.classroom.display_name if self.classroom else None,
            "student_id": self.student_id,
            "admission_no": self.admission_no,
            "roll_no": self.roll_no,
            "name": self.name,
            "dob": self.dob.isoformat() if self.dob else None,
            "gender": self.gender,
            "category": self.category,
            "photo_url": self.photo_url,
            "father_name": self.father_name,
            "mother_name": self.mother_name,
            "contact_no": self.contact_no,
            "address": self.address,
            "aadhar_no": self.aadhar_no,
            "cwsn_status": self.cwsn_status,
            "blood_group": self.blood_group,
            "bank_name": self.bank_name,
            "bank_account_no": self.bank_account_no,
            "ifsc_code": self.ifsc_code,
            "bank_branch": self.bank_branch,
            "account_holder_name": self.account_holder_name,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<Student id={self.id} roll_no={self.roll_no} name='{self.name}'>"
