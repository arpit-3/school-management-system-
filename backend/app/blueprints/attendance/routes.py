from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.classroom import ClassSection
from app.services.attendance_service import AttendanceService
from app.schemas.attendance_schemas import validate_attendance_entry_payload, validate_attendance_bulk_payload
from app.permissions import teacher_or_admin_required, admin_required

attendance_bp = Blueprint("attendance", __name__, url_prefix="/api/attendance")

@attendance_bp.route("/months", methods=["GET"])
@jwt_required()
def get_month_catalog():
    return jsonify({
        "status": "success",
        "months": AttendanceService.get_month_catalog()
    }), 200

@attendance_bp.route("/sheet", methods=["GET"])
@jwt_required()
def get_attendance_sheet():
    class_id = request.args.get("class_section_id", type=int)
    term = request.args.get("term", default=1, type=int)
    month = request.args.get("month", default="TERM_1")

    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        data = AttendanceService.get_attendance_sheet(class_id, term=term, month=month)
        return jsonify({
            "status": "success",
            "data": data
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@attendance_bp.route("/monthly-matrix", methods=["GET"])
@jwt_required()
def get_monthly_matrix():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        matrix = AttendanceService.get_monthly_matrix(class_id)
        return jsonify({
            "status": "success",
            "data": matrix
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@attendance_bp.route("/working-days", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def set_working_days():
    data = request.get_json() or {}
    class_id = data.get("class_section_id")
    month = data.get("month", "TERM_1")
    working_days = data.get("working_days")

    if not class_id or not working_days:
        return jsonify({"error": "class_section_id and working_days are required.", "status": "error"}), 400

    try:
        count = AttendanceService.update_month_working_days(
            class_section_id=int(class_id),
            month=str(month),
            working_days=float(working_days)
        )
        return jsonify({
            "message": f"Updated working days to {working_days} for {count} attendance records in {month}.",
            "updated_count": count,
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

@attendance_bp.route("/entry", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def save_single_attendance():
    data = request.get_json() or {}
    is_valid, err = validate_attendance_entry_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    try:
        rec = AttendanceService.save_single_attendance(data)
        return jsonify({
            "message": "Attendance saved successfully.",
            "record": rec.to_dict(),
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

@attendance_bp.route("/bulk", methods=["POST"])
@jwt_required()
@teacher_or_admin_required
def bulk_save_attendance():
    data = request.get_json() or {}
    is_valid, err = validate_attendance_bulk_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    class_id = data["class_section_id"]
    term = int(data.get("term", 1))
    month = str(data.get("month", "TERM_1")).upper()
    working_days = float(data.get("working_days", 110.0))
    entries = data["entries"]

    try:
        count = AttendanceService.bulk_save_attendance(
            class_section_id=class_id,
            term=term,
            month=month,
            working_days=working_days,
            entries=entries
        )
        return jsonify({
            "message": f"Successfully updated attendance for {count} students for {month}.",
            "updated_count": count,
            "status": "success"
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 400

@attendance_bp.route("/sync-workbook", methods=["POST"])
@jwt_required()
@admin_required
def sync_workbook_attendance():
    c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
    if not c:
        return jsonify({"error": "Class III-A not found.", "status": "error"}), 404

    try:
        count = AttendanceService.seed_attendance_from_workbook(class_section_id=c.id)
        return jsonify({
            "message": f"Successfully synchronized {count} attendance records from workbook.",
            "synced_count": count,
            "status": "success"
        }), 200
    except Exception as e:
        return jsonify({"error": f"Failed to sync attendance from workbook: {str(e)}", "status": "error"}), 500
