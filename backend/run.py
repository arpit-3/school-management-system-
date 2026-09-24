import os
import sys
import datetime
from app import create_app
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.academic_session import AcademicSession
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.class_subject_teacher import ClassSubjectTeacher
from app.models.student import Student
from app.models.assessment import Assessment, AssessmentTypeEnum
from app.models.fln_record import FLNRecord
from app.models.mark import StudentMark
from app.models.attendance import StudentAttendance
from app.utils.student_importer import parse_students_from_excel
from app.services.assessment_service import AssessmentService
from app.services.fln_service import FLNService
from app.services.mark_service import MarkService
from app.services.attendance_service import AttendanceService

env = os.getenv("FLASK_ENV", "development")
app = create_app(env)

def run_init_db():
    with app.app_context():
        db.create_all()
        print("Database tables created successfully.")

def run_seed_users():
    with app.app_context():
        db.create_all()
        
        # 1. Seed School from ENTRY sheet
        school = School.query.filter_by(name="MCP NITHARI NO 1 BOYS").first()
        if not school:
            school = School(
                name="MCP NITHARI NO 1 BOYS",
                code="20",
                udise_id="07020102001",
                corporation_name="MUNICIPAL CORPORATION OF DELHI",
                corporation_short_name="MCD",
                department_name="EDUCATION DEPARTMENT",
                zone="ROHINI ZONE",
                ward_number="40",
                state="NEW DELHI",
                address="MCP Nithari, Rohini Zone, Delhi",
                principal_name="SHAMBHU DAYAL MEENA",
                principal_phone="9876543210",
                mentor_name="DEVENDER SINGH",
                total_school_students=1156,
                is_active=True
            )
            db.session.add(school)
            db.session.flush()
            print(f"Created default school: {school.name} (Code: {school.code})")
        else:
            print(f"School already exists: {school.name}")

        # 2. Seed Academic Session 2026-27
        session = AcademicSession.query.filter_by(school_id=school.id, session_name="2026-27").first()
        if not session:
            session = AcademicSession(
                school_id=school.id,
                session_name="2026-27",
                start_date=datetime.date(2026, 4, 1),
                end_date=datetime.date(2027, 3, 31),
                result_date=datetime.date(2026, 3, 21),
                is_active=True
            )
            db.session.add(session)
            db.session.flush()
            print(f"Created active academic session: {session.session_name}")
        else:
            print(f"Session already exists: {session.session_name}")

        users_data = [
            {
                "username": "superadmin",
                "email": "superadmin@delhi.gov.in",
                "password": "SuperAdmin@123",
                "full_name": "System Super Administrator",
                "role": RoleEnum.SUPER_ADMIN,
                "designation": "State Education Coordinator",
                "school_id": None
            },
            {
                "username": "hos_shambhu",
                "email": "hos@mcpnithari.edu.in",
                "password": "Hos@12345",
                "full_name": "SHAMBHU DAYAL MEENA",
                "role": RoleEnum.SCHOOL_ADMIN,
                "designation": "Principal / HOS",
                "phone_number": "9876543210",
                "employee_id": "HOS-1452367",
                "school_id": school.id
            },
            {
                "username": "teacher_indrajeet",
                "email": "indrajeet@mcpnithari.edu.in",
                "password": "Teacher@12345",
                "full_name": "INDRAJEET",
                "role": RoleEnum.TEACHER,
                "designation": "Class Teacher (III-A)",
                "phone_number": "9958606952",
                "employee_id": "95032137",
                "school_id": school.id
            },
            {
                "username": "evaluator_viewer",
                "email": "viewer@delhi.gov.in",
                "password": "Viewer@12345",
                "full_name": "Academic Inspection Officer",
                "role": RoleEnum.VIEWER,
                "designation": "Inspection Officer",
                "school_id": school.id
            }
        ]
        
        for u in users_data:
            existing = User.query.filter((User.username == u["username"]) | (User.email == u["email"])).first()
            if not existing:
                user = User(
                    username=u["username"],
                    email=u["email"],
                    full_name=u["full_name"],
                    role=u["role"],
                    designation=u.get("designation"),
                    phone_number=u.get("phone_number"),
                    employee_id=u.get("employee_id"),
                    school_id=u.get("school_id")
                )
                user.set_password(u["password"])
                db.session.add(user)
                print(f"Created user: {u['username']} ({u['role']})")
            else:
                if u.get("school_id") and not existing.school_id:
                    existing.school_id = u["school_id"]
                print(f"User already exists: {u['username']}")

        db.session.commit()

        # 3. Seed Primary Subjects
        subjects_data = [
            {"name": "HINDI", "code": "HIN", "is_fln_subject": True},
            {"name": "MATHEMATICS", "code": "MATH", "is_fln_subject": True},
            {"name": "ENGLISH", "code": "ENG", "is_fln_subject": True},
            {"name": "ENVIRONMENTAL STUDIES", "code": "EVS", "is_fln_subject": False},
        ]
        created_subjects = {}
        for s in subjects_data:
            subj = Subject.query.filter_by(school_id=school.id, code=s["code"]).first()
            if not subj:
                subj = Subject(
                    school_id=school.id,
                    name=s["name"],
                    code=s["code"],
                    is_fln_subject=s["is_fln_subject"],
                    max_pa_marks=20.0,
                    max_term_marks=50.0,
                    is_active=True
                )
                db.session.add(subj)
                db.session.flush()
                print(f"Created subject: {subj.name} ({subj.code})")
            created_subjects[s["code"]] = subj

        # 4. Seed Primary Classes (I to V)
        teacher_ind = User.query.filter_by(username="teacher_indrajeet").first()
        primary_classes = ["I", "II", "III", "IV", "V"]
        for c_name in primary_classes:
            c_sec = ClassSection.query.filter_by(
                school_id=school.id,
                session_id=session.id,
                class_name=c_name,
                section_name="A"
            ).first()
            if not c_sec:
                c_sec = ClassSection(
                    school_id=school.id,
                    session_id=session.id,
                    class_name=c_name,
                    section_name="A",
                    display_name=f"Class {c_name}-A",
                    category="BOYS",
                    class_teacher_id=teacher_ind.id if c_name == "III" and teacher_ind else None,
                    total_students=39 if c_name == "III" else 35,
                    is_active=True
                )
                db.session.add(c_sec)
                db.session.flush()
                print(f"Created class section: {c_sec.display_name}")

            # If Class III-A, allocate Teacher Indrajeet to Hindi, Maths, English
            if c_name == "III" and teacher_ind:
                for s_code in ["HIN", "MATH", "ENG"]:
                    if s_code in created_subjects:
                        alloc = ClassSubjectTeacher.query.filter_by(
                            class_section_id=c_sec.id,
                            subject_id=created_subjects[s_code].id
                        ).first()
                        if not alloc:
                            alloc = ClassSubjectTeacher(
                                class_section_id=c_sec.id,
                                subject_id=created_subjects[s_code].id,
                                teacher_id=teacher_ind.id
                            )
        db.session.commit()

        # 5. Seed Students for Class III-A from Workbook STUDENT sheet
        class_3a = ClassSection.query.filter_by(school_id=school.id, session_id=session.id, class_name="III", section_name="A").first()
        if class_3a:
            template_path = r"A:\fln xml system\templates_storage\FLN_TEMPLATE.xlsx"
            if not os.path.exists(template_path):
                template_path = r"A:\fln xml system\FLN III-A 2026-27 (1).xlsx"
            if os.path.exists(template_path):
                student_records = parse_students_from_excel(template_path, school_id=school.id, class_section_id=class_3a.id)
                added = 0
                for r in student_records:
                    existing = Student.query.filter_by(class_section_id=class_3a.id, roll_no=r["roll_no"]).first()
                    if not existing:
                        st = Student(**r)
                        db.session.add(st)
                        added += 1
                class_3a.total_students = len(student_records)
                db.session.commit()
        # 6. Seed Assessments for 2026-27
        ass_count = AssessmentService.seed_default_assessments(school_id=school.id, session_id=session.id)
        total_ass = Assessment.query.filter_by(school_id=school.id, session_id=session.id).count()
        print(f"Configured {ass_count} new assessments (Total: {total_ass})")

        # 7. Seed FLN Baseline Records for Class III-A
        fln_base = Assessment.query.filter_by(school_id=school.id, session_id=session.id, code="FLN_BASELINE").first()
        if class_3a and fln_base:
            try:
                fln_synced = FLNService.seed_fln_from_workbook(class_section_id=class_3a.id, assessment_id=fln_base.id)
                print(f"Ingested {fln_synced} FLN baseline records from FLN sheet for {class_3a.display_name}")
            except Exception as fe:
                print(f"Notice during FLN seeding: {fe}")

        # 8. Seed PA-1 Marks from PASHEET
        if class_3a:
            try:
                marks_synced = MarkService.seed_marks_from_workbook(class_section_id=class_3a.id)
                print(f"Ingested {marks_synced} PA-1 marks from PASHEET for {class_3a.display_name}")
            except Exception as me:
                print(f"Notice during marks seeding: {me}")

        # 9. Seed Attendance from PASHEET
        if class_3a:
            try:
                att_synced = AttendanceService.seed_attendance_from_workbook(class_section_id=class_3a.id)
                print(f"Ingested {att_synced} attendance records from PASHEET for {class_3a.display_name}")
            except Exception as ae:
                print(f"Notice during attendance seeding: {ae}")

        print("Seeding completed successfully.")

@app.cli.command("init-db")
def init_db_cli():
    run_init_db()

@app.cli.command("seed-users")
def seed_users_cli():
    run_seed_users()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        cmd = sys.argv[1].lower()
        if cmd in ["init-db", "initdb"]:
            run_init_db()
            sys.exit(0)
        elif cmd in ["seed-users", "seed"]:
            run_seed_users()
            sys.exit(0)
        elif cmd in ["init-and-seed", "setup"]:
            run_init_db()
            run_seed_users()
            sys.exit(0)
    
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
