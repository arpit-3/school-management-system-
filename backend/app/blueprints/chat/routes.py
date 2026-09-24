from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.services.ai_chat_service import AIChatService

chat_bp = Blueprint("chat", __name__, url_prefix="/api/chat")

@chat_bp.route("/message", methods=["POST"])
@jwt_required()
def send_message():
    data = request.get_json() or {}
    message = data.get("message", "").strip()
    class_id = data.get("class_section_id", 1)

    if not message:
        return jsonify({"error": "Message cannot be empty.", "status": "error"}), 400

    response = AIChatService.process_query(message, class_id)
    return jsonify({
        "status": "success",
        "response": response
    }), 200

@chat_bp.route("/suggestions", methods=["GET"])
@jwt_required()
def get_suggestions():
    suggestions = [
        "Which students scored highest in class?",
        "Show me students with attendance below 75%",
        "Who needs improvement in FLN Hindi & Maths?",
        "Which students are at risk of failing?",
        "What is the average score of Class III-A?",
        "Tell me about Roll 1 (NAKSH)"
    ]
    return jsonify({
        "status": "success",
        "suggestions": suggestions
    }), 200
