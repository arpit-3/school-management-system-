def validate_class_section_payload(data: dict, is_update=False) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not is_update:
        if not data.get("school_id"):
            return False, "school_id is required."
        if not data.get("session_id"):
            return False, "session_id is required."
        if not data.get("class_name"):
            return False, "class_name is required (e.g. 'III', '1', '2')."
        if not data.get("section_name"):
            return False, "section_name is required (e.g. 'A', 'B')."

    return True, None

def validate_subject_payload(data: dict, is_update=False) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not is_update:
        if not data.get("school_id"):
            return False, "school_id is required."
        if not data.get("name") or not data.get("name").strip():
            return False, "Subject name is required."
        if not data.get("code") or not data.get("code").strip():
            return False, "Subject code is required (e.g. 'HIN', 'MATH')."

    return True, None

def validate_allocation_payload(data: dict) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not data.get("subject_id"):
        return False, "subject_id is required."
    if not data.get("teacher_id"):
        return False, "teacher_id is required."

    return True, None
