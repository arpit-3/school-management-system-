import pytest
from app import create_app
from app.extensions import db
from app.models.user import User
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.student import Student
from app.models.assessment import Assessment
from app.models.mark import StudentMark
from app.models.fln_record import FLNRecord
from app.models.attendance import StudentAttendance

@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def setup_ai_data(client):
    # Admin
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_ai_test",
        "email": "admin_ai@test.gov.in",
        "password": "Password123",
        "full_name": "Admin AI Test",
        "role": "SUPER_ADMIN"
    })
    token = res_admin.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # School & Session
    res_school = client.post("/api/schools", headers=headers, json={
        "name": "MCP NITHARI NO 1 BOYS",
        "session_name": "2026-27"
    })
    school_id = res_school.get_json()["school"]["id"]
    session_id = res_school.get_json()["school"]["active_session"]["id"]

    # Class III-A
    res_class = client.post("/api/classrooms", headers=headers, json={
        "school_id": school_id,
        "session_id": session_id,
        "class_name": "III",
        "section_name": "A"
    })
    class_id = res_class.get_json()["classroom"]["id"]

    # Subject Hindi
    res_sub = client.post("/api/subjects", headers=headers, json={
        "school_id": school_id, "name": "HINDI", "code": "HIN"
    })
    sub_id = res_sub.get_json()["subject"]["id"]

    # Assessment PA1 & FLN
    res_pa1 = client.post("/api/assessments", headers=headers, json={
        "school_id": school_id, "session_id": session_id, "name": "PA 1", "code": "PA1", "assessment_type": "PERIODIC", "max_marks": 20.0
    })
    res_fln = client.post("/api/assessments", headers=headers, json={
        "school_id": school_id, "session_id": session_id, "name": "FLN Baseline", "code": "FLN_BASE", "assessment_type": "FLN", "max_marks": 5.0
    })
    pa1_id = res_pa1.get_json()["assessment"]["id"]
    fln_id = res_fln.get_json()["assessment"]["id"]

    # 2 Students: 1 High Performer, 1 At-Risk
    res_st1 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 1, "name": "NAKSH"})
    res_st2 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 2, "name": "NAVEEN"})
    st1_id = res_st1.get_json()["student"]["id"]
    st2_id = res_st2.get_json()["student"]["id"]

    # Marks
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa1_id, "subject_id": sub_id, "marks_obtained": 19.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st2_id, "assessment_id": pa1_id, "subject_id": sub_id, "marks_obtained": 4.0})

    # FLN
    client.post("/api/fln/entry", headers=headers, json={"student_id": st1_id, "assessment_id": fln_id, "subject_id": sub_id, "level": 4})
    client.post("/api/fln/entry", headers=headers, json={"student_id": st2_id, "assessment_id": fln_id, "subject_id": sub_id, "level": 1})

    # Attendance: St1 = 95%, St2 = 50%
    client.post("/api/attendance/entry", headers=headers, json={"student_id": st1_id, "working_days": 100, "present_days": 95})
    client.post("/api/attendance/entry", headers=headers, json={"student_id": st2_id, "working_days": 100, "present_days": 50})

    return {
        "headers": headers,
        "class_id": class_id,
        "st1_id": st1_id,
        "st2_id": st2_id
    }

def test_class_overview_ai(client, setup_ai_data):
    res = client.get(f"/api/ai/class-overview?class_section_id={setup_ai_data['class_id']}", headers=setup_ai_data["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]

    assert "class_health" in data
    assert "score" in data["class_health"]
    assert "rating" in data["class_health"]
    assert "subject_mastery" in data
    assert "executive_summary" in data
    assert len(data["executive_summary"]) > 20

def test_at_risk_students_identification(client, setup_ai_data):
    res = client.get(f"/api/ai/at-risk-students?class_section_id={setup_ai_data['class_id']}", headers=setup_ai_data["headers"])
    assert res.status_code == 200
    data = res.get_json()

    # St2 (NAVEEN) has 50% attendance, level 1 FLN, and 4/20 marks -> HIGH RISK
    assert data["count"] >= 1
    st2 = next(s for s in data["students"] if s["student_id"] == setup_ai_data["st2_id"])
    assert st2["risk_tier"] == "HIGH"
    assert len(st2["risk_reasons"]) >= 2
    assert len(st2["interventions"]) >= 2

def test_individual_student_insights(client, setup_ai_data):
    res = client.get(f"/api/ai/student-insights/{setup_ai_data['st1_id']}", headers=setup_ai_data["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]

    assert data["student_id"] == setup_ai_data["st1_id"]
    assert len(data["strengths"]) >= 1
    assert len(data["predictions"]) >= 1
    assert len(data["prescriptions"]) >= 1
