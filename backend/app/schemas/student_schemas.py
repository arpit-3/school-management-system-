def validate_student_payload(data: dict, is_update=False) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not is_update:
        if not data.get("name") or not str(data.get("name")).strip():
            return False, "Student full name is required."
        if not data.get("class_section_id"):
            return False, "class_section_id is required."
        if data.get("roll_no") is None:
            return False, "roll_no is required."

    if "roll_no" in data and data["roll_no"] is not None:
        try:
            r = int(data["roll_no"])
            if r <= 0:
                return False, "roll_no must be a positive integer."
        except ValueError:
            return False, "roll_no must be an integer."

    return True, None
