import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.student import Student
from app.models.assessment import Assessment, AssessmentTypeEnum
from app.models.mark import StudentMark

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
        "username": "admin_mark_test",
        "email": "admin_mark@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Marks Test",
        "role": "SUPER_ADMIN"
    })
    admin_token = res_admin.get_json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_mark_test",
        "email": "teacher_mark@test.gov.in",
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

    # Subject Hindi
    res_sub = client.post("/api/subjects", headers=admin_headers, json={
        "school_id": school_id,
        "name": "HINDI",
        "code": "HIN"
    })
    subject_id = res_sub.get_json()["subject"]["id"]

    # Assessment PA-1 (Max marks: 20)
    res_ass = client.post("/api/assessments", headers=admin_headers, json={
        "school_id": school_id,
        "session_id": session_id,
        "name": "Periodic Assessment 1 (PA-1)",
        "code": "PA1",
        "assessment_type": "PERIODIC",
        "max_marks": 20.0
    })
    assessment_id = res_ass.get_json()["assessment"]["id"]

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
        "assessment_id": assessment_id,
        "subject_id": subject_id,
        "st1_id": st1_id,
        "st2_id": st2_id
    }

def test_get_marks_sheet_and_save_single(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Initial sheet
    res = client.get(
        f"/api/marks/sheet?class_section_id={setup_data['class_id']}&assessment_id={setup_data['assessment_id']}&subject_id={setup_data['subject_id']}",
        headers=headers
    )
    assert res.status_code == 200
    sheet = res.get_json()["data"]
    assert len(sheet["rows"]) == 2
    assert sheet["stats"]["evaluated_count"] == 0

    # Save 18 marks out of 20 for Student 1
    res_save = client.post("/api/marks/entry", headers=headers, json={
        "student_id": setup_data["st1_id"],
        "assessment_id": setup_data["assessment_id"],
        "subject_id": setup_data["subject_id"],
        "marks_obtained": 18.0
    })
    assert res_save.status_code == 200
    rec = res_save.get_json()["record"]
    assert rec["marks_obtained"] == 18.0
    assert rec["percentage"] == 90.0

def test_marks_validation_exceeds_max(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # 25 marks out of 20 should fail
    res = client.post("/api/marks/entry", headers=headers, json={
        "student_id": setup_data["st1_id"],
        "assessment_id": setup_data["assessment_id"],
        "subject_id": setup_data["subject_id"],
        "marks_obtained": 25.0
    })
    assert res.status_code == 400
    assert "exceeds" in res.get_json()["error"]

def test_bulk_save_and_locking(client, setup_data):
    teacher_headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}
    admin_headers = {"Authorization": f"Bearer {setup_data['admin_token']}"}

    # Bulk save
    entries = [
        {"student_id": setup_data["st1_id"], "marks_obtained": 14.5},
        {"student_id": setup_data["st2_id"], "is_absent": True}
    ]
    res_bulk = client.post("/api/marks/bulk", headers=teacher_headers, json={
        "class_section_id": setup_data["class_id"],
        "assessment_id": setup_data["assessment_id"],
        "subject_id": setup_data["subject_id"],
        "entries": entries
    })
    assert res_bulk.status_code == 200
    assert res_bulk.get_json()["updated_count"] == 2

    # Lock sheet as Admin
    res_lock = client.post("/api/marks/lock", headers=admin_headers, json={
        "class_section_id": setup_data["class_id"],
        "assessment_id": setup_data["assessment_id"],
        "subject_id": setup_data["subject_id"],
        "is_locked": True
    })
    assert res_lock.status_code == 200

    # Attempt to modify while locked should fail
    res_modify = client.post("/api/marks/entry", headers=teacher_headers, json={
        "student_id": setup_data["st1_id"],
        "assessment_id": setup_data["assessment_id"],
        "subject_id": setup_data["subject_id"],
        "marks_obtained": 19.0
    })
    assert res_modify.status_code == 400
    assert "locked" in res_modify.get_json()["error"]
