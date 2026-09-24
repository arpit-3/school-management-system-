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
def setup_report_data(client):
    # Admin
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_rep_test",
        "email": "admin_rep@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Report Test",
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

    # Assessment PA1
    res_pa1 = client.post("/api/assessments", headers=headers, json={
        "school_id": school_id, "session_id": session_id, "name": "PA 1", "code": "PA1", "assessment_type": "PERIODIC", "max_marks": 20.0
    })
    pa1_id = res_pa1.get_json()["assessment"]["id"]

    # Student
    res_st1 = client.post("/api/students", headers=headers, json={
        "school_id": school_id, "class_section_id": class_id, "roll_no": 1, "name": "NAKSH", "admission_no": "SR1001"
    })
    st1_id = res_st1.get_json()["student"]["id"]

    # Mark & Attendance
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa1_id, "subject_id": sub_id, "marks_obtained": 18.0})
    client.post("/api/attendance/entry", headers=headers, json={"student_id": st1_id, "working_days": 110, "present_days": 98})

    return {
        "headers": headers,
        "school_id": school_id,
        "class_id": class_id,
        "st1_id": st1_id
    }

def test_student_report_card(client, setup_report_data):
    res = client.get(f"/api/reports/report-card/{setup_report_data['st1_id']}", headers=setup_report_data["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]

    # School & Student metadata
    assert data["school"]["name"] == "MCP NITHARI NO 1 BOYS"
    assert data["student"]["name"] == "NAKSH"
    assert data["student"]["roll_no"] == 1
    assert data["student"]["admission_no"] == "SR1001"

    # Evaluation
    eval_data = data["academic_evaluation"]
    assert eval_data["grand_total_obtained"] == 18.0
    assert eval_data["overall_percentage"] == 90.0
    assert eval_data["overall_grade"] == "A2"
    assert eval_data["rank"] == 1

    # Attendance
    assert data["attendance"]["percentage"] == 89.1
    assert data["attendance"]["is_low_attendance"] is False
    assert len(data["teacher_remarks"]) > 10

def test_class_broadsheet(client, setup_report_data):
    res = client.get(f"/api/reports/class-broadsheet?class_section_id={setup_report_data['class_id']}", headers=setup_report_data["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]

    assert "classroom" in data
    assert "roster" in data
    assert len(data["roster"]) == 1
    assert data["roster"][0]["name"] == "NAKSH"

def test_school_summary(client, setup_report_data):
    res = client.get(f"/api/reports/school-summary?school_id={setup_report_data['school_id']}", headers=setup_report_data["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]

    assert "school" in data
    assert "metrics" in data
    assert data["metrics"]["total_classes"] >= 1
    assert data["metrics"]["total_students"] >= 1
