import datetime
from app.extensions import db
from app.models.student import Student
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.assessment import Assessment
from app.models.mark import StudentMark
from app.models.attendance import StudentAttendance

GRADE_SCALE = [
    (91.0, 100.0, "A1", "Outstanding"),
    (81.0, 90.99, "A2", "Excellent"),
    (71.0, 80.99, "B1", "Very Good"),
    (61.0, 70.99, "B2", "Good"),
    (51.0, 60.99, "C1", "Fair"),
    (41.0, 50.99, "C2", "Average"),
    (33.0, 40.99, "D", "Passing / Satisfactory"),
    (0.0, 32.99, "E", "Needs Improvement / Essential Repeat")
]

def assign_grade(percentage: float | None) -> tuple[str, str]:
    if percentage is None:
        return "Ab", "Absent"
    pct = round(percentage, 2)
    for lower, upper, grade, desc in GRADE_SCALE:
        if pct >= lower and pct <= upper:
            return grade, desc
    if pct > 100.0:
        return "A1", "Outstanding"
    return "E", "Needs Improvement / Essential Repeat"

class CalculationEngine:
    @staticmethod
    def calculate_pa_summary(class_section_id: int):
        """
        Calculates PA-1 to PA-4 summary, average, best-of, and scaled scores (out of 5/10).
        """
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        students = Student.query.filter_by(
            class_section_id=class_section_id,
            status="ACTIVE"
        ).order_by(Student.roll_no.asc()).all()

        pa_assessments = Assessment.query.filter_by(
            school_id=classroom.school_id,
            assessment_type="PERIODIC"
        ).all()
        pa_ids = [a.id for a in pa_assessments]

        subjects = Subject.query.filter_by(
            school_id=classroom.school_id,
            is_active=True
        ).order_by(Subject.id.asc()).all()

        marks = StudentMark.query.filter(
            StudentMark.class_section_id == class_section_id,
            StudentMark.assessment_id.in_(pa_ids)
        ).all()

        # Group by (student_id, subject_id, assessment_code)
        mark_dict = {}
        for m in marks:
            code = m.assessment.code if m.assessment else "PA"
            mark_dict[(m.student_id, m.subject_id, code)] = m

        summary = []
        for st in students:
            st_data = {
                "student_id": st.id,
                "roll_no": st.roll_no,
                "name": st.name,
                "subjects": {}
            }

            for sub in subjects:
                pa_scores = []
                scores_by_pa = {}
                for pa in ["PA1", "PA2", "PA3", "PA4"]:
                    m = mark_dict.get((st.id, sub.id, pa))
                    val = m.marks_obtained if (m and not m.is_absent and m.marks_obtained is not None) else None
                    scores_by_pa[pa] = val
                    if val is not None:
                        pa_scores.append(val)

                avg_score = round(sum(pa_scores) / len(pa_scores), 2) if pa_scores else 0.0
                best_score = max(pa_scores) if pa_scores else 0.0
                # Scale best score to 5 marks (20 -> 5)
                scaled_5 = round((best_score / 20.0) * 5.0, 2) if best_score > 0 else 0.0

                st_data["subjects"][sub.code] = {
                    "subject_name": sub.name,
                    "scores": scores_by_pa,
                    "average": avg_score,
                    "best": best_score,
                    "scaled_5": scaled_5
                }

            summary.append(st_data)

        return summary

    @staticmethod
    def calculate_annual_class_results(class_section_id: int):
        """
        Comprehensive calculation engine:
        - Aggregates all marks per student across subjects
        - Assigns grades per subject and overall
        - Computes grand totals, overall percentages, class ranks
        - Determines result status (PROMOTED, COMPARTMENT, ESSENTIAL_REPEAT)
        - Calculates class-level summary analytics
        """
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        students = Student.query.filter_by(
            class_section_id=class_section_id,
            status="ACTIVE"
        ).order_by(Student.roll_no.asc()).all()

        subjects = Subject.query.filter_by(
            school_id=classroom.school_id,
            is_active=True
        ).order_by(Subject.id.asc()).all()

        all_marks = StudentMark.query.filter_by(class_section_id=class_section_id).all()
        # Map: (student_id, subject_id) -> list of marks
        student_sub_marks = {}
        for m in all_marks:
            key = (m.student_id, m.subject_id)
            if key not in student_sub_marks:
                student_sub_marks[key] = []
            student_sub_marks[key].append(m)

        # Get attendance percentage for each student
        attendances = StudentAttendance.query.filter_by(
            class_section_id=class_section_id,
            term=1
        ).all()
        att_map = {a.student_id: a for a in attendances}

        roster = []
        subject_totals = {s.code: [] for s in subjects}

        for st in students:
            grand_total_obtained = 0.0
            grand_total_max = 0.0
            subject_results = {}
            failing_subjects_count = 0
            has_any_eval = False

            for sub in subjects:
                sub_marks_list = student_sub_marks.get((st.id, sub.id), [])
                
                sub_obtained = 0.0
                sub_max = 0.0
                all_absent = True

                for m in sub_marks_list:
                    if not m.is_absent and m.marks_obtained is not None:
                        sub_obtained += m.marks_obtained
                        all_absent = False
                    sub_max += m.max_marks

                if sub_max > 0:
                    has_any_eval = True
                    sub_pct = round((sub_obtained / sub_max) * 100.0, 1) if not all_absent else 0.0
                    sub_grade, sub_desc = assign_grade(sub_pct if not all_absent else None)
                    
                    if sub_pct < 33.0 and not all_absent:
                        failing_subjects_count += 1

                    subject_results[sub.code] = {
                        "subject_name": sub.name,
                        "marks_obtained": sub_obtained if not all_absent else None,
                        "max_marks": sub_max,
                        "percentage": sub_pct if not all_absent else None,
                        "grade": sub_grade,
                        "grade_desc": sub_desc,
                        "is_absent": all_absent
                    }

                    if not all_absent:
                        subject_totals[sub.code].append(sub_obtained)
                        grand_total_obtained += sub_obtained
                    grand_total_max += sub_max
                else:
                    subject_results[sub.code] = {
                        "subject_name": sub.name,
                        "marks_obtained": None,
                        "max_marks": 0.0,
                        "percentage": None,
                        "grade": "N/A",
                        "grade_desc": "Not Evaluated",
                        "is_absent": True
                    }

            overall_pct = round((grand_total_obtained / grand_total_max) * 100.0, 1) if grand_total_max > 0 else 0.0
            overall_grade, grade_desc = assign_grade(overall_pct if has_any_eval else None)

            # Performance / Result Status
            if not has_any_eval:
                status = "PENDING"
            elif failing_subjects_count == 0 and overall_pct >= 33.0:
                status = "PROMOTED"
            elif failing_subjects_count in [1, 2]:
                status = "COMPARTMENT"
            else:
                status = "ESSENTIAL_REPEAT"

            att_rec = att_map.get(st.id)
            att_pct = att_rec.percentage if att_rec else 0.0
            is_low_att = att_rec.is_low_attendance if att_rec else False

            roster.append({
                "student_id": st.id,
                "roll_no": st.roll_no,
                "name": st.name,
                "admission_no": st.admission_no,
                "subjects": subject_results,
                "grand_total_obtained": grand_total_obtained,
                "grand_total_max": grand_total_max,
                "overall_percentage": overall_pct,
                "overall_grade": overall_grade,
                "grade_desc": grade_desc,
                "status": status,
                "failing_subjects_count": failing_subjects_count,
                "attendance_percentage": att_pct,
                "is_low_attendance": is_low_att,
                "has_evaluation": has_any_eval
            })

        # Calculate Ranks based on overall_percentage and grand_total_obtained
        evaluated_students = [r for r in roster if r["has_evaluation"]]
        evaluated_students.sort(key=lambda x: (x["overall_percentage"], x["grand_total_obtained"]), reverse=True)

        current_rank = 1
        for idx, student_data in enumerate(evaluated_students):
            if idx > 0:
                prev = evaluated_students[idx - 1]
                if (student_data["overall_percentage"] == prev["overall_percentage"] and 
                    student_data["grand_total_obtained"] == prev["grand_total_obtained"]):
                    student_data["rank"] = prev["rank"]
                else:
                    student_data["rank"] = idx + 1
            else:
                student_data["rank"] = 1

        for r in roster:
            if not r["has_evaluation"]:
                r["rank"] = None

        # Re-sort roster by roll number for table display
        roster.sort(key=lambda x: x["roll_no"])

        # Grade distribution histogram
        grade_dist = {"A1": 0, "A2": 0, "B1": 0, "B2": 0, "C1": 0, "C2": 0, "D": 0, "E": 0}
        pct_list = []
        promoted_count = 0
        compartment_count = 0
        repeat_count = 0

        for r in roster:
            if r["has_evaluation"]:
                pct_list.append(r["overall_percentage"])
                g = r["overall_grade"]
                if g in grade_dist:
                    grade_dist[g] += 1
                if r["status"] == "PROMOTED":
                    promoted_count += 1
                elif r["status"] == "COMPARTMENT":
                    compartment_count += 1
                elif r["status"] == "ESSENTIAL_REPEAT":
                    repeat_count += 1

        class_mean_pct = round(sum(pct_list) / len(pct_list), 1) if pct_list else 0.0
        pass_pct = round((promoted_count / len(evaluated_students)) * 100.0, 1) if evaluated_students else 0.0

        # Subject averages
        sub_averages = {}
        for code, scores in subject_totals.items():
            sub_averages[code] = round(sum(scores) / len(scores), 1) if scores else 0.0

        return {
            "classroom": classroom.to_dict(),
            "summary_stats": {
                "total_students": len(students),
                "evaluated_count": len(evaluated_students),
                "class_mean_percentage": class_mean_pct,
                "pass_percentage": pass_pct,
                "promoted_count": promoted_count,
                "compartment_count": compartment_count,
                "essential_repeat_count": repeat_count,
                "grade_distribution": grade_dist,
                "subject_averages": sub_averages
            },
            "subjects": [s.to_dict() for s in subjects],
            "roster": roster
        }
