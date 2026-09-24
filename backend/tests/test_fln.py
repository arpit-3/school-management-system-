import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.student import Student
from app.models.assessment import Assessment, AssessmentTypeEnum
from app.models.fln_record import FLNRecord

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
    # Register Admin & Teacher
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_fln_test",
        "email": "admin_fln@test.gov.in",
        "password": "Password123",
        "full_name": "Admin FLN Test",
        "role": "SUPER_ADMIN"
    })
    admin_token = res_admin.get_json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_fln_test",
        "email": "teacher_fln@test.gov.in",
        "password": "Password123",
        "full_name": "Teacher Indrajeet",
        "role": "TEACHER"
    })
    teacher_token = res_teacher.get_json()["access_token"]

    # Create School
    res_school = client.post("/api/schools", headers=admin_headers, json={
        "name": "MCP NITHARI NO 1 BOYS",
        "session_name": "2026-27"
    })
    school_id = res_school.get_json()["school"]["id"]
    session_id = res_school.get_json()["school"]["active_session"]["id"]

    # Create Class III-A
    res_class = client.post("/api/classrooms", headers=admin_headers, json={
        "school_id": school_id,
        "session_id": session_id,
        "class_name": "III",
        "section_name": "A"
    })
    class_id = res_class.get_json()["classroom"]["id"]

    # Create FLN Subjects (Hindi, Maths, English)
    res_hin = client.post("/api/subjects", headers=admin_headers, json={
        "school_id": school_id,
        "name": "HINDI",
        "code": "HIN",
        "is_fln_subject": True
    })
    hin_id = res_hin.get_json()["subject"]["id"]

    res_math = client.post("/api/subjects", headers=admin_headers, json={
        "school_id": school_id,
        "name": "MATHEMATICS",
        "code": "MATH",
        "is_fln_subject": True
    })
    math_id = res_math.get_json()["subject"]["id"]

    res_eng = client.post("/api/subjects", headers=admin_headers, json={
        "school_id": school_id,
        "name": "ENGLISH",
        "code": "ENG",
        "is_fln_subject": True
    })
    eng_id = res_eng.get_json()["subject"]["id"]

    # Create FLN Assessment
    res_ass = client.post("/api/assessments", headers=admin_headers, json={
        "school_id": school_id,
        "session_id": session_id,
        "name": "FLN Baseline Assessment",
        "code": "FLN_BASELINE",
        "assessment_type": "FLN"
    })
    assessment_id = res_ass.get_json()["assessment"]["id"]

    # Create 2 Students
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
        "hin_id": hin_id,
        "math_id": math_id,
        "eng_id": eng_id,
        "st1_id": st1_id,
        "st2_id": st2_id
    }

def test_get_fln_matrix_initial(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}
    res = client.get(f"/api/fln/matrix?class_section_id={setup_data['class_id']}&assessment_id={setup_data['assessment_id']}", headers=headers)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data["matrix"]) == 2
    assert "HIN" in data["matrix"][0]["subjects"]
    assert data["matrix"][0]["subjects"]["HIN"]["level"] is None

def test_record_single_entry_and_validation(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Record Level 2 for Student 1 in Hindi
    res = client.post("/api/fln/entry", headers=headers, json={
        "student_id": setup_data["st1_id"],
        "assessment_id": setup_data["assessment_id"],
        "subject_id": setup_data["hin_id"],
        "level": 2
    })
    assert res.status_code == 200
    rec = res.get_json()["record"]
    assert rec["level"] == 2
    assert "Letter" in rec["level_name"]

    # Invalid level (level 6 should fail)
    res_bad = client.post("/api/fln/entry", headers=headers, json={
        "student_id": setup_data["st1_id"],
        "assessment_id": setup_data["assessment_id"],
        "subject_id": setup_data["hin_id"],
        "level": 6
    })
    assert res_bad.status_code == 400

def test_bulk_save_matrix_and_summary(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Bulk save levels
    bulk_entries = [
        {"student_id": setup_data["st1_id"], "subject_id": setup_data["hin_id"], "level": 2},
        {"student_id": setup_data["st1_id"], "subject_id": setup_data["math_id"], "level": 3},
        {"student_id": setup_data["st1_id"], "subject_id": setup_data["eng_id"], "level": 2},
        {"student_id": setup_data["st2_id"], "subject_id": setup_data["hin_id"], "level": 1},
        {"student_id": setup_data["st2_id"], "subject_id": setup_data["math_id"], "is_absent": True},
        {"student_id": setup_data["st2_id"], "subject_id": setup_data["eng_id"], "level": 1}
    ]

    res = client.post("/api/fln/matrix", headers=headers, json={
        "class_section_id": setup_data["class_id"],
        "assessment_id": setup_data["assessment_id"],
        "entries": bulk_entries
    })
    assert res.status_code == 200
    assert res.get_json()["updated_count"] == 6

    # Test summary analytics
    res_sum = client.get(f"/api/fln/summary?class_section_id={setup_data['class_id']}&assessment_id={setup_data['assessment_id']}", headers=headers)
    assert res_sum.status_code == 200
    summary = res_sum.get_json()["summary"]
    assert summary["HIN"]["L2"] == 1
    assert summary["HIN"]["L1"] == 1
    assert summary["MATH"]["Ab"] == 1
    assert summary["MATH"]["L3"] == 1
