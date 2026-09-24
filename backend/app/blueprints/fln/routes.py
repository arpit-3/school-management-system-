from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.classroom import ClassSection
from app.models.assessment import Assessment
from app.services.fln_service import FLNService
from app.schemas.fln_schemas import validate_fln_entry_payload, validate_fln_bulk_payload
from app.permissions import teacher_or_admin_required, admin_required

fln_bp = Blueprint("fln", __name__, url_prefix="/api/fln")

@fln_bp.route("/matrix", methods=["GET"])
@jwt_required()
def get_fln_matrix():
    class_id = request.args.get("class_section_id", type=int)
    assessment_id = request.args.get("assessment_id", type=int)

    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    if not assessment_id:
        a = Assessment.query.filter_by(code="FLN_BASELINE").first()
        if not a:
            a = Assessment.query.filter_by(assessment_type="FLN").first()
        assessment_id = a.id if a else 1

    try:
        matrix_data = FLNService.get_matrix(class_section_id=class_id, assessment_id=assessment_id)
        return jsonify({
            "status": "success",
            "data": matrix_data
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@fln_bp.route("/entry", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def save_single_entry():
    data = request.get_json() or {}
    is_valid, err = validate_fln_entry_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    user_id = get_jwt_identity()
    evaluator_id = int(user_id) if user_id else None

    try:
        rec = FLNService.save_record(data, evaluator_id=evaluator_id)
        return jsonify({
            "message": "FLN level recorded successfully.",
            "record": rec.to_dict(),
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

@fln_bp.route("/matrix", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def bulk_save_matrix():
    data = request.get_json() or {}
    is_valid, err = validate_fln_bulk_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    class_id = data["class_section_id"]
    assessment_id = data["assessment_id"]
    entries = data["entries"]

    user_id = get_jwt_identity()
    evaluator_id = int(user_id) if user_id else None

    try:
        count = FLNService.bulk_save_matrix(
            class_section_id=class_id,
            assessment_id=assessment_id,
            entries=entries,
            evaluator_id=evaluator_id
        )
        return jsonify({
            "message": f"Successfully updated {count} FLN records.",
            "updated_count": count,
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

@fln_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_fln_summary():
    class_id = request.args.get("class_section_id", type=int)
    assessment_id = request.args.get("assessment_id", type=int)

    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    if not assessment_id:
        a = Assessment.query.filter_by(code="FLN_BASELINE").first()
        assessment_id = a.id if a else 1

    summary = FLNService.get_summary(class_section_id=class_id, assessment_id=assessment_id)
    return jsonify({
        "status": "success",
        "summary": summary
    }), 200

@fln_bp.route("/sync-workbook", methods=["POST"])
@jwt_required()
@admin_required
def sync_workbook_fln():
    c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
    if not c:
        return jsonify({"error": "Class III-A not found.", "status": "error"}), 404

    a = Assessment.query.filter_by(code="FLN_BASELINE").first()
    if not a:
        return jsonify({"error": "FLN_BASELINE assessment not found.", "status": "error"}), 404

    try:
        count = FLNService.seed_fln_from_workbook(class_section_id=c.id, assessment_id=a.id)
        return jsonify({
            "message": f"Successfully synchronized {count} FLN entries from workbook.",
            "synced_count": count,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to sync FLN from workbook: {str(e)}", "status": "error"}), 500

@fln_bp.route("/class-students-progress", methods=["GET"])
@jwt_required()
def get_class_students_progress():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        data = FLNService.get_class_students_progress(class_section_id=class_id)
        return jsonify({
            "status": "success",
            "data": data
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@fln_bp.route("/student-remarks", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def save_student_remarks():
    data = request.get_json() or {}
    class_id = data.get("class_section_id")
    assessment_id = data.get("assessment_id")
    remarks_list = data.get("remarks_list", [])

    if not class_id or not assessment_id:
        return jsonify({"error": "class_section_id and assessment_id are required.", "status": "error"}), 400

    user_id = get_jwt_identity()
    evaluator_id = int(user_id) if user_id else None

    try:
        count = FLNService.save_student_remarks(
            class_section_id=int(class_id),
            assessment_id=int(assessment_id),
            remarks_list=remarks_list,
            evaluator_id=evaluator_id
        )
        return jsonify({
            "message": f"Successfully updated remarks for {count} students.",
            "updated_count": count,
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

