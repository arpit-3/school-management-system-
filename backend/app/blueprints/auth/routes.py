from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from app.extensions import db
from app.models.user import User, RoleEnum
from app.schemas.auth_schemas import validate_registration_payload, validate_login_payload

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    is_valid, err = validate_registration_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    username = data["username"].strip().lower()
    email = data["email"].strip().lower()

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username is already taken.", "status": "error"}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email address is already registered.", "status": "error"}), 409

    role = data.get("role", RoleEnum.TEACHER).upper()
    if role not in RoleEnum.ALL_ROLES:
        return jsonify({"error": f"Invalid role. Must be one of {RoleEnum.ALL_ROLES}", "status": "error"}), 400

    user = User(
        username=username,
        email=email,
        full_name=data["full_name"].strip(),
        role=role,
        school_id=data.get("school_id"),
        employee_id=data.get("employee_id"),
        phone_number=data.get("phone_number"),
        designation=data.get("designation")
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.commit()

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "User registered successfully.",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "status": "success"
    }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    is_valid, err = validate_login_payload(data)
    if not is_valid:
        return jsonify({"error": err, "status": "error"}), 400

    identifier = (data.get("username") or data.get("email") or "").strip().lower()
    password = data.get("password")

    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()

    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username/email or password.", "status": "error"}), 401

    if not user.is_active:
        return jsonify({"error": "This account is inactive. Please contact administration.", "status": "error"}), 403

    access_token = create_access_token(identity=str(user.id))
    refresh_token = create_refresh_token(identity=str(user.id))

    return jsonify({
        "message": "Login successful.",
        "user": user.to_dict(),
        "access_token": access_token,
        "refresh_token": refresh_token,
        "status": "success"
    }), 200

@auth_bp.route("/refresh", methods=["POST"])
@jwt_required(refresh=True)
def refresh():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None
    if not user or not user.is_active:
        return jsonify({"error": "User account inactive or not found.", "status": "error"}), 401

    new_access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "access_token": new_access_token,
        "status": "success"
    }), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def get_current_user():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None
    if not user:
        return jsonify({"error": "User not found.", "status": "error"}), 404
    return jsonify({
        "user": user.to_dict(),
        "status": "success"
    }), 200

@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None
    if not user:
        return jsonify({"error": "User not found.", "status": "error"}), 404

    data = request.get_json() or {}
    if "full_name" in data and data["full_name"].strip():
        user.full_name = data["full_name"].strip()
    if "phone_number" in data:
        user.phone_number = data["phone_number"]
    if "designation" in data:
        user.designation = data["designation"]

    db.session.commit()
    return jsonify({
        "message": "Profile updated successfully.",
        "user": user.to_dict(),
        "status": "success"
    }), 200

@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    user_id = get_jwt_identity()
    user = db.session.get(User, int(user_id)) if user_id else None
    if not user:
        return jsonify({"error": "User not found.", "status": "error"}), 404

    data = request.get_json() or {}
    old_password = data.get("old_password")
    new_password = data.get("new_password")

    if not old_password or not new_password:
        return jsonify({"error": "Both old_password and new_password are required.", "status": "error"}), 400

    if not user.check_password(old_password):
        return jsonify({"error": "Incorrect old password.", "status": "error"}), 400

    if len(new_password) < 6:
        return jsonify({"error": "New password must be at least 6 characters long.", "status": "error"}), 400

    user.set_password(new_password)
    db.session.commit()
    return jsonify({"message": "Password changed successfully.", "status": "success"}), 200

@auth_bp.route("/logout", methods=["POST"])
@jwt_required()
def logout():
    # In stateless JWT, client deletes tokens; endpoint confirms graceful logout
    return jsonify({"message": "Successfully logged out.", "status": "success"}), 200
