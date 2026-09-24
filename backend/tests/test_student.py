import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.academic_session import AcademicSession
from app.models.classroom import ClassSection
from app.models.student import Student

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
        "username": "admin_student_test",
        "email": "admin_student@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Student Test",
        "role": "SUPER_ADMIN"
    })
    admin_token = res_admin.get_json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Register Teacher
    res_teacher = client.post("/api/auth/register", json={
        "username": "teacher_student_test",
        "email": "teacher_student@test.gov.in",
        "password": "Password123",
        "full_name": "Teacher Indrajeet",
        "role": "TEACHER"
    })
    teacher_token = res_teacher.get_json()["access_token"]

    # Register Viewer
    res_viewer = client.post("/api/auth/register", json={
        "username": "viewer_student_test",
        "email": "viewer_student@test.gov.in",
        "password": "Password123",
        "full_name": "Inspection Viewer",
        "role": "VIEWER"
    })
    viewer_token = res_viewer.get_json()["access_token"]

    # Create School & Class III-A
    res_school = client.post("/api/schools", headers=admin_headers, json={
        "name": "MCP NITHARI NO 1 BOYS",
        "session_name": "2026-27"
    })
    school_id = res_school.get_json()["school"]["id"]
    session_id = res_school.get_json()["school"]["active_session"]["id"]

    res_class = client.post("/api/classrooms", headers=admin_headers, json={
        "school_id": school_id,
        "session_id": session_id,
        "class_name": "III",
        "section_name": "A"
    })
    class_id = res_class.get_json()["classroom"]["id"]

    return {
        "admin_token": admin_token,
        "teacher_token": teacher_token,
        "viewer_token": viewer_token,
        "school_id": school_id,
        "class_id": class_id
    }

def test_register_and_get_student(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Register Student: NAKSH (Roll No 1)
    res = client.post("/api/students", headers=headers, json={
        "school_id": setup_data["school_id"],
        "class_section_id": setup_data["class_id"],
        "roll_no": 1,
        "student_id": "20220171896",
        "admission_no": "14779",
        "name": "NAKSH",
        "dob": "2018-10-29",
        "father_name": "NARESH",
        "mother_name": "SHEETAL",
        "gender": "BOY",
        "category": "GEN"
    })
    assert res.status_code == 201
    student_id = res.get_json()["student"]["id"]

    # Get student profile
    res_get = client.get(f"/api/students/{student_id}", headers=headers)
    assert res_get.status_code == 200
    st = res_get.get_json()["student"]
    assert st["name"] == "NAKSH"
    assert st["roll_no"] == 1
    assert st["father_name"] == "NARESH"
    assert st["student_id"] == "20220171896"

def test_duplicate_roll_no_in_class_fails(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Register Roll 1
    client.post("/api/students", headers=headers, json={
        "school_id": setup_data["school_id"],
        "class_section_id": setup_data["class_id"],
        "roll_no": 1,
        "name": "FIRST STUDENT"
    })

    # Try registering Roll 1 again in the same class
    res2 = client.post("/api/students", headers=headers, json={
        "school_id": setup_data["school_id"],
        "class_section_id": setup_data["class_id"],
        "roll_no": 1,
        "name": "SECOND STUDENT"
    })
    assert res2.status_code == 409
    assert "already assigned" in res2.get_json()["error"]

def test_student_search_and_stats(client, setup_data):
    headers = {"Authorization": f"Bearer {setup_data['teacher_token']}"}

    # Create two students
    client.post("/api/students", headers=headers, json={
        "school_id": setup_data["school_id"],
        "class_section_id": setup_data["class_id"],
        "roll_no": 1,
        "name": "AADITYA KUMAR",
        "category": "OBC"
    })
    client.post("/api/students", headers=headers, json={
        "school_id": setup_data["school_id"],
        "class_section_id": setup_data["class_id"],
        "roll_no": 2,
        "name": "PRINCE KUMAR",
        "category": "SC"
    })

    # Search for "AADITYA"
    res_search = client.get(f"/api/students?class_section_id={setup_data['class_id']}&search=AADITYA", headers=headers)
    assert res_search.status_code == 200
    data = res_search.get_json()
    assert data["total"] == 1
    assert data["students"][0]["name"] == "AADITYA KUMAR"

    # Check stats
    res_stats = client.get(f"/api/students/stats?class_section_id={setup_data['class_id']}", headers=headers)
    assert res_stats.status_code == 200
    stats = res_stats.get_json()["stats"]
    assert stats["total"] == 2
    assert stats["categories"]["OBC"] == 1
    assert stats["categories"]["SC"] == 1

def test_viewer_cannot_register_student(client, setup_data):
    viewer_headers = {"Authorization": f"Bearer {setup_data['viewer_token']}"}
    res = client.post("/api/students", headers=viewer_headers, json={
        "school_id": setup_data["school_id"],
        "class_section_id": setup_data["class_id"],
        "roll_no": 1,
        "name": "ILLEGAL STUDENT"
    })
    assert res.status_code == 403
