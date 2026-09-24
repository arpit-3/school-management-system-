import re
from app.extensions import db
from app.models.student import Student
from app.models.classroom import ClassSection
from app.models.subject import Subject
from app.models.mark import StudentMark
from app.models.fln_record import FLNRecord
from app.models.attendance import StudentAttendance
from app.services.calculation_engine import CalculationEngine
from app.services.ai_analytics_service import AIAnalyticsService

class AIChatService:
    @staticmethod
    def process_query(message: str, class_section_id: int = 1):
        q = message.lower().strip()
        classroom = db.session.get(ClassSection, class_section_id)
        # If the class has 0 students, look for Class III-A or the one with students
        if not classroom or Student.query.filter_by(class_section_id=classroom.id).count() == 0:
            active_class = ClassSection.query.filter_by(class_name="III", section_name="A").first()
            if not active_class:
                active_class = ClassSection.query.first()
            if active_class:
                classroom = active_class
                class_section_id = active_class.id

        # 1. Intent: ATTENDANCE BELOW 75%
        if any(w in q for w in ["attendance", "present", "absent", "hazri", "attendence"]) and any(w in q for w in ["below", "less", "low", "<", "75", "kam", "warning", "shortage"]):
            attendances = StudentAttendance.query.filter(
                StudentAttendance.class_section_id == class_section_id,
                StudentAttendance.percentage < 75.0
            ).order_by(StudentAttendance.percentage.asc()).all()

            rows = []
            for a in attendances:
                st = a.student
                if st:
                    rows.append({
                        "roll_no": st.roll_no,
                        "name": st.name,
                        "present_days": a.present_days,
                        "working_days": a.working_days,
                        "percentage": f"{a.percentage}%",
                        "status": "Critical Shortage" if a.percentage < 60 else "Warning (<75%)"
                    })

            if rows:
                reply = f"I identified **{len(rows)} students** in {classroom.display_name} with attendance below the statutory 75% threshold."
            else:
                reply = f"All active students in **{classroom.display_name}** currently meet or exceed the statutory 75% attendance threshold."

            recommendations = [
                "Issue formal parent attendance notices.",
                "Schedule weekly mentor counseling sessions.",
                "Verify if student is engaged in migrant seasonal leave."
            ]
            return {
                "reply": reply,
                "intent": "LOW_ATTENDANCE",
                "data_type": "TABLE",
                "data": rows,
                "recommendations": recommendations
            }

        # 2. Intent: TOPPERS / HIGHEST MARKS
        if any(w in q for w in ["top", "highest", "best", "rank 1", "topper", "first", "sabse jyada", "toppers"]):
            calc = CalculationEngine.calculate_annual_class_results(class_section_id)
            ranked = sorted([r for r in calc.get("roster", []) if r.get("rank")], key=lambda x: x["rank"])
            top_3 = ranked[:5]

            rows = []
            for r in top_3:
                rows.append({
                    "rank": f"#{r['rank']}",
                    "roll_no": r["roll_no"],
                    "name": r["name"],
                    "total": f"{r['grand_total_obtained']} / {r['grand_total_max']}",
                    "percentage": f"{r['overall_percentage']}%",
                    "grade": r["overall_grade"]
                })

            if top_3:
                reply = f"Here are the top academic rankers for **{classroom.display_name}**. **{top_3[0]['name']}** leads the class with **{top_3[0]['overall_percentage']}%** (Grade {top_3[0]['overall_grade']})."
            else:
                reply = f"No student examination marks recorded yet for {classroom.display_name}."

            recommendations = [
                "Recognize top achievers in morning school assembly.",
                "Nominate for advanced talent enrichment workshops.",
                "Assign as peer mentors for FLN study groups."
            ]
            return {
                "reply": reply,
                "intent": "TOPPERS",
                "data_type": "TABLE",
                "data": rows,
                "recommendations": recommendations
            }

        # 3. Intent: AT-RISK STUDENTS / FAILING
        if any(w in q for w in ["risk", "fail", "failing", "danger", "khatra", "weak", "repeat", "compartment"]):
            at_risk = AIAnalyticsService.get_at_risk_students(class_section_id)
            high_risk = [s for s in at_risk if s["risk_tier"] == "HIGH"]

            rows = []
            for s in high_risk[:6]:
                rows.append({
                    "roll_no": s["roll_no"],
                    "name": s["name"],
                    "risk_score": f"{s['risk_score']} pts",
                    "tier": s["risk_tier"],
                    "primary_issue": s["risk_reasons"][0] if s["risk_reasons"] else "N/A"
                })

            reply = f"Our AI Early Warning Engine flagged **{len(at_risk)} at-risk students** in {classroom.display_name}, with **{len(high_risk)} students** in the HIGH risk tier requiring immediate instructional and parental intervention."
            recommendations = [
                "Initiate daily remedial classes in core reading and numeracy.",
                "Conduct mandatory teacher-parent conferences.",
                "Supply simplified pictorial learning materials."
            ]
            return {
                "reply": reply,
                "intent": "AT_RISK",
                "data_type": "TABLE",
                "data": rows,
                "recommendations": recommendations
            }

        # 4. Intent: FLN / MISSION BUNIYAD
        if any(w in q for w in ["fln", "buniyad", "level 1", "level 2", "reading", "maths level", "hindi level"]):
            fln_records = FLNRecord.query.filter_by(class_section_id=class_section_id).all()
            l1_l2 = [f for f in fln_records if f.level in [1, 2] and not f.is_absent]

            # Group by student
            st_fln = {}
            for f in l1_l2:
                if f.student:
                    if f.student_id not in st_fln:
                        st_fln[f.student_id] = {"roll_no": f.student.roll_no, "name": f.student.name, "gaps": []}
                    st_fln[f.student_id]["gaps"].append(f"{f.subject.name if f.subject else 'Core'}: Level {f.level}")

            rows = []
            for sid, info in list(st_fln.items())[:8]:
                rows.append({
                    "roll_no": info["roll_no"],
                    "name": info["name"],
                    "foundational_gaps": ", ".join(info["gaps"])
                })

            reply = f"Under Mission Buniyad, **{len(st_fln)} students** are currently performing at foundational Levels 1 or 2 and require targeted literacy & numeracy acceleration."
            recommendations = [
                "Deploy 30-minute daily Mission Buniyad workbook drills.",
                "Utilize Ganit Mala and flashcard-assisted phonics.",
                "Administer FLN mid-term progress assessment."
            ]
            return {
                "reply": reply,
                "intent": "FLN_GAPS",
                "data_type": "TABLE",
                "data": rows,
                "recommendations": recommendations
            }

        # 5. Intent: CLASS AVERAGE / OVERVIEW
        if any(w in q for w in ["average", "mean", "summary", "overview", "overall", "health", "pass", "result"]):
            calc = CalculationEngine.calculate_annual_class_results(class_section_id)
            stats = calc["summary_stats"]

            kpi_data = [
                {"metric": "Class Mean Percentage", "value": f"{stats['class_mean_percentage']}%"},
                {"metric": "Overall Pass Rate", "value": f"{stats['pass_percentage']}%"},
                {"metric": "Total Enrolled", "value": f"{stats['total_students']} Students"},
                {"metric": "Promoted Students", "value": f"{stats['promoted_count']} Students"},
                {"metric": "Compartment Students", "value": f"{stats['compartment_count']} Students"},
                {"metric": "Essential Repeat", "value": f"{stats['essential_repeat_count']} Students"}
            ]

            reply = (
                f"**{classroom.display_name} Performance Summary**:\n"
                f"- Class Mean Score: **{stats['class_mean_percentage']}%**\n"
                f"- Pass Rate: **{stats['pass_percentage']}%** ({stats['promoted_count']} Promoted of {stats['evaluated_count']} evaluated)\n"
                f"- Subject Averages: Hindi ({stats['subject_averages'].get('HIN', 0)}/20), Maths ({stats['subject_averages'].get('MATH', 0)}/20), EVS ({stats['subject_averages'].get('EVS', 0)}/20), English ({stats['subject_averages'].get('ENG', 0)}/20)."
            )
            recommendations = [
                "Focus on bridging English reading comprehension.",
                "Maintain strong foundational numeracy practices in Mathematics.",
                "Track students on the borderline of compartment."
            ]
            return {
                "reply": reply,
                "intent": "PERFORMANCE_SUMMARY",
                "data_type": "METRICS",
                "data": kpi_data,
                "recommendations": recommendations
            }

        # 6. Intent: SPECIFIC STUDENT SEARCH (e.g. "Naksh", "Roll 1")
        match_roll = re.search(r'\b(?:roll|no|#)?\s*([0-9]{1,2})\b', q)
        student = None
        if match_roll:
            roll = int(match_roll.group(1))
            student = Student.query.filter_by(class_section_id=class_section_id, roll_no=roll).first()

        if not student:
            # Search by name match
            words = [w for w in q.split() if len(w) > 3 and w not in ["tell", "about", "show", "what", "find", "score"]]
            for w in words:
                student = Student.query.filter(
                    Student.class_section_id == class_section_id,
                    Student.name.ilike(f"%{w}%")
                ).first()
                if student:
                    break

        if student:
            insights = AIAnalyticsService.get_student_insights(student.id)
            att = StudentAttendance.query.filter_by(student_id=student.id, term=1).first()
            att_val = f"{att.percentage}%" if att else "N/A"

            reply = (
                f"**Student Dossier: {student.name} (Roll #{student.roll_no})**\n"
                f"- **Admission No**: {student.admission_no}\n"
                f"- **Attendance**: {att_val} ({'Good' if att and att.percentage >= 75 else 'Warning'})\n"
                f"- **Key Strength**: {insights['strengths'][0] if insights['strengths'] else 'Steady progress'}\n"
                f"- **Learning Gap**: {insights['learning_gaps'][0] if insights['learning_gaps'] else 'No major bottleneck'}\n"
                f"- **FLN Prediction**: {insights['predictions'][0] if insights['predictions'] else 'Expected to progress steadily'}"
            )
            return {
                "reply": reply,
                "intent": "STUDENT_PROFILE",
                "data_type": "PROFILE",
                "data": {
                    "student_id": student.id,
                    "name": student.name,
                    "roll_no": student.roll_no,
                    "admission_no": student.admission_no,
                    "attendance": att_val,
                    "strengths": insights["strengths"][:2],
                    "gaps": insights["learning_gaps"][:2]
                },
                "recommendations": insights["prescriptions"]
            }

        # 7. Fallback General Assistance
        reply = (
            f"Hello! I am your **AI School Assessment & Analytics Assistant** for **{classroom.display_name}**.\n\n"
            f"You can ask me questions like:\n"
            f"- *'Which students scored highest in the class?'*\n"
            f"- *'Show me students with attendance below 75%'*\n"
            f"- *'Who needs improvement in FLN Mission Buniyad?'*\n"
            f"- *'Which students are at risk of failing?'*\n"
            f"- *'What is the overall performance and class average?'*\n"
            f"- *'Tell me about Roll 1 or Naksh'*"
        )
        return {
            "reply": reply,
            "intent": "GENERAL_HELP",
            "data_type": None,
            "data": None,
            "recommendations": [
                "Ask: 'Who has low attendance?'",
                "Ask: 'Show class toppers'",
                "Ask: 'Who is at risk?'"
            ]
        }
