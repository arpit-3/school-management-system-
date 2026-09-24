from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.classroom import ClassSection
from app.models.assessment import Assessment
from app.models.subject import Subject
from app.services.mark_service import MarkService
from app.schemas.mark_schemas import validate_mark_entry_payload, validate_marks_bulk_payload
from app.permissions import teacher_or_admin_required, admin_required

mark_bp = Blueprint("mark", __name__, url_prefix="/api/marks")

@mark_bp.route("/sheet", methods=["GET"])
@jwt_required()
def get_marks_sheet():
    class_id = request.args.get("class_section_id", type=int)
    assessment_id = request.args.get("assessment_id", type=int)
    subject_id = request.args.get("subject_id", type=int)

    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    if not assessment_id:
        a = Assessment.query.filter_by(code="PA1").first()
        assessment_id = a.id if a else 1

    if not subject_id:
        s = Subject.query.filter_by(code="HIN").first()
        subject_id = s.id if s else 1

    try:
        data = MarkService.get_marks_sheet(class_id, assessment_id, subject_id)
        return jsonify({
            "status": "success",
            "data": data
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@mark_bp.route("/entry", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def save_single_mark():
    data = request.get_json() or {}
    
    assessment_id = data.get("assessment_id")
    ass = db.session.get(Assessment, assessment_id) if assessment_id else None
    max_m = ass.max_marks if ass else 100.0

    is_valid, err = validate_mark_entry_payload(data, max_allowed_marks=max_m)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    user_id = get_jwt_identity()
    evaluator_id = int(user_id) if user_id else None

    try:
        rec = MarkService.save_single_mark(data, evaluator_id=evaluator_id)
        return jsonify({
            "message": "Marks saved successfully.",
            "record": rec.to_dict(),
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

@mark_bp.route("/bulk", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def bulk_save_marks():
    data = request.get_json() or {}
    is_valid, err = validate_marks_bulk_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    class_id = data["class_section_id"]
    assessment_id = data["assessment_id"]
    subject_id = data["subject_id"]
    entries = data["entries"]

    user_id = get_jwt_identity()
    evaluator_id = int(user_id) if user_id else None

    try:
        count = MarkService.bulk_save_marks(
            class_section_id=class_id,
            assessment_id=assessment_id,
            subject_id=subject_id,
            entries=entries,
            evaluator_id=evaluator_id
        )
        return jsonify({
            "message": f"Successfully updated marks for {count} students.",
            "updated_count": count,
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

@mark_bp.route("/lock", methods=["POST"])
@jwt_required()
@admin_required
def lock_marks_sheet():
    data = request.get_json() or {}
    class_id = data.get("class_section_id")
    assessment_id = data.get("assessment_id")
    subject_id = data.get("subject_id")
    lock_state = data.get("is_locked", True)

    if not all([class_id, assessment_id, subject_id]):
        return jsonify({"error": "class_section_id, assessment_id, and subject_id are required.", "status": "error"}), 400

    count = MarkService.lock_marks(class_id, assessment_id, subject_id, lock_state=lock_state)
    action = "locked" if lock_state else "unlocked"
    return jsonify({
        "message": f"Marks sheet {action} successfully for {count} records.",
        "status": "success"
    }), 200

@mark_bp.route("/sync-workbook", methods=["POST"])
@jwt_required()
@admin_required
def sync_workbook_marks():
    c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
    if not c:
        return jsonify({"error": "Class III-A not found.", "status": "error"}), 404

    try:
        count = MarkService.seed_marks_from_workbook(class_section_id=c.id)
        return jsonify({
            "message": f"Successfully synchronized {count} marks records from workbook.",
            "synced_count": count,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to sync marks from workbook: {str(e)}", "status": "error"}), 500
