import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.academic_session import AcademicSession
from app.models.assessment import Assessment, AssessmentTypeEnum

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
    # Register Super Admin
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_ass_test",
        "email": "admin_ass@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Assessment Test",
        "role": "SUPER_ADMIN"
    })
    admin_token = res_admin.get_json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Register Teacher
    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_ass_test",
        "email": "teacher_ass@test.gov.in",
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

    return {
        "admin_token": admin_token,
        "teacher_token": teacher_token,
        "school_id": school_id,
        "session_id": session_id
    }

def test_create_and_get_assessment(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['admin_token']}"}

    # Create PA-1
    res = client.post("/api/assessments", headers=headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"],
        "name": "Periodic Assessment 1 (PA-1)",
        "code": "PA1",
        "assessment_type": "PERIODIC",
        "term": 1,
        "max_marks": 20.0,
        "weightage": 10.0,
        "start_date": "2026-07-15",
        "end_date": "2026-07-22"
    })
    assert res.status_code == 201
    ass_id = res.get_json()["assessment"]["id"]

    # Get assessment
    res_get = client.get(f"/api/assessments/{ass_id}", headers=headers)
    assert res_get.status_code == 200
    data = res_get.get_json()["assessment"]
    assert data["name"] == "Periodic Assessment 1 (PA-1)"
    assert data["code"] == "PA1"
    assert data["max_marks"] == 20.0
    assert data["weightage"] == 10.0

def test_seed_defaults_and_filter(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['admin_token']}"}

    # Seed defaults
    res = client.post("/api/assessments/seed-defaults", headers=headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"]
    })
    assert res.status_code == 200
    assert res.get_json()["created_count"] >= 10

    # Filter by PERIODIC
    res_periodic = client.get(f"/api/assessments?school_id={setup_data['school_id']}&assessment_type=PERIODIC", headers=headers)
    assert res_periodic.status_code == 200
    periodic_items = res_periodic.get_json()["assessments"]
    assert len(periodic_items) == 4 # PA1, PA2, PA3, PA4
    codes = [p["code"] for p in periodic_items]
    assert "PA1" in codes
    assert "PA4" in codes

    # Filter by FLN
    res_fln = client.get(f"/api/assessments?school_id={setup_data['school_id']}&assessment_type=FLN", headers=headers)
    assert res_fln.status_code == 200
    fln_items = res_fln.get_json()["assessments"]
    assert len(fln_items) >= 5

def test_duplicate_assessment_code_fails(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['admin_token']}"}

    client.post("/api/assessments", headers=headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"],
        "name": "Mid-Term",
        "code": "MID_TERM",
        "assessment_type": "TERM"
    })

    # Duplicate code
    res_dup = client.post("/api/assessments", headers=headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"],
        "name": "Another Mid Term",
        "code": "MID_TERM",
        "assessment_type": "TERM"
    })
    assert res_dup.status_code == 409
    assert "already exists" in res_dup.get_json()["error"]

def test_teacher_cannot_create_or_delete_assessment(client, setup_data):
    teacher_headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}
    
    res = client.post("/api/assessments", headers=teacher_headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"],
        "name": "Unauthorized Assessment",
        "code": "UNAUTH",
        "assessment_type": "PERIODIC"
    })
    assert res.status_code == 403
