import re

def validate_school_payload(data: dict, is_update=False) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."
    
    if not is_update or "name" in data:
        name = data.get("name", "").strip()
        if not name:
            return False, "School name is required."
        if len(name) < 3:
            return False, "School name must be at least 3 characters."

    return True, None

def validate_session_payload(data: dict) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."
    
    session_name = data.get("session_name", "").strip()
    if not session_name:
        return False, "Academic session name is required (e.g. '2026-27')."

    return True, None
