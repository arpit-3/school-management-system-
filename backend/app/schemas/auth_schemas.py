import re

def validate_email(email: str) -> bool:
    if not email:
        return False
    regex = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(regex, email))

def validate_registration_payload(data: dict) -> tuple[bool, str | None]:
    if not data:
        return False, "Request body must be JSON."
    
    username = data.get("username", "").strip()
    email = data.get("email", "").strip()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()
    
    if not username or len(username) < 3:
        return False, "Username must be at least 3 characters long."
    
    if not email or not validate_email(email):
        return False, "A valid email address is required."
        
    if not password or len(password) < 6:
        return False, "Password must be at least 6 characters long."
        
    if not full_name:
        return False, "Full name is required."
        
    return True, None

def validate_login_payload(data: dict) -> tuple[bool, str | None]:
    if not data:
        return False, "Request body must be JSON."
    
    identifier = data.get("username") or data.get("email")
    password = data.get("password")
    
    if not identifier:
        return False, "Username or email is required."
    if not password:
        return False, "Password is required."
        
    return True, None
