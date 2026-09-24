import os
import uuid
import base64
from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.utils import secure_filename
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.student import Student
from app.models.student_test_copy import StudentTestCopy
from app.models.assessment import Assessment
from app.models.subject import Subject
from app.models.mark import StudentMark
from app.models.fln_record import FLNRecord
from app.models.attendance import StudentAttendance
from app.services.student_service import StudentService
from app.services.ai_analytics_service import AIAnalyticsService
from app.schemas.student_schemas import validate_student_payload
from app.permissions import teacher_or_admin_required, admin_required

student_bp = Blueprint("student", __name__, url_prefix="/api/students")

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
PHOTOS_DIR = os.path.join(UPLOAD_DIR, "photos")
TEST_COPIES_DIR = os.path.join(UPLOAD_DIR, "test_copies")

os.makedirs(PHOTOS_DIR, exist_ok=True)
os.makedirs(TEST_COPIES_DIR, exist_ok=True)

ALLOWED_PHOTO_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
ALLOWED_DOC_EXTS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}

@student_bp.route("", methods=["GET"])
@jwt_required()
def list_students():
    class_id = request.args.get("class_section_id", type=int)
    school_id = request.args.get("school_id", type=int)
    search = request.args.get("search")
    category = request.args.get("category")
    status = request.args.get("status", "ACTIVE")
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)

    pagination = StudentService.get_students(
        class_section_id=class_id,
        school_id=school_id,
        search=search,
        category=category,
        status=status,
        page=page,
        per_page=per_page
    )

    return jsonify({
        "status": "success",
        "total": pagination.total,
        "page": pagination.page,
        "pages": pagination.pages,
        "per_page": pagination.per_page,
        "students": [s.to_dict() for s in pagination.items]
    }), 200

@student_bp.route("/stats", methods=["GET"])
@jwt_required()
def student_stats():
    school_id = request.args.get("school_id", type=int)
    class_id = request.args.get("class_section_id", type=int)
    stats = StudentService.get_stats(school_id=school_id, class_section_id=class_id)
    return jsonify({
        "status": "success",
        "stats": stats
    }), 200

@student_bp.route("/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student(student_id):
    student = StudentService.get_student_by_id(student_id)
    if not student:
        return jsonify({"error": "Student not found.", "status": "error"}), 404

    return jsonify({
        "status": "success",
        "student": student.to_dict()
    }), 200

@student_bp.route("/<int:student_id>/full-dossier", methods=["GET"])
@jwt_required()
def get_student_full_dossier(student_id):
    student = StudentService.get_student_by_id(student_id)
    if not student:
        return jsonify({"error": "Student not found.", "status": "error"}), 404

    # Marks details
    marks = StudentMark.query.filter_by(student_id=student_id).all()
    marks_list = [m.to_dict() for m in marks]

    # FLN details
    fln_records = FLNRecord.query.filter_by(student_id=student_id).all()
    fln_list = [f.to_dict() for f in fln_records]

    # Attendance details
    attendances = StudentAttendance.query.filter_by(student_id=student_id).all()
    att_list = [a.to_dict() for a in attendances]

    # Test Copies
    test_copies = StudentTestCopy.query.filter_by(student_id=student_id).order_by(StudentTestCopy.uploaded_at.desc()).all()
    copies_list = [c.to_dict() for c in test_copies]

    # AI Insights
    try:
        insights = AIAnalyticsService.get_student_insights(student_id)
    except Exception:
        insights = None

    return jsonify({
        "status": "success",
        "student": student.to_dict(),
        "marks": marks_list,
        "fln_records": fln_list,
        "attendances": att_list,
        "test_copies": copies_list,
        "ai_insights": insights
    }), 200

@student_bp.route("/<int:student_id>/photo", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def upload_student_photo(student_id):
    student = StudentService.get_student_by_id(student_id)
    if not student:
        return jsonify({"error": "Student not found.", "status": "error"}), 404

    # 1. Handle multipart file upload
    if "photo" in request.files:
        file = request.files["photo"]
        if file and file.filename:
            ext = os.path.splitext(file.filename)[1].lower()
            if ext not in ALLOWED_PHOTO_EXTS:
                return jsonify({"error": "Invalid image format. Allowed: JPG, PNG, WebP.", "status": "error"}), 400
            
            filename = f"student_{student_id}_{uuid.uuid4().hex[:8]}{ext}"
            filepath = os.path.join(PHOTOS_DIR, filename)
            file.save(filepath)
            
            student.photo_url = f"/api/students/photo/file/{filename}"
            db.session.commit()

            return jsonify({
                "message": "Student photo updated successfully.",
                "photo_url": student.photo_url,
                "status": "success"
            }), 200

    # 2. Handle base64 / URL JSON payload
    data = request.get_json() or {}
    if "photo_base64" in data:
        raw_b64 = data["photo_base64"]
        if "," in raw_b64:
            header, raw_b64 = raw_b64.split(",", 1)
            ext = ".png" if "png" in header else ".jpg"
        else:
            ext = ".jpg"

        try:
            img_bytes = base64.b64decode(raw_b64)
            filename = f"student_{student_id}_{uuid.uuid4().hex[:8]}{ext}"
            filepath = os.path.join(PHOTOS_DIR, filename)
            with open(filepath, "wb") as f:
                f.write(img_bytes)

            student.photo_url = f"/api/students/photo/file/{filename}"
            db.session.commit()

            return jsonify({
                "message": "Student photo updated successfully.",
                "photo_url": student.photo_url,
                "status": "success"
            }), 200
        except Exception as e:
            return jsonify({"error": f"Failed to process image data: {str(e)}", "status": "error"}), 400

    if "photo_url" in data:
        student.photo_url = data["photo_url"]
        db.session.commit()
        return jsonify({
            "message": "Student photo updated successfully.",
            "photo_url": student.photo_url,
            "status": "success"
        }), 200

    return jsonify({"error": "No image file or photo data provided.", "status": "error"}), 400

@student_bp.route("/photo/file/<filename>", methods=["GET"])
def get_photo_file(filename):
    clean_filename = secure_filename(filename)
    filepath = os.path.join(PHOTOS_DIR, clean_filename)
    if not os.path.exists(filepath):
        return jsonify({"error": "Photo not found."}), 404
    return send_file(filepath)

# Test Copies Management
@student_bp.route("/<int:student_id>/test-copies", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def upload_test_copy(student_id):
    student = StudentService.get_student_by_id(student_id)
    if not student:
        return jsonify({"error": "Student not found.", "status": "error"}), 404

    user_id = get_jwt_identity()
    teacher_id = int(user_id) if user_id and user_id.isdigit() else None

    title = request.form.get("title", "").strip()
    assessment_id = request.form.get("assessment_id", type=int)
    subject_id = request.form.get("subject_id", type=int)
    marks_awarded = request.form.get("marks_awarded", type=float)
    notes = request.form.get("notes", "").strip()

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded in form field 'file'.", "status": "error"}), 400

    file = request.files["file"]
    if not file or not file.filename:
        return jsonify({"error": "Please select a valid test copy document (PDF, PNG, JPG).", "status": "error"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_DOC_EXTS:
        return jsonify({"error": f"Invalid format '{ext}'. Allowed formats: PDF, PNG, JPG, WebP.", "status": "error"}), 400

    unique_filename = f"copy_{student_id}_{uuid.uuid4().hex[:10]}{ext}"
    filepath = os.path.join(TEST_COPIES_DIR, unique_filename)
    file.save(filepath)

    file_size = os.path.getsize(filepath) if os.path.exists(filepath) else 0

    if not title:
        sub_name = Subject.query.get(subject_id).name if subject_id else "Assessment"
        title = f"{sub_name} Test Copy"

    test_copy = StudentTestCopy(
        student_id=student_id,
        assessment_id=assessment_id,
        subject_id=subject_id,
        teacher_id=teacher_id,
        title=title,
        file_name=file.filename,
        file_path=unique_filename,
        file_type=file.content_type or ("application/pdf" if ext == ".pdf" else "image/jpeg"),
        file_size=file_size,
        marks_awarded=marks_awarded,
        notes=notes
    )
    db.session.add(test_copy)
    db.session.commit()

    return jsonify({
        "message": "Test copy uploaded successfully.",
        "test_copy": test_copy.to_dict(),
        "status": "success"
    }), 201

@student_bp.route("/<int:student_id>/test-copies", methods=["GET"])
@jwt_required()
def list_student_test_copies(student_id):
    student = StudentService.get_student_by_id(student_id)
    if not student:
        return jsonify({"error": "Student not found.", "status": "error"}), 404

    copies = StudentTestCopy.query.filter_by(student_id=student_id).order_by(StudentTestCopy.uploaded_at.desc()).all()
    return jsonify({
        "status": "success",
        "student_id": student_id,
        "student_name": student.name,
        "test_copies": [c.to_dict() for c in copies]
    }), 200

@student_bp.route("/test-copies/file/<int:copy_id>", methods=["GET"])
def get_test_copy_file(copy_id):
    test_copy = StudentTestCopy.query.get(copy_id)
    if not test_copy:
        return jsonify({"error": "Test copy document not found."}), 404

    filepath = os.path.join(TEST_COPIES_DIR, test_copy.file_path)
    if not os.path.exists(filepath):
        return jsonify({"error": "File not found on server storage."}), 404

    return send_file(filepath, download_name=test_copy.file_name)

@student_bp.route("/test-copies/<int:copy_id>", methods=["DELETE"])
@jwt_required()
@teacher_or_admin_required
def delete_test_copy(copy_id):
    test_copy = StudentTestCopy.query.get(copy_id)
    if not test_copy:
        return jsonify({"error": "Test copy not found.", "status": "error"}), 404

    filepath = os.path.join(TEST_COPIES_DIR, test_copy.file_path)
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except OSError:
            pass

    db.session.delete(test_copy)
    db.session.commit()
    return jsonify({"message": "Test copy deleted successfully.", "status": "success"}), 200

@student_bp.route("", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def create_student():
    data = request.get_json() or {}
    is_valid, err = validate_student_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    if not data.get("school_id"):
        classroom = db.session.get(ClassSection, data["class_section_id"])
        if classroom:
            data["school_id"] = classroom.school_id
        else:
            primary_school = School.query.filter_by(is_active=True).first()
            data["school_id"] = primary_school.id if primary_school else 1

    try:
        student = StudentService.create_student(data)
        return jsonify({
            "message": f"Student '{student.name}' registered successfully with Roll No. {student.roll_no}.",
            "student": student.to_dict(),
            "status": "success"
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@student_bp.route("/<int:student_id>", methods=["PUT"])
@jwt_required()
@teacher_or_admin_required
def update_student(student_id):
    data = request.get_json() or {}
    is_valid, err = validate_student_payload(data, is_update=True)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        student = StudentService.update_student(student_id, data)
        if not student:
            return jsonify({"error": "Student not found.", "status": "error"}), 404
        return jsonify({
            "message": f"Student '{student.name}' updated successfully.",
            "student": student.to_dict(),
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@student_bp.route("/<int:student_id>", methods=["DELETE"])
@jwt_required()
@teacher_or_admin_required
def delete_student(student_id):
    success = StudentService.delete_student(student_id)
    if not success:
        return jsonify({"error": "Student not found.", "status": "error"}), 404
    return jsonify({"message": "Student deleted successfully.", "status": "success"}), 200

@student_bp.route("/import", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def import_students_file():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded in form field 'file'.", "status": "error"}), 400

    file = request.files["file"]
    if not file or not file.filename.lower().endswith((".xlsx", ".xls")):
        return jsonify({"error": "Invalid file. Please upload an Excel workbook (.xlsx).", "status": "error"}), 400

    class_section_id = request.form.get("class_section_id", type=int)
    if not class_section_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_section_id = c.id if c else 1

    classroom = db.session.get(ClassSection, class_section_id)
    school_id = classroom.school_id if classroom else 1

    try:
        res = StudentService.import_students(file.read(), school_id=school_id, class_section_id=class_section_id)
        return jsonify({
            "message": f"Successfully processed {res['total']} students (Imported: {res['imported']}, Updated: {res['updated']}).",
            "result": res,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to import Excel: {str(e)}", "status": "error"}), 400

@student_bp.route("/sync-workbook", methods=["POST"])
@jwt_required()
@admin_required
def sync_workbook_students():
    template_path = r"A:\fln xml system\templates_storage\FLN_TEMPLATE.xlsx"
    if not os.path.exists(template_path):
        template_path = r"A:\fln xml system\FLN III-A 2026-27 (1).xlsx"

    if not os.path.exists(template_path):
        return jsonify({"error": "Workbook file not found on server.", "status": "error"}), 404

    c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
    if not c:
        return jsonify({"error": "Class III-A not found.", "status": "error"}), 404

    try:
        res = StudentService.import_students(template_path, school_id=c.school_id, class_section_id=c.id)
        return jsonify({
            "message": f"Successfully synchronized {res['total']} students from Excel workbook.",
            "result": res,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to sync workbook: {str(e)}", "status": "error"}), 500
