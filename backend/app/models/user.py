import datetime
import bcrypt
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class RoleEnum:
    SUPER_ADMIN = "SUPER_ADMIN"
    SCHOOL_ADMIN = "SCHOOL_ADMIN"
    TEACHER = "TEACHER"
    VIEWER = "VIEWER"

    ALL_ROLES = [SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, VIEWER]

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(30), nullable=False, default=RoleEnum.TEACHER, index=True)
    
    # Association with school (nullable for SUPER_ADMIN)
    school_id = db.Column(db.Integer, nullable=True, index=True)
    
    # Metadata mapped directly from Excel ENTRY sheet (e.g. BMID, Contact No.)
    employee_id = db.Column(db.String(50), nullable=True, index=True) # e.g. BMID "95032137"
    phone_number = db.Column(db.String(20), nullable=True)             # e.g. "9958606952"
    designation = db.Column(db.String(100), nullable=True)            # e.g. "Class Teacher / PRT"
    
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    def set_password(self, password: str):
        salt = bcrypt.gensalt()
        self.password_hash = bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def check_password(self, password: str) -> bool:
        if not self.password_hash:
            return False
        return bcrypt.checkpw(password.encode("utf-8"), self.password_hash.encode("utf-8"))

    def has_role(self, *roles) -> bool:
        return self.role in roles

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "school_id": self.school_id,
            "employee_id": self.employee_id,
            "phone_number": self.phone_number,
            "designation": self.designation,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<User id={self.id} username='{self.username}' role='{self.role}'>"
