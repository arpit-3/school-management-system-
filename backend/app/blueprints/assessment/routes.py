from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User
from app.models.school import School
from app.models.academic_session import AcademicSession
from app.services.assessment_service import AssessmentService
from app.schemas.assessment_schemas import validate_assessment_payload
from app.permissions import admin_required

assessment_bp = Blueprint("assessment", __name__, url_prefix="/api/assessments")

@assessment_bp.route("", methods=["GET"])
@jwt_required()
def list_assessments():
    school_id = request.args.get("school_id", type=int)
    session_id = request.args.get("session_id", type=int)
    assessment_type = request.args.get("assessment_type")
    term = request.args.get("term", type=int)

    if not school_id:
        primary_school = School.query.filter_by(is_active=True).first()
        school_id = primary_school.id if primary_school else 1

    if not session_id and school_id:
        active_sess = AcademicSession.query.filter_by(school_id=school_id, is_active=True).first()
        session_id = active_sess.id if active_sess else 1

    assessments = AssessmentService.get_assessments(
        school_id=school_id,
        session_id=session_id,
        assessment_type=assessment_type,
        term=term
    )

    return jsonify({
        "status": "success",
        "count": len(assessments),
        "assessments": [a.to_dict() for a in assessments]
    }), 200

@assessment_bp.route("/<int:assessment_id>", methods=["GET"])
@jwt_required()
def get_assessment(assessment_id):
    assessment = AssessmentService.get_assessment_by_id(assessment_id)
    if not assessment:
        return jsonify({"error": "Assessment not found.", "status": "error"}), 404

    return jsonify({
        "status": "success",
        "assessment": assessment.to_dict()
    }), 200

@assessment_bp.route("", methods=["POST"])
@jwt_required()
@admin_required
def create_assessment():
    data = request.get_json() or {}
    is_valid, err = validate_assessment_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    if not data.get("school_id"):
        primary_school = School.query.filter_by(is_active=True).first()
        data["school_id"] = primary_school.id if primary_school else 1

    if not data.get("session_id"):
        active_sess = AcademicSession.query.filter_by(school_id=data["school_id"], is_active=True).first()
        data["session_id"] = active_sess.id if active_sess else 1

    try:
        assessment = AssessmentService.create_assessment(data)
        return jsonify({
            "message": f"Assessment '{assessment.name}' created successfully.",
            "assessment": assessment.to_dict(),
            "status": "success"
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@assessment_bp.route("/<int:assessment_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_assessment(assessment_id):
    data = request.get_json() or {}
    is_valid, err = validate_assessment_payload(data, is_update=True)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    assessment = AssessmentService.update_assessment(assessment_id, data)
    if not assessment:
        return jsonify({"error": "Assessment not found.", "status": "error"}), 404

    return jsonify({
        "message": f"Assessment '{assessment.name}' updated successfully.",
        "assessment": assessment.to_dict(),
        "status": "success"
    }), 200

@assessment_bp.route("/<int:assessment_id>", methods=["DELETE"])
@jwt_required()
@admin_required
def delete_assessment(assessment_id):
    success = AssessmentService.delete_assessment(assessment_id)
    if not success:
        return jsonify({"error": "Assessment not found.", "status": "error"}), 404

    return jsonify({"message": "Assessment deleted successfully.", "status": "success"}), 200

@assessment_bp.route("/seed-defaults", methods=["POST"])
@jwt_required()
@admin_required
def seed_defaults():
    school_id = request.json.get("school_id") if request.is_json else None
    session_id = request.json.get("session_id") if request.is_json else None

    if not school_id:
        primary_school = School.query.filter_by(is_active=True).first()
        school_id = primary_school.id if primary_school else 1

    if not session_id:
        active_sess = AcademicSession.query.filter_by(school_id=school_id, is_active=True).first()
        session_id = active_sess.id if active_sess else 1

    count = AssessmentService.seed_default_assessments(school_id, session_id)
    return jsonify({
        "message": f"Successfully created {count} standard assessments.",
        "created_count": count,
        "status": "success"
    }), 200
