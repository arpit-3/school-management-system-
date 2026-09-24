import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.academic_session import AcademicSession
from app.models.classroom import ClassSection
from app.models.subject import Subject

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
        "username": "admin_test",
        "email": "admin@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Test",
        "role": "SUPER_ADMIN"
    })
    admin_token = res_admin.get_json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Register Teacher
    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_ind",
        "email": "teacher@test.gov.in",
        "password": "Password123",
        "full_name": "INDRAJEET",
        "role": "TEACHER"
    })
    teacher_token = res_teacher.get_json()["access_token"]
    teacher_user_id = res_teacher.get_json()["user"]["id"]

    # Create School
    res_school = client.post("/api/schools", headers=admin_headers, json={
        "name": "MCP NITHARI NO 1 BOYS",
        "code": "20",
        "zone": "ROHINI ZONE",
        "session_name": "2026-27"
    })
    school_id = res_school.get_json()["school"]["id"]
    session_id = res_school.get_json()["school"]["active_session"]["id"]

    return {
        "admin_token": admin_token,
        "teacher_token": teacher_token,
        "teacher_id": teacher_user_id,
        "school_id": school_id,
        "session_id": session_id
    }

def test_create_and_list_classes(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['admin_token']}"}
    
    # Create Class III-A
    res = client.post("/api/classrooms", headers=headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"],
        "class_name": "III",
        "section_name": "A",
        "display_name": "Class III-A",
        "category": "BOYS",
        "class_teacher_id": setup_data["teacher_id"],
        "total_students": 39
    })
    assert res.status_code == 201
    class_id = res.get_json()["classroom"]["id"]

    # List classes
    list_res = client.get("/api/classrooms", headers=headers)
    assert list_res.status_code == 200
    classes = list_res.get_json()["classrooms"]
    assert len(classes) == 1
    assert classes[0]["display_name"] == "Class III-A"
    assert classes[0]["class_teacher"]["full_name"] == "INDRAJEET"
    assert classes[0]["total_students"] == 39

def test_create_subjects_and_allocations(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['admin_token']}"}

    # Create FLN Subject: Hindi
    res_sub = client.post("/api/subjects", headers=headers, json={
        "school_id": setup_data["school_id"],
        "name": "HINDI",
        "code": "HIN",
        "is_fln_subject": True,
        "max_pa_marks": 20.0,
        "max_term_marks": 50.0
    })
    assert res_sub.status_code == 201
    subject_id = res_sub.get_json()["subject"]["id"]

    # Create Class
    res_cls = client.post("/api/classrooms", headers=headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"],
        "class_name": "III",
        "section_name": "A"
    })
    class_id = res_cls.get_json()["classroom"]["id"]

    # Allocate Teacher Indrajeet to Hindi for Class III-A
    res_alloc = client.post(f"/api/classrooms/{class_id}/allocations", headers=headers, json={
        "subject_id": subject_id,
        "teacher_id": setup_data["teacher_id"]
    })
    assert res_alloc.status_code == 200
    alloc_data = res_alloc.get_json()["allocation"]
    assert alloc_data["subject_code"] == "HIN"
    assert alloc_data["teacher_name"] == "INDRAJEET"

    # Verify classroom details includes this allocation
    get_cls = client.get(f"/api/classrooms/{class_id}", headers=headers)
    assert get_cls.status_code == 200
    allocations = get_cls.get_json()["classroom"]["allocations"]
    assert len(allocations) == 1
    assert allocations[0]["subject_name"] == "HINDI"

def test_teacher_cannot_create_class(client, setup_data):
    teacher_headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}
    res = client.post("/api/classrooms", headers=teacher_headers, json={
        "school_id": setup_data["school_id"],
        "session_id": setup_data["session_id"],
        "class_name": "IV",
        "section_name": "B"
    })
    assert res.status_code == 403
