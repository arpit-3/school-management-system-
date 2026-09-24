import io
import openpyxl
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
def setup_export_data(client):
    # Admin
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_exp_test",
        "email": "admin_exp@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Export Test",
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

    # Subject Hindi & Maths
    res_hin = client.post("/api/subjects", headers=headers, json={"school_id": school_id, "name": "HINDI", "code": "HIN"})
    res_math = client.post("/api/subjects", headers=headers, json={"school_id": school_id, "name": "MATHEMATICS", "code": "MATH"})
    hin_id = res_hin.get_json()["subject"]["id"]
    math_id = res_math.get_json()["subject"]["id"]

    # Assessment PA1
    res_pa1 = client.post("/api/assessments", headers=headers, json={
        "school_id": school_id, "session_id": session_id, "name": "PA 1", "code": "PA1", "assessment_type": "PERIODIC", "max_marks": 20.0
    })
    pa1_id = res_pa1.get_json()["assessment"]["id"]

    # 2 Students
    res_st1 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 1, "name": "NAKSH"})
    res_st2 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 2, "name": "NAVEEN"})
    st1_id = res_st1.get_json()["student"]["id"]
    st2_id = res_st2.get_json()["student"]["id"]

    # Marks & Attendance
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa1_id, "subject_id": hin_id, "marks_obtained": 18.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa1_id, "subject_id": math_id, "marks_obtained": 19.0})
    client.post("/api/attendance/entry", headers=headers, json={"student_id": st1_id, "working_days": 110, "present_days": 100})

    return {
        "headers": headers,
        "token": token,
        "class_id": class_id
    }

def test_export_unauthorized_fails(client):
    res = client.get("/api/export/workbook")
    assert res.status_code == 401

def test_export_full_workbook_structure_and_formulas(client, setup_export_data):
    res = client.get(f"/api/export/workbook?class_section_id={setup_export_data['class_id']}", headers=setup_export_data["headers"])
    if res.status_code != 200:
        print("EXPORT ERROR:", res.get_json())
    assert res.status_code == 200
    assert "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" in res.content_type

    # Load in-memory workbook to verify contents and formulas
    wb = openpyxl.load_workbook(io.BytesIO(res.data), data_only=False)
    sheet_names = wb.sheetnames

    # Check 6 sheets are present
    assert "ENTRY" in sheet_names
    assert "STUDENT" in sheet_names
    assert "PASHEET" in sheet_names
    assert "FLN" in sheet_names
    assert "ATTENDANCE" in sheet_names
    assert "BROADSHEET" in sheet_names

    # Check formula preservation
    ws_marks = wb["PASHEET"]
    # In row 2, total should be a formula =SUM(D2:E2)
    assert str(ws_marks["F2"].value).startswith("=SUM(")
    assert str(ws_marks["G2"].value).startswith("=AVERAGE(")

    # Check attendance formulas
    ws_att = wb["ATTENDANCE"]
    assert str(ws_att["F2"].value).startswith("=D2-E2")
    assert str(ws_att["G2"].value).startswith("=(")
    assert str(ws_att["H2"].value).startswith("=IF(")

    # Check broadsheet formulas
    ws_broad = wb["BROADSHEET"]
    assert str(ws_broad["F2"].value).startswith("=SUM(")
    assert str(ws_broad["H2"].value).startswith("=IF(")
    assert str(ws_broad["I2"].value).startswith("=RANK(")
