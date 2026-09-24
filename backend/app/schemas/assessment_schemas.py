from app.models.assessment import AssessmentTypeEnum

def validate_assessment_payload(data: dict, is_update=False) -> tuple[bool, str | None]:
    if not data or not isinstance(data, dict):
        return False, "Request body must be a JSON object."

    if not is_update:
        if not data.get("name") or not str(data.get("name")).strip():
            return False, "Assessment name is required."
        if not data.get("code") or not str(data.get("code")).strip():
            return False, "Assessment code is required (e.g. 'PA1', 'FINAL_EXAM')."
        if not data.get("assessment_type"):
            return False, "assessment_type is required ('PERIODIC', 'TERM', 'INTERNAL', 'FLN')."
        
        valid_types = [t.value for t in AssessmentTypeEnum]
        if data.get("assessment_type").upper() not in valid_types:
            return False, f"Invalid assessment_type. Must be one of: {', '.join(valid_types)}"

    return True, None
