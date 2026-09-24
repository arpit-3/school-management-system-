import pytest
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum

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

def test_user_password_hashing(app):
    with app.app_context():
        user = User(username="testuser", email="test@school.edu", full_name="Test User", role=RoleEnum.TEACHER)
        user.set_password("Secret123")
        db.session.add(user)
        db.session.commit()

        assert user.check_password("Secret123") is True
        assert user.check_password("WrongPassword") is False
        assert user.password_hash != "Secret123"

def test_register_user(client):
    res = client.post("/api/auth/register", json={
        "username": "teacher1",
        "email": "teacher1@mcp.edu.in",
        "password": "Password123",
        "full_name": "Teacher One",
        "role": "TEACHER",
        "employee_id": "BMID1234",
        "phone_number": "9999988888"
    })
    assert res.status_code == 201
    data = res.get_json()
    assert data["status"] == "success"
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["username"] == "teacher1"
    assert data["user"]["role"] == "TEACHER"

def test_duplicate_registration_fails(client):
    payload = {
        "username": "uniqueuser",
        "email": "unique@mcp.edu.in",
        "password": "Password123",
        "full_name": "Unique User"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 409
    assert "already taken" in res2.get_json()["error"]

def test_login_success_and_profile(client):
    # Register first
    client.post("/api/auth/register", json={
        "username": "logintest",
        "email": "login@mcp.edu.in",
        "password": "Password123",
        "full_name": "Login Test User"
    })

    # Login
    login_res = client.post("/api/auth/login", json={
        "username": "logintest",
        "password": "Password123"
    })
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    # Access /api/auth/me
    headers = {"Authorization": f"Bearer {access_token}"}
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.get_json()
    assert me_data["user"]["username"] == "logintest"

    # Refresh token
    refresh_headers = {"Authorization": f"Bearer {refresh_token}"}
    refresh_res = client.post("/api/auth/refresh", headers=refresh_headers)
    assert refresh_res.status_code == 200
    assert "access_token" in refresh_res.get_json()

def test_login_invalid_credentials(client):
    res = client.post("/api/auth/login", json={
        "username": "nonexistent",
        "password": "badpassword"
    })
    assert res.status_code == 401
    assert "Invalid username" in res.get_json()["error"]

def test_change_password(client):
    # Register
    reg_res = client.post("/api/auth/register", json={
        "username": "pwdchange",
        "email": "pwd@mcp.edu.in",
        "password": "OldPassword123",
        "full_name": "Password Changer"
    })
    token = reg_res.get_json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Change password
    chg_res = client.put("/api/auth/change-password", headers=headers, json={
        "old_password": "OldPassword123",
        "new_password": "NewPassword123"
    })
    assert chg_res.status_code == 200

    # Test login with old password fails
    fail_login = client.post("/api/auth/login", json={
        "username": "pwdchange",
        "password": "OldPassword123"
    })
    assert fail_login.status_code == 401

    # Test login with new password succeeds
    ok_login = client.post("/api/auth/login", json={
        "username": "pwdchange",
        "password": "NewPassword123"
    })
    assert ok_login.status_code == 200
