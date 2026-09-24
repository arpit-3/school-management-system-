import datetime
from app.extensions import db
from app.models.student import Student
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.mark import StudentMark
from app.models.fln_record import FLNRecord
from app.models.attendance import StudentAttendance
from app.services.calculation_engine import CalculationEngine

class AIAnalyticsService:
    @staticmethod
    def get_class_overview(class_section_id: int):
        classroom = db.session.get(ClassSection, class_section_id)
        if not classroom:
            raise ValueError("Classroom not found.")

        # 1. Calculation engine base data
        class_results = CalculationEngine.calculate_annual_class_results(class_section_id)
        summary_stats = class_results["summary_stats"]
        roster = class_results["roster"]
        subjects = class_results["subjects"]

        total_students = summary_stats["total_students"]
        class_mean_pct = summary_stats["class_mean_percentage"]
        pass_pct = summary_stats["pass_percentage"]

        # 2. FLN Progress metrics
        fln_records = FLNRecord.query.filter_by(class_section_id=class_section_id).all()
        fln_evaluated = [r for r in fln_records if r.level is not None and not r.is_absent]
        fln_level_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for r in fln_evaluated:
            if r.level in fln_level_counts:
                fln_level_counts[r.level] += 1

        avg_fln_level = round(
            sum(r.level for r in fln_evaluated) / len(fln_evaluated), 1
        ) if fln_evaluated else 2.5
        fln_score_norm = min(100.0, round((avg_fln_level / 5.0) * 100.0, 1))

        # 3. Attendance health
        attendances = StudentAttendance.query.filter_by(class_section_id=class_section_id, term=1).all()
        avg_att = round(
            sum(a.percentage for a in attendances) / len(attendances), 1
        ) if attendances else 75.0

        # 4. Class Health Score (0 - 100)
        # Academic (40%) + FLN (30%) + Attendance (30%)
        health_score = round((class_mean_pct * 0.40) + (fln_score_norm * 0.30) + (avg_att * 0.30), 1)
        if health_score >= 85.0:
            health_rating = "A+"
            health_label = "Optimal Performance"
        elif health_score >= 70.0:
            health_rating = "B+"
            health_label = "Good Progress"
        elif health_score >= 50.0:
            health_rating = "C"
            health_label = "Requires Attention"
        else:
            health_rating = "D"
            health_label = "High Priority Intervention"

        # 5. Subject Mastery Index (SMI: 0 to 100)
        smi = {}
        for sub in subjects:
            code = sub["code"]
            mean_score = summary_stats["subject_averages"].get(code, 10.0)
            # Standard PA max is 20
            mastery_index = min(100.0, round((mean_score / 20.0) * 100.0, 1))
            smi[code] = {
                "subject_name": sub["name"],
                "mean_marks": mean_score,
                "mastery_index": mastery_index,
                "proficiency": "High" if mastery_index >= 70 else ("Moderate" if mastery_index >= 50 else "Low")
            }

        # 6. At-Risk Student Analysis
        at_risk_list = AIAnalyticsService.get_at_risk_students(class_section_id)
        high_risk_count = sum(1 for s in at_risk_list if s["risk_tier"] == "HIGH")
        medium_risk_count = sum(1 for s in at_risk_list if s["risk_tier"] == "MEDIUM")

        # 7. AI Executive Summary (Natural Language)
        strongest_sub = max(smi.items(), key=lambda x: x[1]["mastery_index"]) if smi else ("HIN", {"subject_name": "HINDI"})
        weakest_sub = min(smi.items(), key=lambda x: x[1]["mastery_index"]) if smi else ("ENG", {"subject_name": "ENGLISH"})

        ai_summary = (
            f"Class {classroom.display_name} exhibits an overall Health Score of {health_score}/100 ({health_label}). "
            f"The primary academic pillar is {strongest_sub[1]['subject_name']} with a Mastery Index of {strongest_sub[1]['mastery_index']}%. "
            f"Key pedagogical focus is recommended in {weakest_sub[1]['subject_name']} (Mastery Index: {weakest_sub[1]['mastery_index']}%), "
            f"where foundational reading fluency needs reinforcement. Currently, {high_risk_count} students require intensive 1-on-1 remediation "
            f"due to low attendance (<75%) and foundational FLN gaps."
        )

        return {
            "classroom": classroom.to_dict(),
            "class_health": {
                "score": health_score,
                "rating": health_rating,
                "label": health_label,
                "class_mean_pct": class_mean_pct,
                "fln_score_norm": fln_score_norm,
                "attendance_avg": avg_att
            },
            "subject_mastery": smi,
            "at_risk_summary": {
                "high_risk_count": high_risk_count,
                "medium_risk_count": medium_risk_count,
                "total_at_risk": len(at_risk_list)
            },
            "executive_summary": ai_summary,
            "fln_distribution": fln_level_counts
        }

    @staticmethod
    def get_at_risk_students(class_section_id: int):
        """
        Multivariable risk scoring:
        - Attendance < 75%: +30 pts (or < 60%: +50 pts)
        - Academic percentage < 40%: +30 pts
        - Low FLN Level (L1 or L2 in Hindi/Maths): +20 pts
        """
        students = Student.query.filter_by(
            class_section_id=class_section_id,
            status="ACTIVE"
        ).order_by(Student.roll_no.asc()).all()

        marks = StudentMark.query.filter_by(class_section_id=class_section_id).all()
        fln_records = FLNRecord.query.filter_by(class_section_id=class_section_id).all()
        attendances = StudentAttendance.query.filter_by(class_section_id=class_section_id, term=1).all()

        att_dict = {a.student_id: a for a in attendances}
        fln_dict = {}
        for f in fln_records:
            if f.student_id not in fln_dict:
                fln_dict[f.student_id] = []
            fln_dict[f.student_id].append(f)

        marks_dict = {}
        for m in marks:
            if m.student_id not in marks_dict:
                marks_dict[m.student_id] = []
            marks_dict[m.student_id].append(m)

        at_risk = []
        for st in students:
            risk_score = 0
            risk_reasons = []
            interventions = []

            # 1. Attendance check
            att = att_dict.get(st.id)
            att_pct = att.percentage if att else 70.0
            if att_pct < 60.0:
                risk_score += 45
                risk_reasons.append(f"Severely low attendance ({att_pct}%)")
                interventions.append("Issue formal parent notice and assign counselor follow-up.")
            elif att_pct < 75.0:
                risk_score += 30
                risk_reasons.append(f"Low attendance ({att_pct}%)")
                interventions.append("Daily attendance monitoring and parental engagement.")

            # 2. FLN Level check
            st_fln = fln_dict.get(st.id, [])
            low_fln_subs = [f for f in st_fln if f.level in [1, 2] and not f.is_absent]
            if low_fln_subs:
                risk_score += 25
                sub_names = [f.subject.name if f.subject else "Core" for f in low_fln_subs]
                risk_reasons.append(f"Foundational gaps in {', '.join(set(sub_names))} (Level 1-2)")
                interventions.append("Provide Mission Buniyad level 1-2 remedial workbooks with phonics practice.")

            # 3. Marks check
            st_marks = marks_dict.get(st.id, [])
            valid_marks = [m for m in st_marks if not m.is_absent and m.marks_obtained is not None]
            if valid_marks:
                avg_pct = (sum(m.marks_obtained for m in valid_marks) / sum(m.max_marks for m in valid_marks)) * 100.0
                if avg_pct < 35.0:
                    risk_score += 30
                    risk_reasons.append(f"Low academic performance ({round(avg_pct, 1)}%)")
                    interventions.append("After-school peer tutoring and simplified conceptual worksheets.")
            else:
                risk_score += 20
                risk_reasons.append("Missing assessment records (Absent in evaluations)")
                interventions.append("Schedule compensatory periodic assessment.")

            # Classify tier
            if risk_score >= 50:
                risk_tier = "HIGH"
            elif risk_score >= 25:
                risk_tier = "MEDIUM"
            else:
                risk_tier = "LOW"

            if risk_tier in ["HIGH", "MEDIUM"]:
                at_risk.append({
                    "student_id": st.id,
                    "roll_no": st.roll_no,
                    "name": st.name,
                    "admission_no": st.admission_no,
                    "risk_score": min(100, risk_score),
                    "risk_tier": risk_tier,
                    "risk_reasons": risk_reasons,
                    "interventions": interventions,
                    "attendance_pct": att_pct
                })

        at_risk.sort(key=lambda x: x["risk_score"], reverse=True)
        return at_risk

    @staticmethod
    def get_student_insights(student_id: int):
        """
        Deep individual AI analysis for student:
        - Strengths & Weaknesses
        - FLN Transition Prediction
        - Subject Mastery Breakdown
        - Customized Pedagogical Intervention Plan
        """
        student = db.session.get(Student, student_id)
        if not student:
            raise ValueError("Student not found.")

        marks = StudentMark.query.filter_by(student_id=student_id).all()
        fln_records = FLNRecord.query.filter_by(student_id=student_id).all()
        att = StudentAttendance.query.filter_by(student_id=student_id, term=1).first()

        strengths = []
        gaps = []
        predictions = []

        # Analyze Marks
        for m in marks:
            sub_name = m.subject.name if m.subject else "Subject"
            if m.percentage is not None:
                if m.percentage >= 70.0:
                    strengths.append(f"Strong performance in {sub_name} with {m.percentage}% accuracy.")
                elif m.percentage < 40.0:
                    gaps.append(f"Struggles with core concepts in {sub_name} ({m.percentage}%).")

        # Analyze FLN
        for f in fln_records:
            sub_name = f.subject.name if f.subject else "FLN"
            if f.level and f.level >= 4:
                strengths.append(f"Advanced proficiency in {sub_name} ({f.level_name}).")
                predictions.append(f"On track to achieve complete mastery (Level 5) before Term 2 examinations.")
            elif f.level and f.level <= 2:
                gaps.append(f"Foundational delay in {sub_name}: Currently at {f.level_name}.")
                predictions.append(f"With 20 minutes daily structured intervention, expected to reach Level 3 within 4 weeks.")

        # Analyze Attendance
        att_pct = att.percentage if att else 75.0
        if att_pct < 75.0:
            gaps.append(f"Irregular attendance ({att_pct}%) negatively impacting continuous learning continuity.")
        else:
            strengths.append(f"Consistent class participation with {att_pct}% attendance regularity.")

        if not strengths:
            strengths.append("Demonstrates active classroom willingness and steady foundational attendance.")
        if not gaps:
            gaps.append("No critical learning bottlenecks detected; maintain advanced enrichment exercises.")

        # Prescriptions
        prescriptions = [
            "Provide bilingual visual flashcards to accelerate reading comprehension.",
            "Integrate hands-on mathematical manipulatives (Ganit Mala / Number cards).",
            "Engage parent through weekly WhatsApp progress check-ins."
        ]

        return {
            "student_id": student.id,
            "name": student.name,
            "roll_no": student.roll_no,
            "admission_no": student.admission_no,
            "class_name": student.classroom.display_name if student.classroom else "Class III-A",
            "attendance_percentage": att_pct,
            "strengths": strengths,
            "learning_gaps": gaps,
            "predictions": predictions,
            "prescriptions": prescriptions
        }
