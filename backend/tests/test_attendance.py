import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.student import Student
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
def setup_data(client):
    # Admin & Teacher
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_att_test",
        "email": "admin_att@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Attendance Test",
        "role": "SUPER_ADMIN"
    })
    admin_token = res_admin.get_json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_att_test",
        "email": "teacher_att@test.gov.in",
        "password": "Password123",
        "full_name": "Teacher Indrajeet",
        "role": "TEACHER"
    })
    teacher_token = res_teacher.get_json()["access_token"]

    # School & Session
    res_school = client.post("/api/schools", headers=admin_headers, json={
        "name": "MCP NITHARI NO 1 BOYS",
        "session_name": "2026-27"
    })
    school_id = res_school.get_json()["school"]["id"]
    session_id = res_school.get_json()["school"]["active_session"]["id"]

    # Class III-A
    res_class = client.post("/api/classrooms", headers=admin_headers, json={
        "school_id": school_id,
        "session_id": session_id,
        "class_name": "III",
        "section_name": "A"
    })
    class_id = res_class.get_json()["classroom"]["id"]

    # 2 Students
    res_st1 = client.post("/api/students", headers=admin_headers, json={
        "school_id": school_id,
        "class_section_id": class_id,
        "roll_no": 1,
        "name": "NAKSH"
    })
    st1_id = res_st1.get_json()["student"]["id"]

    res_st2 = client.post("/api/students", headers=admin_headers, json={
        "school_id": school_id,
        "class_section_id": class_id,
        "roll_no": 2,
        "name": "NAVEEN"
    })
    st2_id = res_st2.get_json()["student"]["id"]

    return {
        "admin_token": admin_token,
        "teacher_token": teacher_token,
        "school_id": school_id,
        "class_id": class_id,
        "st1_id": st1_id,
        "st2_id": st2_id
    }

def test_get_attendance_sheet_and_save_single(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Initial sheet
    res = client.get(
        f"/api/attendance/sheet?class_section_id={setup_data['class_id']}&term=1&month=TERM_1",
        headers=headers
    )
    assert res.status_code == 200
    sheet = res.get_json()["data"]
    assert len(sheet["rows"]) == 2

    # Save 96 present days out of 110 (87.3% -> Normal)
    res_save = client.post("/api/attendance/entry", headers=headers, json={
        "student_id": setup_data["st1_id"],
        "term": 1,
        "month": "TERM_1",
        "working_days": 110.0,
        "present_days": 96.0
    })
    assert res_save.status_code == 200
    rec = res_save.get_json()["record"]
    assert rec["present_days"] == 96.0
    assert rec["absent_days"] == 14.0
    assert rec["percentage"] == 87.3
    assert rec["is_low_attendance"] is False

def test_low_attendance_warning_flag(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Save 60 present days out of 110 (54.5% -> Low Attendance Warning!)
    res_save = client.post("/api/attendance/entry", headers=headers, json={
        "student_id": setup_data["st2_id"],
        "term": 1,
        "month": "TERM_1",
        "working_days": 110.0,
        "present_days": 60.0
    })
    assert res_save.status_code == 200
    rec = res_save.get_json()["record"]
    assert rec["percentage"] == 54.5
    assert rec["is_low_attendance"] is True

def test_attendance_validation_exceeds_working_days(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # 120 present days out of 110 should fail
    res = client.post("/api/attendance/entry", headers=headers, json={
        "student_id": setup_data["st1_id"],
        "term": 1,
        "month": "TERM_1",
        "working_days": 110.0,
        "present_days": 120.0
    })
    assert res.status_code == 400
    assert "cannot exceed" in res.get_json()["error"]

def test_bulk_save_attendance(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    entries = [
        {"student_id": setup_data["st1_id"], "present_days": 100.0},
        {"student_id": setup_data["st2_id"], "present_days": 80.0}
    ]
    res_bulk = client.post("/api/attendance/bulk", headers=headers, json={
        "class_section_id": setup_data["class_id"],
        "term": 1,
        "month": "TERM_1",
        "working_days": 110.0,
        "entries": entries
    })
    assert res_bulk.status_code == 200
    assert res_bulk.get_json()["updated_count"] == 2
