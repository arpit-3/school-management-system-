import datetime
from app.extensions import db

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class AcademicSession(db.Model):
    __tablename__ = "academic_sessions"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    school_id = db.Column(db.Integer, db.ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True)
    session_name = db.Column(db.String(50), nullable=False) # e.g. "2026-27"
    
    start_date = db.Column(db.Date, nullable=True) # e.g. 2026-04-01
    end_date = db.Column(db.Date, nullable=True)   # e.g. 2027-03-31
    result_date = db.Column(db.Date, nullable=True) # from ENTRY sheet: 2026-03-21
    
    # Working days (from ENTRY sheet)
    working_days_term1 = db.Column(db.Integer, default=0) # Apr to Sep
    working_days_annual = db.Column(db.Integer, default=0) # Apr to March
    
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    __table_args__ = (
        db.UniqueConstraint("school_id", "session_name", name="uq_school_session_name"),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "school_id": self.school_id,
            "session_name": self.session_name,
            "start_date": self.start_date.isoformat() if self.start_date else None,
            "end_date": self.end_date.isoformat() if self.end_date else None,
            "result_date": self.result_date.isoformat() if self.result_date else None,
            "working_days_term1": self.working_days_term1,
            "working_days_annual": self.working_days_annual,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    def __repr__(self):
        return f"<AcademicSession id={self.id} session_name='{self.session_name}' is_active={self.is_active}>"
