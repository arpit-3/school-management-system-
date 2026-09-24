from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.academic_session import AcademicSession
from app.services.school_service import SchoolService
from app.schemas.school_schemas import validate_school_payload, validate_session_payload
from app.permissions import role_required, super_admin_required, admin_required

school_bp = Blueprint("school", __name__, url_prefix="/api/schools")

@school_bp.route("", methods=["GET"])
@jwt_required()
def list_schools():
    search = request.args.get("search")
    is_active = request.args.get("is_active")
    if is_active is not None:
        is_active = is_active.lower() in ["true", "1", "yes"]

    schools = SchoolService.get_all_schools(search=search, is_active=is_active)
    return jsonify({
        "status": "success",
        "count": len(schools),
        "schools": [s.to_dict() for s in schools]
    }), 200

@school_bp.route("/current", methods=["GET"])
@jwt_required()
def get_current_school():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None

    # If user has an assigned school, load that
    school = None
    if user and user.school_id:
        school = db.session.get(School, user.school_id)

    # Fallback to the primary MCD school in DB (e.g. MCP NITHARI)
    if not school:
        school = School.query.filter_by(is_active=True).first()

    if not school:
        return jsonify({"error": "No school found in the system.", "status": "error"}), 404

    return jsonify({
        "status": "success",
        "school": school.to_dict(),
        "sessions": [s.to_dict() for s in school.sessions.order_by(AcademicSession.session_name.desc()).all()]
    }), 200

@school_bp.route("/<int:school_id>", methods=["GET"])
@jwt_required()
def get_school(school_id):
    school = SchoolService.get_school_by_id(school_id)
    if not school:
        return jsonify({"error": "School not found.", "status": "error"}), 404

    return jsonify({
        "status": "success",
        "school": school.to_dict(),
        "sessions": [s.to_dict() for s in school.sessions.order_by(AcademicSession.session_name.desc()).all()]
    }), 200

@school_bp.route("", methods=["POST"])
@jwt_required()
@super_admin_required
def create_school():
    data = request.get_json() or {}
    is_valid, err = validate_school_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        school = SchoolService.create_school(data)
        return jsonify({
            "message": "School created successfully.",
            "school": school.to_dict(),
            "status": "success"
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@school_bp.route("/<int:school_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_school(school_id):
    data = request.get_json() or {}
    is_valid, err = validate_school_payload(data, is_update=True)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    # School admin can only update their own school
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None
    if user and user.role == RoleEnum.SCHOOL_ADMIN and user.school_id and user.school_id != school_id:
        return jsonify({"error": "Unauthorized to modify another school's profile.", "status": "error"}), 403

    try:
        school = SchoolService.update_school(school_id, data)
        if not school:
            return jsonify({"error": "School not found.", "status": "error"}), 404
        return jsonify({
            "message": "School updated successfully.",
            "school": school.to_dict(),
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@school_bp.route("/<int:school_id>", methods=["DELETE"])
@jwt_required()
@super_admin_required
def delete_school(school_id):
    success = SchoolService.delete_school(school_id)
    if not success:
        return jsonify({"error": "School not found.", "status": "error"}), 404
    return jsonify({"message": "School deleted successfully.", "status": "success"}), 200

@school_bp.route("/<int:school_id>/sessions", methods=["GET"])
@jwt_required()
def list_sessions(school_id):
    school = SchoolService.get_school_by_id(school_id)
    if not school:
        return jsonify({"error": "School not found.", "status": "error"}), 404

    sessions = school.sessions.order_by(AcademicSession.session_name.desc()).all()
    return jsonify({
        "status": "success",
        "sessions": [s.to_dict() for s in sessions]
    }), 200

@school_bp.route("/<int:school_id>/sessions", methods=["POST"])
@jwt_required()
@admin_required
def add_session(school_id):
    data = request.get_json() or {}
    is_valid, err = validate_session_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        session = SchoolService.add_session(school_id, data)
        if not session:
            return jsonify({"error": "School not found.", "status": "error"}), 404
        return jsonify({
            "message": "Academic session added successfully.",
            "session": session.to_dict(),
            "status": "success"
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@school_bp.route("/<int:school_id>/sessions/<int:session_id>/activate", methods=["PUT"])
@jwt_required()
@admin_required
def activate_session(school_id, session_id):
    session = SchoolService.activate_session(school_id, session_id)
    if not session:
        return jsonify({"error": "Academic session or school not found.", "status": "error"}), 404
    return jsonify({
        "message": f"Academic session '{session.session_name}' is now set as active.",
        "session": session.to_dict(),
        "status": "success"
    }), 200
