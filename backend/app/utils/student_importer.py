import datetime
import openpyxl
from io import BytesIO

def parse_student_date(val):
    if not val:
        return None
    if isinstance(val, (datetime.date, datetime.datetime)):
        return val.date() if isinstance(val, datetime.datetime) else val
    
    val_str = str(val).strip()
    # Try various formats commonly used in Delhi school sheets
    for fmt in ["%b %d %Y", "%B %d %Y", "%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%b-%Y"]:
        try:
            return datetime.datetime.strptime(val_str, fmt).date()
        except ValueError:
            pass
    return None

def parse_students_from_excel(file_source, school_id, class_section_id):
    """
    Parses student records from an Excel workbook (file path or bytes stream).
    Extracts columns matching the official STUDENT sheet format.
    """
    if isinstance(file_source, (str, bytes)):
        wb = openpyxl.load_workbook(file_source, read_only=True, data_only=True)
    else:
        wb = openpyxl.load_workbook(filename=BytesIO(file_source), read_only=True, data_only=True)

    # Prefer 'STUDENT' sheet if available, else first active sheet
    sheet_name = "STUDENT" if "STUDENT" in wb.sheetnames else wb.sheetnames[0]
    ws = wb[sheet_name]

    students = []
    for row in ws.iter_rows(values_only=True):
        # Must have S.No. (Roll No) and Student Name
        if not row or row[0] is None or not str(row[0]).strip().isdigit():
            continue
        
        name = str(row[4]).strip() if len(row) > 4 and row[4] else None
        if not name:
            continue

        roll_no = int(row[0])
        student_id = str(row[3]).strip() if len(row) > 3 and row[3] else None
        admission_no = str(row[5]).strip() if len(row) > 5 and row[5] else None
        dob = parse_student_date(row[6]) if len(row) > 6 else None
        father_name = str(row[7]).strip() if len(row) > 7 and row[7] else None
        mother_name = str(row[8]).strip() if len(row) > 8 and row[8] else None
        bank_account_no = str(row[9]).strip() if len(row) > 9 and row[9] else None
        bank_name = str(row[10]).strip() if len(row) > 10 and row[10] else None
        ifsc_code = str(row[11]).strip() if len(row) > 11 and row[11] else None
        aadhar_no = str(row[13]).strip() if len(row) > 13 and row[13] else None
        category = str(row[14]).strip().upper() if len(row) > 14 and row[14] else "GEN"
        gender = str(row[15]).strip().upper() if len(row) > 15 and row[15] else "BOY"
        contact_no = str(row[19]).strip() if len(row) > 19 and row[19] else None
        address = str(row[21]).strip() if len(row) > 21 and row[21] else None
        blood_group = str(row[23]).strip() if len(row) > 23 and row[23] else None

        students.append({
            "school_id": school_id,
            "class_section_id": class_section_id,
            "roll_no": roll_no,
            "student_id": student_id,
            "name": name,
            "admission_no": admission_no,
            "dob": dob,
            "father_name": father_name,
            "mother_name": mother_name,
            "bank_account_no": bank_account_no,
            "bank_name": bank_name,
            "ifsc_code": ifsc_code,
            "aadhar_no": aadhar_no,
            "category": category,
            "gender": gender,
            "contact_no": contact_no,
            "address": address,
            "blood_group": blood_group,
            "status": "ACTIVE"
        })

    wb.close()
    return students
