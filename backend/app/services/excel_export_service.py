import io
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from app.extensions import db
from app.models.school import School
from app.models.classroom import ClassSection
from app.models.student import Student
from app.models.subject import Subject
from app.models.mark import StudentMark
from app.models.fln_record import FLNRecord
from app.models.attendance import StudentAttendance
from app.services.calculation_engine import CalculationEngine

class ExcelExportService:
    @staticmethod
    def generate_full_workbook(class_section_id: int) -> io.BytesIO:
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        school = classroom.school if hasattr(classroom, "school") and classroom.school else db.session.get(School, classroom.school_id)
        active_session = school.active_session if school else None
        session_name = active_session.session_name if active_session else "2026-27"

        students = Student.query.filter_by(
            class_section_id=class_section_id,
            status="ACTIVE"
        ).order_by(Student.roll_no.asc()).all()

        subjects = Subject.query.filter_by(
            school_id=classroom.school_id,
            is_active=True
        ).order_by(Subject.id.asc()).all()

        wb = openpyxl.Workbook()

        # Styles
        title_font = Font(name="Calibri", size=14, bold=True, color="1E293B")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        bold_font = Font(name="Calibri", size=11, bold=True)
        regular_font = Font(name="Calibri", size=10)

        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        accent_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        zebra_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )

        align_center = Alignment(horizontal="center", vertical="center")
        align_left = Alignment(horizontal="left", vertical="center")
        align_right = Alignment(horizontal="right", vertical="center")

        # -------------------------------------------------------------
        # SHEET 1: School Info & Settings (ENTRY)
        # -------------------------------------------------------------
        ws_entry = wb.active
        ws_entry.title = "ENTRY"
        ws_entry.views.sheetView[0].showGridLines = True

        ws_entry.merge_cells("A1:D1")
        ws_entry["A1"] = "GOVERNMENT OF NCT OF DELHI - EDUCATION DEPARTMENT"
        ws_entry["A1"].font = title_font
        ws_entry["A1"].alignment = align_center

        ws_entry.merge_cells("A2:D2")
        ws_entry["A2"] = f"OFFICIAL INSTITUTIONAL MASTER RECORD - SESSION {session_name}"
        ws_entry["A2"].font = bold_font
        ws_entry["A2"].alignment = align_center

        info_rows = [
            ("School Name", school.name if school else "MCP NITHARI NO 1 BOYS"),
            ("School Code / ID", school.code if school else "1253018"),
            ("U-DISE ID", school.udise_id or "125301801"),
            ("Zone / Ward", f"{school.zone or 'ROHINI'} (Ward {school.ward_number or '40'})"),
            ("Academic Session", session_name),
            ("Class & Section", classroom.display_name),
            ("Class Category", classroom.category or "BOYS"),
            ("Class Teacher", classroom.class_teacher.full_name if classroom.class_teacher else "Indrajeet"),
            ("Head of School (H.O.S.)", school.principal_name if school else "Shambhu Dayal Meena"),
            ("Mentor / Inspector", school.mentor_name if school else "Devender Singh"),
            ("Total Class Enrollment", len(students)),
            ("Statutory Working Days (Term 1)", 110),
            ("Statutory Working Days (Annual)", 220)
        ]

        row_idx = 4
        for label, val in info_rows:
            ws_entry.cell(row=row_idx, column=1, value=label).font = bold_font
            ws_entry.cell(row=row_idx, column=1).border = thin_border
            ws_entry.cell(row=row_idx, column=2, value=val).font = regular_font
            ws_entry.cell(row=row_idx, column=2).border = thin_border
            row_idx += 1

        # -------------------------------------------------------------
        # SHEET 2: STUDENT ROSTER (STUDENT)
        # -------------------------------------------------------------
        ws_student = wb.create_sheet(title="STUDENT")
        ws_student.views.sheetView[0].showGridLines = True

        st_headers = ["Roll No", "Admission No", "Student Name", "Father's Name", "Mother's Name", "Date of Birth", "Gender", "Category", "Contact No", "Status"]
        for col_idx, h in enumerate(st_headers, start=1):
            cell = ws_student.cell(row=1, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border

        for r_idx, st in enumerate(students, start=2):
            vals = [
                st.roll_no,
                st.admission_no or "",
                st.name,
                st.father_name or "",
                st.mother_name or "",
                st.dob.strftime("%d/%m/%Y") if st.dob else "",
                st.gender or "BOY",
                st.category or "GEN",
                st.contact_no or "",
                st.status
            ]
            fill = zebra_fill if r_idx % 2 == 0 else None
            for c_idx, v in enumerate(vals, start=1):
                cell = ws_student.cell(row=r_idx, column=c_idx, value=v)
                cell.font = regular_font
                cell.border = thin_border
                if fill: cell.fill = fill
                cell.alignment = align_center if c_idx in [1, 2, 6, 7, 8, 10] else align_left

        # -------------------------------------------------------------
        # SHEET 3: MARKS LEDGER (PASHEET)
        # -------------------------------------------------------------
        ws_marks = wb.create_sheet(title="PASHEET")
        ws_marks.views.sheetView[0].showGridLines = True

        # Map marks: (student_id, subject_id) -> marks_obtained
        marks_records = StudentMark.query.filter_by(class_section_id=class_section_id).all()
        marks_map = {}
        for m in marks_records:
            if not m.is_absent and m.marks_obtained is not None:
                marks_map[(m.student_id, m.subject_id)] = m.marks_obtained

        mark_headers = ["Roll No", "Admission No", "Student Name"] + [s.name for s in subjects] + ["Total Obtained", "Average Score"]
        for col_idx, h in enumerate(mark_headers, start=1):
            cell = ws_marks.cell(row=1, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border

        sub_start_col = 4
        sub_end_col = sub_start_col + len(subjects) - 1

        for r_idx, st in enumerate(students, start=2):
            ws_marks.cell(row=r_idx, column=1, value=st.roll_no).alignment = align_center
            ws_marks.cell(row=r_idx, column=2, value=st.admission_no or "").alignment = align_center
            ws_marks.cell(row=r_idx, column=3, value=st.name).alignment = align_left

            for s_idx, sub in enumerate(subjects):
                c = sub_start_col + s_idx
                score = marks_map.get((st.id, sub.id), 0.0)
                cell = ws_marks.cell(row=r_idx, column=c, value=score)
                cell.alignment = align_center
                cell.number_format = "0.0"

            # Excel formulas for Total and Average!
            total_col = sub_end_col + 1
            avg_col = sub_end_col + 2

            start_col_letter = get_column_letter(sub_start_col)
            end_col_letter = get_column_letter(sub_end_col)

            total_cell = ws_marks.cell(row=r_idx, column=total_col, value=f"=SUM({start_col_letter}{r_idx}:{end_col_letter}{r_idx})")
            total_cell.font = bold_font
            total_cell.alignment = align_center
            total_cell.number_format = "0.0"

            avg_cell = ws_marks.cell(row=r_idx, column=avg_col, value=f"=AVERAGE({start_col_letter}{r_idx}:{end_col_letter}{r_idx})")
            avg_cell.font = bold_font
            avg_cell.alignment = align_center
            avg_cell.number_format = "0.0"

            for c in range(1, avg_col + 1):
                ws_marks.cell(row=r_idx, column=c).border = thin_border
                ws_marks.cell(row=r_idx, column=c).font = bold_font if c in [total_col, avg_col] else regular_font

        # -------------------------------------------------------------
        # SHEET 4: FLN MISSION BUNIYAD MATRIX (FLN)
        # -------------------------------------------------------------
        ws_fln = wb.create_sheet(title="FLN")
        ws_fln.views.sheetView[0].showGridLines = True

        fln_records = FLNRecord.query.filter_by(class_section_id=class_section_id).all()
        fln_map = {}
        for f in fln_records:
            if f.subject:
                fln_map[(f.student_id, f.subject.code)] = f.level

        fln_headers = ["Roll No", "Admission No", "Student Name", "Hindi Level", "Maths Level", "English Level"]
        for col_idx, h in enumerate(fln_headers, start=1):
            cell = ws_fln.cell(row=1, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border

        for r_idx, st in enumerate(students, start=2):
            vals = [
                st.roll_no,
                st.admission_no or "",
                st.name,
                fln_map.get((st.id, "HIN"), "-"),
                fln_map.get((st.id, "MATH"), "-"),
                fln_map.get((st.id, "ENG"), "-")
            ]
            fill = zebra_fill if r_idx % 2 == 0 else None
            for c_idx, v in enumerate(vals, start=1):
                cell = ws_fln.cell(row=r_idx, column=c_idx, value=v)
                cell.font = regular_font
                cell.border = thin_border
                if fill: cell.fill = fill
                cell.alignment = align_center if c_idx in [1, 2, 4, 5, 6] else align_left

        # -------------------------------------------------------------
        # SHEET 5: ATTENDANCE REGULARITY (ATTENDANCE)
        # -------------------------------------------------------------
        ws_att = wb.create_sheet(title="ATTENDANCE")
        ws_att.views.sheetView[0].showGridLines = True

        att_records = StudentAttendance.query.filter_by(class_section_id=class_section_id, term=1).all()
        att_map = {a.student_id: a for a in att_records}

        att_headers = ["Roll No", "Admission No", "Student Name", "Total Working Days", "Present Days", "Absent Days (Formula)", "Attendance % (Formula)", "Status Alert (Formula)"]
        for col_idx, h in enumerate(att_headers, start=1):
            cell = ws_att.cell(row=1, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border

        for r_idx, st in enumerate(students, start=2):
            rec = att_map.get(st.id)
            w = rec.working_days if rec else 110.0
            p = rec.present_days if rec else 0.0

            ws_att.cell(row=r_idx, column=1, value=st.roll_no).alignment = align_center
            ws_att.cell(row=r_idx, column=2, value=st.admission_no or "").alignment = align_center
            ws_att.cell(row=r_idx, column=3, value=st.name).alignment = align_left
            ws_att.cell(row=r_idx, column=4, value=w).alignment = align_center
            ws_att.cell(row=r_idx, column=5, value=p).alignment = align_center

            # Excel formulas:
            # Absent: =D{row}-E{row}
            # %: =(E{row}/D{row})*100
            # Status: =IF(G{row}<75,"WARNING (<75%)","GOOD")
            ws_att.cell(row=r_idx, column=6, value=f"=D{r_idx}-E{r_idx}").alignment = align_center
            pct_cell = ws_att.cell(row=r_idx, column=7, value=f"=(E{r_idx}/D{r_idx})*100")
            pct_cell.alignment = align_center
            pct_cell.number_format = "0.0"

            ws_att.cell(row=r_idx, column=8, value=f'=IF(G{r_idx}<75,"WARNING (<75%)","REGULAR")').alignment = align_center

            for c in range(1, 9):
                ws_att.cell(row=r_idx, column=c).border = thin_border
                ws_att.cell(row=r_idx, column=c).font = regular_font

        # -------------------------------------------------------------
        # SHEET 6: EXAMINATION BROADSHEET & RANKS (BROADSHEET)
        # -------------------------------------------------------------
        ws_broad = wb.create_sheet(title="BROADSHEET")
        ws_broad.views.sheetView[0].showGridLines = True

        broad_headers = ["Roll No", "Admission No", "Student Name"] + [s.code for s in subjects] + ["Grand Total", "Percentage", "Grade", "Rank (Formula)", "Result Status"]
        for col_idx, h in enumerate(broad_headers, start=1):
            cell = ws_broad.cell(row=1, column=col_idx, value=h)
            cell.font = header_font
            cell.fill = header_fill
            cell.alignment = align_center
            cell.border = thin_border

        b_sub_start = 4
        b_sub_end = b_sub_start + len(subjects) - 1
        b_tot_col = b_sub_end + 1
        b_pct_col = b_sub_end + 2
        b_grd_col = b_sub_end + 3
        b_rnk_col = b_sub_end + 4
        b_sta_col = b_sub_end + 5

        max_tot = len(subjects) * 20.0
        start_row = 2
        end_row = start_row + len(students) - 1
        tot_col_letter = get_column_letter(b_tot_col)

        for r_idx, st in enumerate(students, start=2):
            ws_broad.cell(row=r_idx, column=1, value=st.roll_no).alignment = align_center
            ws_broad.cell(row=r_idx, column=2, value=st.admission_no or "").alignment = align_center
            ws_broad.cell(row=r_idx, column=3, value=st.name).alignment = align_left

            for s_idx, sub in enumerate(subjects):
                c = b_sub_start + s_idx
                score = marks_map.get((st.id, sub.id), 0.0)
                cell = ws_broad.cell(row=r_idx, column=c, value=score)
                cell.alignment = align_center
                cell.number_format = "0.0"

            # Formula for Total: =SUM(D{r}:G{r})
            s_ltr = get_column_letter(b_sub_start)
            e_ltr = get_column_letter(b_sub_end)
            ws_broad.cell(row=r_idx, column=b_tot_col, value=f"=SUM({s_ltr}{r_idx}:{e_ltr}{r_idx})").alignment = align_center

            # Formula for %: =(H{r}/max_tot)*100
            pct_cell = ws_broad.cell(row=r_idx, column=b_pct_col, value=f"=({tot_col_letter}{r_idx}/{max_tot})*100")
            pct_cell.alignment = align_center
            pct_cell.number_format = "0.0"

            # Grade Formula: =IF(I{r}>=91,"A1",IF(I{r}>=81,"A2",IF(I{r}>=71,"B1",IF(I{r}>=61,"B2",IF(I{r}>=51,"C1",IF(I{r}>=41,"C2",IF(I{r}>=33,"D","E")))))))
            p_ltr = get_column_letter(b_pct_col)
            grd_formula = f'=IF({p_ltr}{r_idx}>=91,"A1",IF({p_ltr}{r_idx}>=81,"A2",IF({p_ltr}{r_idx}>=71,"B1",IF({p_ltr}{r_idx}>=61,"B2",IF({p_ltr}{r_idx}>=51,"C1",IF({p_ltr}{r_idx}>=41,"C2",IF({p_ltr}{r_idx}>=33,"D","E")))))))'
            ws_broad.cell(row=r_idx, column=b_grd_col, value=grd_formula).alignment = align_center

            # Rank Formula: =RANK(H{r}, $H$2:$H$40)
            ws_broad.cell(row=r_idx, column=b_rnk_col, value=f"=RANK({tot_col_letter}{r_idx}, ${tot_col_letter}${start_row}:${tot_col_letter}${end_row})").alignment = align_center

            # Status Formula: =IF(I{r}>=33, "PROMOTED", "ESSENTIAL REPEAT")
            ws_broad.cell(row=r_idx, column=b_sta_col, value=f'=IF({p_ltr}{r_idx}>=33,"PROMOTED","ESSENTIAL REPEAT")').alignment = align_center

            for c in range(1, b_sta_col + 1):
                ws_broad.cell(row=r_idx, column=c).border = thin_border
                ws_broad.cell(row=r_idx, column=c).font = regular_font

        # Auto-fit column widths for all sheets
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = max(len(str(cell.value or "")) for cell in col)
                col_letter = get_column_letter(col[0].column)
                sheet.column_dimensions[col_letter].width = max(max_len + 3, 12)

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output
