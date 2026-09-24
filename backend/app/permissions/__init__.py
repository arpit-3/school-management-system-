from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.extensions import db
from app.models.user import User, RoleEnum

def role_required(*allowed_roles):
    """Decorator to protect routes by requiring one of the allowed roles."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            user_id = get_jwt_identity()
            user = db.session.get(User, int(user_id)) if user_id else None
            if not user or not user.is_active:
                return jsonify({"error": "User account inactive or not found", "status": "error"}), 403
            
            if user.role not in allowed_roles:
                return jsonify({
                    "error": f"Forbidden: role '{user.role}' lacks permission for this action. Required: {list(allowed_roles)}",
                    "status": "error"
                }), 403
            
            return fn(*args, **kwargs)
        return wrapper
    return decorator

def super_admin_required(fn):
    return role_required(RoleEnum.SUPER_ADMIN)(fn)

def admin_required(fn):
    return role_required(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN)(fn)

def teacher_or_admin_required(fn):
    return role_required(RoleEnum.SUPER_ADMIN, RoleEnum.SCHOOL_ADMIN, RoleEnum.TEACHER)(fn)
