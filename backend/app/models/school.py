import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class School(db.Model):
    __tablename__ = "schools"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(200), nullable=False, index=True) # e.g. "MCP NITHARI NO 1 BOYS"
    code = db.Column(db.String(50), nullable=True, unique=True, index=True) # e.g. School Number "20"
    udise_id = db.Column(db.String(50), nullable=True, unique=True, index=True) # U-DISE ID / Code
    
    # Administrative & Municipal Details (from ENTRY sheet)
    corporation_name = db.Column(db.String(150), default="MUNICIPAL CORPORATION OF DELHI")
    corporation_short_name = db.Column(db.String(50), default="MCD")
    department_name = db.Column(db.String(150), default="EDUCATION DEPARTMENT")
    zone = db.Column(db.String(100), default="ROHINI ZONE")
    ward_number = db.Column(db.String(50), default="40")
    state = db.Column(db.String(100), default="NEW DELHI")
    address = db.Column(db.Text, nullable=True)
    
    # Leadership & Supervision (from ENTRY sheet)
    principal_name = db.Column(db.String(150), nullable=True) # e.g. "SHAMBHU DAYAL MEENA"
    principal_phone = db.Column(db.String(25), nullable=True)
    mentor_name = db.Column(db.String(150), nullable=True)    # e.g. "DEVENDER SINGH"
    school_inspector_name = db.Column(db.String(150), nullable=True) # Name of S.I.
    academic_coordinator_name = db.Column(db.String(150), nullable=True)
    academic_coordinator_phone = db.Column(db.String(25), nullable=True)
    
    # Metadata & Capacity
    total_school_students = db.Column(db.Integer, default=0) # Total Students in School
    
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    # Relationships
    sessions = db.relationship("AcademicSession", backref="school", lazy="dynamic", cascade="all, delete-orphan")

    @property
    def active_session(self):
        return self.sessions.filter_by(is_active=True).first()

    def to_dict(self):
        active_sess = self.active_session
        return {
            "id": self.id,
            "name": self.name,
            "code": self.code,
            "udise_id": self.udise_id,
            "corporation_name": self.corporation_name,
            "corporation_short_name": self.corporation_short_name,
            "department_name": self.department_name,
            "zone": self.zone,
            "ward_number": self.ward_number,
            "state": self.state,
            "address": self.address,
            "principal_name": self.principal_name,
            "principal_phone": self.principal_phone,
            "mentor_name": self.mentor_name,
            "school_inspector_name": self.school_inspector_name,
            "academic_coordinator_name": self.academic_coordinator_name,
            "academic_coordinator_phone": self.academic_coordinator_phone,
            "total_school_students": self.total_school_students,
            "is_active": self.is_active,
            "active_session": active_sess.to_dict() if active_sess else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<School id={self.id} name='{self.name}' code='{self.code}'>"
