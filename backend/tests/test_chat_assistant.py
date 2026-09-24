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
def setup_chat_data(client):
    # Admin
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_chat_test",
        "email": "admin_chat@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Chat Test",
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
    res_sub = client.post("/api/subjects", headers=headers, json={"school_id": school_id, "name": "HINDI", "code": "HIN"})
    sub_id = res_sub.get_json()["subject"]["id"]

    # Assessment PA1
    res_pa1 = client.post("/api/assessments", headers=headers, json={
        "school_id": school_id, "session_id": session_id, "name": "PA 1", "code": "PA1", "assessment_type": "PERIODIC", "max_marks": 20.0
    })
    pa1_id = res_pa1.get_json()["assessment"]["id"]

    # 2 Students: 1 high attendance, 1 low attendance
    res_st1 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 1, "name": "NAKSH"})
    res_st2 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 2, "name": "NAVEEN"})
    st1_id = res_st1.get_json()["student"]["id"]
    st2_id = res_st2.get_json()["student"]["id"]

    # Marks
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa1_id, "subject_id": sub_id, "marks_obtained": 19.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st2_id, "assessment_id": pa1_id, "subject_id": sub_id, "marks_obtained": 8.0})

    # Attendance
    client.post("/api/attendance/entry", headers=headers, json={"student_id": st1_id, "working_days": 100, "present_days": 90})
    client.post("/api/attendance/entry", headers=headers, json={"student_id": st2_id, "working_days": 100, "present_days": 55})

    return {
        "headers": headers,
        "class_id": class_id
    }

def test_chat_low_attendance_query(client, setup_chat_data):
    res = client.post("/api/chat/message", headers=setup_chat_data["headers"], json={
        "message": "Show me students with attendance below 75%",
        "class_section_id": setup_chat_data["class_id"]
    })
    assert res.status_code == 200
    data = res.get_json()["response"]
    assert data["intent"] == "LOW_ATTENDANCE"
    assert len(data["data"]) >= 1
    assert data["data"][0]["name"] == "NAVEEN"

def test_chat_toppers_query(client, setup_chat_data):
    res = client.post("/api/chat/message", headers=setup_chat_data["headers"], json={
        "message": "Who are the highest scoring toppers in class?",
        "class_section_id": setup_chat_data["class_id"]
    })
    assert res.status_code == 200
    data = res.get_json()["response"]
    assert data["intent"] == "TOPPERS"
    assert len(data["data"]) >= 1
    assert data["data"][0]["name"] == "NAKSH"

def test_chat_student_lookup_query(client, setup_chat_data):
    res = client.post("/api/chat/message", headers=setup_chat_data["headers"], json={
        "message": "Tell me about Naksh",
        "class_section_id": setup_chat_data["class_id"]
    })
    assert res.status_code == 200
    data = res.get_json()["response"]
    assert data["intent"] == "STUDENT_PROFILE"
    assert data["data"]["name"] == "NAKSH"

def test_chat_suggestions_endpoint(client, setup_chat_data):
    res = client.get("/api/chat/suggestions", headers=setup_chat_data["headers"])
    assert res.status_code == 200
    suggestions = res.get_json()["suggestions"]
    assert len(suggestions) >= 4
