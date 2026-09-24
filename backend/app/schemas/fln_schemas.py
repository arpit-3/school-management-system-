def validate_fln_entry_payload(data: dict) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not data.get("student_id"):
        return False, "student_id is required."
    if not data.get("assessment_id"):
        return False, "assessment_id is required."
    if not data.get("subject_id"):
        return False, "subject_id is required."

    is_absent = data.get("is_absent", False)
    level = data.get("level")

    if not is_absent:
        if level is None:
            return False, "FLN level (1 to 5) or is_absent=true is required."
        try:
            lvl = int(level)
            if lvl < 1 or lvl > 5:
                return False, "FLN level must be between 1 and 5."
        except ValueError:
            return False, "FLN level must be an integer between 1 and 5."

    return True, None

def validate_fln_bulk_payload(data: dict) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not data.get("class_section_id"):
        return False, "class_section_id is required."
    if not data.get("assessment_id"):
        return False, "assessment_id is required."
    if not isinstance(data.get("entries"), list):
        return False, "entries must be an array of student level records."

    return True, None
