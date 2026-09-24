def validate_attendance_entry_payload(data: dict) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not data.get("student_id"):
        return False, "student_id is required."

    working = data.get("working_days", 110.0)
    present = data.get("present_days", 0.0)

    try:
        w = float(working)
        p = float(present)
        if w < 0 or p < 0:
            return False, "Working days and present days cannot be negative."
        if p > w:
            return False, f"Present days ({p}) cannot exceed total working days ({w})."
    except ValueError:
        return False, "working_days and present_days must be valid numeric values."

    return True, None

def validate_attendance_bulk_payload(data: dict) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not data.get("class_section_id"):
        return False, "class_section_id is required."
    if not isinstance(data.get("entries"), list):
        return False, "entries must be an array of student attendance records."

    return True, None
