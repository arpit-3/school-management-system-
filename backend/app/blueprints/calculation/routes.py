from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.classroom import ClassSection
from app.services.calculation_engine import CalculationEngine

calculation_bp = Blueprint("calculation", __name__, url_prefix="/api/calculations")

@calculation_bp.route("/class-results", methods=["GET"])
@jwt_required()
def get_class_results():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        results = CalculationEngine.calculate_annual_class_results(class_id)
        return jsonify({
            "status": "success",
            "data": results
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@calculation_bp.route("/pa-summary", methods=["GET"])
@jwt_required()
def get_pa_summary():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        summary = CalculationEngine.calculate_pa_summary(class_id)
        return jsonify({
            "status": "success",
            "data": summary
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404

@calculation_bp.route("/grade-distribution", methods=["GET"])
@jwt_required()
def get_grade_distribution():
    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        results = CalculationEngine.calculate_annual_class_results(class_id)
        return jsonify({
            "status": "success",
            "stats": results["summary_stats"]
        }), 200
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404
