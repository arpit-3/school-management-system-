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
from app.services.calculation_engine import assign_grade, CalculationEngine

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
    # Admin
    res_admin = client.post("/api/auth/register", json={
        "username": "admin_calc_test",
        "email": "admin_calc@test.gov.in",
        "password": "Password123",
        "full_name": "Admin Calc Test",
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

    # Subjects
    res_hin = client.post("/api/subjects", headers=headers, json={"school_id": school_id, "name": "HINDI", "code": "HIN"})
    res_math = client.post("/api/subjects", headers=headers, json={"school_id": school_id, "name": "MATHEMATICS", "code": "MATH"})
    hin_id = res_hin.get_json()["subject"]["id"]
    math_id = res_math.get_json()["subject"]["id"]

    # Assessments (PA1, PA2)
    res_pa1 = client.post("/api/assessments", headers=headers, json={
        "school_id": school_id, "session_id": session_id, "name": "Periodic Assessment 1", "code": "PA1", "assessment_type": "PERIODIC", "max_marks": 20.0
    })
    res_pa2 = client.post("/api/assessments", headers=headers, json={
        "school_id": school_id, "session_id": session_id, "name": "Periodic Assessment 2", "code": "PA2", "assessment_type": "PERIODIC", "max_marks": 20.0
    })
    pa1_id = res_pa1.get_json()["assessment"]["id"]
    pa2_id = res_pa2.get_json()["assessment"]["id"]

    # 2 Students
    res_st1 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 1, "name": "NAKSH"})
    res_st2 = client.post("/api/students", headers=headers, json={"school_id": school_id, "class_section_id": class_id, "roll_no": 2, "name": "NAVEEN"})
    st1_id = res_st1.get_json()["student"]["id"]
    st2_id = res_st2.get_json()["student"]["id"]

    # Marks:
    # Student 1: Hin PA1=18, PA2=16 -> Best=18 (90%), Math PA1=19, PA2=17 -> Best=19 (95%)
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa1_id, "subject_id": hin_id, "marks_obtained": 18.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa2_id, "subject_id": hin_id, "marks_obtained": 16.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa1_id, "subject_id": math_id, "marks_obtained": 19.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st1_id, "assessment_id": pa2_id, "subject_id": math_id, "marks_obtained": 17.0})

    # Student 2: Hin PA1=10, PA2=12, Math PA1=11, PA2=9
    client.post("/api/marks/entry", headers=headers, json={"student_id": st2_id, "assessment_id": pa1_id, "subject_id": hin_id, "marks_obtained": 10.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st2_id, "assessment_id": pa2_id, "subject_id": hin_id, "marks_obtained": 12.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st2_id, "assessment_id": pa1_id, "subject_id": math_id, "marks_obtained": 11.0})
    client.post("/api/marks/entry", headers=headers, json={"student_id": st2_id, "assessment_id": pa2_id, "subject_id": math_id, "marks_obtained": 9.0})

    return {
        "headers": headers,
        "class_id": class_id,
        "st1_id": st1_id,
        "st2_id": st2_id
    }

def test_grade_assignment_logic():
    assert assign_grade(95.5)[0] == "A1"
    assert assign_grade(85.0)[0] == "A2"
    assert assign_grade(75.0)[0] == "B1"
    assert assign_grade(65.0)[0] == "B2"
    assert assign_grade(55.0)[0] == "C1"
    assert assign_grade(45.0)[0] == "C2"
    assert assign_grade(35.0)[0] == "D"
    assert assign_grade(25.0)[0] == "E"
    assert assign_grade(None)[0] == "Ab"

def test_pa_summary_calculation(client, setup_data):
    res = client.get(f"/api/calculations/pa-summary?class_section_id={setup_data['class_id']}", headers=setup_data["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data) == 2

    # Student 1 Hindi Best PA should be 18.0, scaled to 5 = 4.5
    st1 = next(s for s in data if s["student_id"] == setup_data["st1_id"])
    hin = st1["subjects"]["HIN"]
    assert hin["best"] == 18.0
    assert hin["scaled_5"] == 4.5
    assert hin["average"] == 17.0

def test_class_results_and_ranks(client, setup_data):
    res = client.get(f"/api/calculations/class-results?class_section_id={setup_data['class_id']}", headers=setup_data["headers"])
    assert res.status_code == 200
    data = res.get_json()["data"]
    roster = data["roster"]
    stats = data["summary_stats"]

    # Student 1 should be Rank 1
    st1 = next(r for r in roster if r["student_id"] == setup_data["st1_id"])
    st2 = next(r for r in roster if r["student_id"] == setup_data["st2_id"])
    assert st1["rank"] == 1
    assert st2["rank"] == 2
    assert st1["grand_total_obtained"] == 70.0 # 18+16+19+17
    assert st1["overall_percentage"] == 87.5 # 70 / 80
    assert st1["overall_grade"] == "A2"
    assert st1["status"] == "PROMOTED"

    # Stats
    assert stats["total_students"] == 2
    assert stats["promoted_count"] == 2
    assert stats["pass_percentage"] == 100.0
