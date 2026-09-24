from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.classroom import ClassSection
from app.services.ai_analytics_service import AIAnalyticsService

ai_bp = Blueprint("ai_analytics", __name__, url_prefix="/api/ai")

@ai_bp.route("/class-overview", methods=["GET"])
@jwt_required()
def get_class_overview():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        overview = AIAnalyticsService.get_class_overview(class_id)
        return jsonify({
            "status": "success",
            "data": overview
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@ai_bp.route("/at-risk-students", methods=["GET"])
@jwt_required()
def get_at_risk_students():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        at_risk = AIAnalyticsService.get_at_risk_students(class_id)
        return jsonify({
            "status": "success",
            "count": len(at_risk),
            "students": at_risk
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@ai_bp.route("/student-insights/<int:student_id>", methods=["GET"])
@jwt_required()
def get_student_insights(student_id):
    try:
        insights = AIAnalyticsService.get_student_insights(student_id)
        return jsonify({
            "status": "success",
            "data": insights
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404
