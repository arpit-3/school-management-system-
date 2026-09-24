from flask import Blueprint, request, send_file, jsonify
from flask_jwt_extended import jwt_required, decode_token
from app.models.classroom import ClassSection
from app.services.excel_export_service import ExcelExportService

export_bp = Blueprint("export", __name__, url_prefix="/api/export")

def verify_token_optional():
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.args.get("token")
    if not token:
        return False
    try:
        decode_token(token)
        return True
    except Exception:
        return False

@export_bp.route("/workbook", methods=["GET"])
def export_workbook():
    if not verify_token_optional():
        return jsonify({"error": "Authentication token required.", "status": "error"}), 401

    class_id = request.args.get("class_section_id", type=int)
    if not class_id:
        c = ClassSection.query.filter_by(class_name="III", section_name="A").first()
        class_id = c.id if c else 1

    try:
        file_stream = ExcelExportService.generate_full_workbook(class_id)
        filename = f"FLN_Class_III-A_Official_Assessment_System.xlsx"
        return send_file(
            file_stream,
            as_attachment=True,
            download_name=filename,
            mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )
    except ValueError as ve:
        return jsonify({"error": str(ve), "status": "error"}), 404
    except Exception as e:
        return jsonify({"error": f"Export failed: {str(e)}", "status": "error"}), 500
