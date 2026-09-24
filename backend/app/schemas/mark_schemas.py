def validate_mark_entry_payload(data: dict, max_allowed_marks: float = 100.0) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not data.get("student_id"):
        return False, "student_id is required."
    if not data.get("assessment_id"):
        return False, "assessment_id is required."
    if not data.get("subject_id"):
        return False, "subject_id is required."

    is_absent = data.get("is_absent", False)
    marks = data.get("marks_obtained")

    if not is_absent:
        if marks is None:
            return False, "marks_obtained is required when student is present."
        try:
            m = float(marks)
            if m < 0:
                return False, "Marks obtained cannot be negative."
            if m > max_allowed_marks:
                return False, f"Marks obtained ({m}) exceeds the maximum marks allowed ({max_allowed_marks})."
        except ValueError:
            return False, "marks_obtained must be a valid number."

    return True, None

def validate_marks_bulk_payload(data: dict) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not data.get("class_section_id"):
        return False, "class_section_id is required."
    if not data.get("assessment_id"):
        return False, "assessment_id is required."
    if not data.get("subject_id"):
        return False, "subject_id is required."
    if not isinstance(data.get("entries"), list):
        return False, "entries must be an array of student marks."

    return True, None
