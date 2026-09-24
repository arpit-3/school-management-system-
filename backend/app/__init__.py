from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, jwt, migrate, cors

def create_app(config_name="default"):
    app = Flask(__name__)
    app.config.from_object(config_by_name.get(config_name, config_by_name["default"]))

    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    cors.init_app(app, resources={r"/api/*": {"origins": "*"}})

    # JWT Error handlers for clear JSON responses
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            "error": "The token has expired. Please refresh or log in again.",
            "status": "token_expired"
        }), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            "error": "Signature verification failed. Invalid token.",
            "status": "invalid_token"
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            "error": "Request does not contain an access token.",
            "status": "authorization_required"
        }), 401

    # Root health endpoint
    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({
            "status": "healthy",
            "service": "FLN School Assessment & Analytics API",
            "version": "1.0.0"
        }), 200

    # Register blueprints
    from app.blueprints.auth import auth_bp
    from app.blueprints.school import school_bp
    from app.blueprints.classroom import classroom_bp
    from app.blueprints.student import student_bp
    from app.blueprints.assessment import assessment_bp
    from app.blueprints.fln import fln_bp
    from app.blueprints.mark import mark_bp
    from app.blueprints.attendance import attendance_bp
    from app.blueprints.calculation import calculation_bp
    from app.blueprints.ai_analytics import ai_bp
    from app.blueprints.report import report_bp
    from app.blueprints.export import export_bp
    from app.blueprints.chat import chat_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(school_bp)
    app.register_blueprint(classroom_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(assessment_bp)
    app.register_blueprint(fln_bp)
    app.register_blueprint(mark_bp)
    app.register_blueprint(attendance_bp)
    app.register_blueprint(calculation_bp)
    app.register_blueprint(ai_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(chat_bp)

    return app
