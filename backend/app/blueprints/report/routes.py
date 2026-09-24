from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.classroom import ClassSection
from app.models.school import School
from app.services.report_service import ReportService

report_bp = Blueprint("report", __name__, url_prefix="/api/reports")

@report_bp.route("/report-card/<int:student_id>", methods=["GET"])
@jwt_required()
def get_report_card(student_id):
    try:
        report = ReportService.get_student_report_card(student_id)
        return jsonify({
            "status": "success",
            "data": report
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@report_bp.route("/full-detail-packet", methods=["GET"])
@jwt_required()
def get_full_detail_packet():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        packet = ReportService.get_class_full_packet(class_id)
        return jsonify({
            "status": "success",
            "data": packet
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@report_bp.route("/class-broadsheet", methods=["GET"])
@jwt_required()
def get_class_broadsheet():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        broadsheet = ReportService.get_class_broadsheet(class_id)
        return jsonify({
            "status": "success",
            "data": broadsheet
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@report_bp.route("/school-summary", methods=["GET"])
@jwt_required()
def get_school_summary():
    school_id = request.args.get("school_id", type=int)
    if not school_id:
        s = School.query.first()
        school_id = s.id if s else 1

    try:
        summary = ReportService.get_school_summary(school_id)
        return jsonify({
            "status": "success",
            "data": summary
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@report_bp.route("/annexure-f1/<int:student_id>", methods=["GET"])
@jwt_required()
def get_annexure_f1_route(student_id):
    try:
        report = ReportService.get_annexure_f1(student_id)
        return jsonify({
            "status": "success",
            "data": report
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@report_bp.route("/annexure-f2", methods=["GET"])
@jwt_required()
def get_annexure_f2_route():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        report = ReportService.get_annexure_f2(class_id)
        return jsonify({
            "status": "success",
            "data": report
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@report_bp.route("/annexure-f3", methods=["GET"])
@jwt_required()
def get_annexure_f3_route():
    school_id = request.args.get("school_id", type=int)
    if not school_id:
        s = School.query.first()
        school_id = s.id if s else 1
    class_group = request.args.get("class_group", "1_2")

    try:
        report = ReportService.get_annexure_f3(school_id, class_group)
        return jsonify({
            "status": "success",
            "data": report
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

