import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.academic_session import AcademicSession

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
def superadmin_token(client):
    res = client.post("/api/auth/register", json={
        "username": "superadmin_test",
        "email": "superadmin@test.gov.in",
        "password": "Password123",
        "full_name": "Super Admin Test",
        "role": "SUPER_ADMIN"
    })
    return res.get_json()["access_token"]

@pytest.fixture
def teacher_token(client):
    res = client.post("/api/auth/register", json={
        "username": "teacher_test",
        "email": "teacher@test.gov.in",
        "password": "Password123",
        "full_name": "Teacher Test",
        "role": "TEACHER"
    })
    return res.get_json()["access_token"]

def test_create_and_get_school(client, superadmin_token):
    headers = {"Authorization": f"Bearer {superadmin_token}"}
    
    # Create school
    create_res = client.post("/api/schools", headers=headers, json={
        "name": "MCP NITHARI NO 1 BOYS",
        "code": "20",
        "udise_id": "07020102001",
        "zone": "ROHINI ZONE",
        "principal_name": "SHAMBHU DAYAL MEENA",
        "principal_phone": "9876543210",
        "session_name": "2026-27"
    })
    assert create_res.status_code == 201
    school_id = create_res.get_json()["school"]["id"]

    # Get school
    get_res = client.get(f"/api/schools/{school_id}", headers=headers)
    assert get_res.status_code == 200
    data = get_res.get_json()
    assert data["school"]["name"] == "MCP NITHARI NO 1 BOYS"
    assert data["school"]["principal_name"] == "SHAMBHU DAYAL MEENA"
    assert len(data["sessions"]) == 1
    assert data["sessions"][0]["session_name"] == "2026-27"

def test_teacher_cannot_create_school(client, teacher_token):
    headers = {"Authorization": f"Bearer {teacher_token}"}
    res = client.post("/api/schools", headers=headers, json={
        "name": "Unauthorized School"
    })
    assert res.status_code == 403
    assert "Forbidden" in res.get_json()["error"]

def test_update_school(client, superadmin_token):
    headers = {"Authorization": f"Bearer {superadmin_token}"}
    
    # Create
    create_res = client.post("/api/schools", headers=headers, json={
        "name": "Initial Name",
        "code": "101",
        "zone": "ZONE A"
    })
    school_id = create_res.get_json()["school"]["id"]

    # Update
    update_res = client.put(f"/api/schools/{school_id}", headers=headers, json={
        "name": "Updated School Name",
        "principal_name": "New Principal",
        "zone": "ZONE B"
    })
    assert update_res.status_code == 200
    updated = update_res.get_json()["school"]
    assert updated["name"] == "Updated School Name"
    assert updated["principal_name"] == "New Principal"
    assert updated["zone"] == "ZONE B"

def test_add_and_activate_session(client, superadmin_token):
    headers = {"Authorization": f"Bearer {superadmin_token}"}
    
    # Create school
    create_res = client.post("/api/schools", headers=headers, json={
        "name": "Session Test School",
        "session_name": "2025-26"
    })
    school_id = create_res.get_json()["school"]["id"]

    # Add new session 2026-27
    add_res = client.post(f"/api/schools/{school_id}/sessions", headers=headers, json={
        "session_name": "2026-27",
        "is_active": True
    })
    assert add_res.status_code == 201
    new_session_id = add_res.get_json()["session"]["id"]

    # Verify session list
    list_res = client.get(f"/api/schools/{school_id}/sessions", headers=headers)
    assert list_res.status_code == 200
    sessions = list_res.get_json()["sessions"]
    assert len(sessions) == 2

    # Check that 2026-27 is active and 2025-26 is inactive
    for s in sessions:
        if s["id"] == new_session_id:
            assert s["is_active"] is True
        else:
            assert s["is_active"] is False

def test_current_school_fallback(client, teacher_token, superadmin_token):
    admin_headers = {"Authorization": f"Bearer {superadmin_token}"}
    teacher_headers = {"Authorization": f"Bearer {teacher_token}"}
    
    # Seed a school
    client.post("/api/schools", headers=admin_headers, json={
        "name": "Primary School MCD",
        "code": "202601"
    })

    # Teacher accesses current school
    res = client.get("/api/schools/current", headers=teacher_headers)
    assert res.status_code == 200
    assert res.get_json()["school"]["name"] == "Primary School MCD"
