from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.user import User, RoleEnum
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.services.classroom_service import ClassroomService
from app.schemas.classroom_schemas import (
    validate_class_section_payload,
    validate_subject_payload,
    validate_allocation_payload
)
from app.permissions import admin_required, super_admin_required

classroom_bp = Blueprint("classroom", __name__, url_prefix="/api")

# --- Class Section Endpoints ---

@classroom_bp.route("/classrooms", methods=["GET"])
@classroom_bp.route("/classes", methods=["GET"])
@jwt_required()
def list_classrooms():
    school_id = request.args.get("school_id", type=int)
    session_id = request.args.get("session_id", type=int)
    teacher_id = request.args.get("teacher_id", type=int)

    # If no school_id provided, default to user's assigned school or first active school
    if not school_id:
        user_id = get_jwt_identity()
        user = db.session.get(User, int(user_id)) if user_id else None
        if user and user.school_id:
            school_id = user.school_id
        else:
            primary_school = School.query.filter_by(is_active=True).first()
            if primary_school:
                school_id = primary_school.id

    classes = ClassroomService.get_classrooms(
        school_id=school_id,
        session_id=session_id,
        teacher_id=teacher_id
    )

    class_list = [c.to_dict() for c in classes]
    return jsonify({
        "status": "success",
        "count": len(classes),
        "classrooms": class_list,
        "classes": class_list
    }), 200

@classroom_bp.route("/classrooms/<int:class_id>", methods=["GET"])
@jwt_required()
def get_classroom(class_id):
    classroom = ClassroomService.get_classroom_by_id(class_id)
    if not classroom:
        return jsonify({"error": "Class section not found.", "status": "error"}), 404

    allocations = ClassroomService.get_class_allocations(class_id)
    data = classroom.to_dict()
    data["allocations"] = [a.to_dict() for a in allocations]

    return jsonify({
        "status": "success",
        "classroom": data
    }), 200

@classroom_bp.route("/classrooms", methods=["POST"])
@jwt_required()
@admin_required
def create_classroom():
    data = request.get_json() or {}
    is_valid, err = validate_class_section_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        classroom = ClassroomService.create_classroom(data)
        return jsonify({
            "message": f"Class {classroom.display_name} created successfully.",
            "classroom": classroom.to_dict(),
            "status": "success"
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@classroom_bp.route("/classrooms/<int:class_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_classroom(class_id):
    data = request.get_json() or {}
    is_valid, err = validate_class_section_payload(data, is_update=True)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        classroom = ClassroomService.update_classroom(class_id, data)
        if not classroom:
            return jsonify({"error": "Class section not found.", "status": "error"}), 404
        return jsonify({
            "message": "Class section updated successfully.",
            "classroom": classroom.to_dict(),
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@classroom_bp.route("/classrooms/<int:class_id>", methods=["DELETE"])
@jwt_required()
@super_admin_required
def delete_classroom(class_id):
    success = ClassroomService.delete_classroom(class_id)
    if not success:
        return jsonify({"error": "Class section not found.", "status": "error"}), 404
    return jsonify({"message": "Class section deleted successfully.", "status": "success"}), 200

# --- Subject Endpoints ---

@classroom_bp.route("/subjects", methods=["GET"])
@jwt_required()
def list_subjects():
    school_id = request.args.get("school_id", type=int)
    is_fln_only = request.args.get("is_fln_only")
    if is_fln_only is not None:
        is_fln_only = is_fln_only.lower() in ["true", "1", "yes"]
    else:
        is_fln_only = False

    if not school_id:
        primary_school = School.query.filter_by(is_active=True).first()
        if primary_school:
            school_id = primary_school.id

    if not school_id:
        return jsonify({"status": "success", "count": 0, "subjects": []}), 200

    subjects = ClassroomService.get_subjects(school_id=school_id, is_fln_only=is_fln_only)
    return jsonify({
        "status": "success",
        "count": len(subjects),
        "subjects": [s.to_dict() for s in subjects]
    }), 200

@classroom_bp.route("/subjects", methods=["POST"])
@jwt_required()
@admin_required
def create_subject():
    data = request.get_json() or {}
    is_valid, err = validate_subject_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        subject = ClassroomService.create_subject(data)
        return jsonify({
            "message": f"Subject '{subject.name}' created successfully.",
            "subject": subject.to_dict(),
            "status": "success"
        }), 201
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 409

@classroom_bp.route("/subjects/<int:subject_id>", methods=["PUT"])
@jwt_required()
@admin_required
def update_subject(subject_id):
    data = request.get_json() or {}
    is_valid, err = validate_subject_payload(data, is_update=True)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    subject = ClassroomService.update_subject(subject_id, data)
    if not subject:
        return jsonify({"error": "Subject not found.", "status": "error"}), 404

    return jsonify({
        "message": "Subject updated successfully.",
        "subject": subject.to_dict(),
        "status": "success"
    }), 200

# --- Teacher Allocation Endpoints ---

@classroom_bp.route("/classrooms/<int:class_id>/allocations", methods=["GET"])
@jwt_required()
def get_allocations(class_id):
    allocations = ClassroomService.get_class_allocations(class_id)
    return jsonify({
        "status": "success",
        "count": len(allocations),
        "allocations": [a.to_dict() for a in allocations]
    }), 200

@classroom_bp.route("/classrooms/<int:class_id>/allocations", methods=["POST"])
@jwt_required()
@admin_required
def allocate_teacher(class_id):
    data = request.get_json() or {}
    is_valid, err = validate_allocation_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        alloc = ClassroomService.allocate_teacher(
            class_id=class_id,
            subject_id=data["subject_id"],
            teacher_id=data["teacher_id"]
        )
        return jsonify({
            "message": "Teacher allocated to subject successfully.",
            "allocation": alloc.to_dict(),
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

# --- Teachers in School for Dropdowns ---

@classroom_bp.route("/teachers", methods=["GET"])
@jwt_required()
def list_teachers():
    school_id = request.args.get("school_id", type=int)
    query = User.query.filter(User.role.in_([RoleEnum.TEACHER, RoleEnum.SCHOOL_ADMIN]))
    if school_id:
        query = query.filter_by(school_id=school_id)
    teachers = query.order_by(User.full_name.asc()).all()

    return jsonify({
        "status": "success",
        "count": len(teachers),
        "teachers": [{
            "id": t.id,
            "full_name": t.full_name,
            "email": t.email,
            "employee_id": t.employee_id,
            "designation": t.designation,
            "phone_number": t.phone_number
        } for t in teachers]
    }), 200
