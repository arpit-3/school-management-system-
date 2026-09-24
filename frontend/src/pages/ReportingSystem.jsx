import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StudentDossierModal from "../components/StudentDossierModal";
import { AnnexureF1, AnnexureF2, AnnexureF3, AnnexureCS, AnnexureSS } from "../components/OfficialAnnexureReports";
import {
  FileText,
  Printer,
  ChevronLeft,
  ChevronRight,
  Download,
  Award,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Layers,
  School,
  Sparkles,
  User,
  Eye,
  BookOpen,
  Users
} from "lucide-react";

export default function ReportingSystem() {
  const { user } = useAuth();
  const [reportType, setReportType] = useState("ANNEXURE_CS"); // Default to Annexure - CS

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  
  // Annexures Data
  const [annexureF1Data, setAnnexureF1Data] = useState(null);
  const [annexureF2Data, setAnnexureF2Data] = useState(null);
  const [annexureF31Data, setAnnexureF31Data] = useState(null);
  const [annexureF32Data, setAnnexureF32Data] = useState(null);

  const [reportCard, setReportCard] = useState(null);
  const [classPacket, setClassPacket] = useState(null);
  const [broadsheet, setBroadsheet] = useState(null);
  const [schoolSummary, setSchoolSummary] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 360 Dossier Modal state
  const [dossierStudentId, setDossierStudentId] = useState(null);

  // Load student & class list
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [studRes, classRes] = await Promise.all([
          api.get("/students?per_page=100"),
          api.get("/classes")
        ]);
        const list = studRes.data.students || [];
        const classList = classRes.data.classes || [];
        setStudents(list);
        setClasses(classList);
        if (list.length > 0) {
          setSelectedStudentId(list[0].id);
        }
        if (classList.length > 0) {
          setSelectedClassId(classList[0].id);
        }
      } catch (err) {
        setError("Failed to load initial data.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Fetch Report Data based on reportType
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        if ((reportType === "ANNEXURE_F1" || reportType === "ANNEXURE_CS" || reportType === "ANNEXURE_SS") && selectedStudentId) {
          const res = await api.get(`/reports/annexure-f1/${selectedStudentId}`);
          if (res.data.status === "success") {
            setAnnexureF1Data(res.data.data);
          }
        } else if (reportType === "ANNEXURE_F2") {
          const res = await api.get(`/reports/annexure-f2?class_section_id=${selectedClassId || ""}`);
          if (res.data.status === "success") {
            setAnnexureF2Data(res.data.data);
          }
        } else if (reportType === "ANNEXURE_F3_1") {
          const res = await api.get("/reports/annexure-f3?class_group=1_2");
          if (res.data.status === "success") {
            setAnnexureF31Data(res.data.data);
          }
        } else if (reportType === "ANNEXURE_F3_2") {
          const res = await api.get("/reports/annexure-f3?class_group=3_5");
          if (res.data.status === "success") {
            setAnnexureF32Data(res.data.data);
          }
        } else if (reportType === "REPORT_CARD" && selectedStudentId) {
          const res = await api.get(`/reports/report-card/${selectedStudentId}`);
          if (res.data.status === "success") {
            setReportCard(res.data.data);
          }
        } else if (reportType === "CLASS_PACKET") {
          const res = await api.get(`/reports/full-detail-packet?class_section_id=${selectedClassId || ""}`);
          if (res.data.status === "success") {
            setClassPacket(res.data.data);
          }
        } else if (reportType === "BROADSHEET") {
          const res = await api.get(`/reports/class-broadsheet?class_section_id=${selectedClassId || ""}`);
          if (res.data.status === "success") {
            setBroadsheet(res.data.data);
          }
        } else if (reportType === "SCHOOL_SUMMARY") {
          const res = await api.get("/reports/school-summary");
          if (res.data.status === "success") {
            setSchoolSummary(res.data.data);
          }
        }
      } catch (err) {
        setError(err.response?.data?.error || "Failed to load report data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [reportType, selectedStudentId, selectedClassId]);

  // Navigate next / prev student
  const currentIndex = students.findIndex(s => s.id === selectedStudentId);
  const prevStudent = () => {
    if (currentIndex > 0) setSelectedStudentId(students[currentIndex - 1].id);
  };
  const nextStudent = () => {
    if (currentIndex < students.length - 1) setSelectedStudentId(students[currentIndex + 1].id);
  };

  const handlePrint = () => {
    window.print();
  };

  const renderSingleReportCard = (card, isPacket = false) => {
    const photoSrc = card.student?.photo_url
      ? (card.student.photo_url.startsWith("http") || card.student.photo_url.startsWith("data:")
          ? card.student.photo_url
          : `http://127.0.0.1:5000${card.student.photo_url}`)
      : null;

    return (
      <div
        key={card.student.id}
        className={`bg-white text-slate-900 border border-slate-200 rounded-2xl p-8 max-w-4xl mx-auto shadow-sm print:border-none print:shadow-none print:p-0 print:max-w-none ${
          isPacket ? "mb-12 print:mb-0 print:page-break" : ""
        }`}
        style={isPacket ? { pageBreakAfter: "always", breakAfter: "page" } : {}}
      >
        {/* Official Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 space-y-1">
          <div className="text-[11px] font-bold tracking-widest uppercase text-slate-600">
            Government of NCT of Delhi
          </div>
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900">
            {card.school.name}
          </h1>
          <div className="text-xs font-bold text-slate-700">
            School ID: <span className="font-mono">{card.school.code}</span> • Zone: {card.school.zone} • Session: {card.school.session}
          </div>
          <div className="inline-block mt-2 px-4 py-1 rounded-full bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider">
            Annual Assessment &amp; Progress Card ({card.student.class_section})
          </div>
        </div>

        {/* Student Bio Grid + Photo */}
        <div className="flex flex-col sm:flex-row items-start gap-4 border-b border-slate-200 py-4 my-2">
          {/* Photo Avatar */}
          <div className="shrink-0 flex flex-col items-center">
            <div className="w-20 h-24 rounded-lg border-2 border-slate-300 bg-slate-100 overflow-hidden flex items-center justify-center shadow-2xs">
              {photoSrc ? (
                <img src={photoSrc} alt={card.student.name} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center p-2 text-slate-400">
                  <User className="w-8 h-8 mx-auto mb-1 opacity-50" />
                  <span className="text-[8px] font-bold uppercase block leading-tight">Student Photo</span>
                </div>
              )}
            </div>
            {!isPacket && (
              <button
                type="button"
                onClick={() => setDossierStudentId(card.student.id)}
                className="mt-1.5 text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline print:hidden flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                <span>360° Profile</span>
              </button>
            )}
          </div>

          {/* Details Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Student Name</span>
              <button
                type="button"
                onClick={() => setDossierStudentId(card.student.id)}
                className="font-bold text-sm text-slate-900 hover:text-emerald-700 text-left transition print:pointer-events-none"
              >
                {card.student.name}
              </button>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Roll No</span>
              <span className="font-bold text-sm font-mono text-emerald-700">#{card.student.roll_no}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Admission / S.R. No</span>
              <span className="font-bold text-sm font-mono text-slate-900">{card.student.admission_no}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Class &amp; Section</span>
              <span className="font-bold text-sm text-slate-900">{card.student.class_section}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Father's Name</span>
              <span className="font-semibold text-slate-700">{card.student.father_name || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Mother's Name</span>
              <span className="font-semibold text-slate-700">{card.student.mother_name || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Date of Birth</span>
              <span className="font-semibold text-slate-700">{card.student.dob || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Class Teacher</span>
              <span className="font-semibold text-slate-700">{card.student.class_teacher || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Academic Performance Table */}
        <div className="my-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-2">
            Part 1: Scholastic Performance
          </h3>
          <table className="w-full border-collapse border border-slate-200 text-xs text-left">
            <thead className="bg-slate-50 text-slate-800">
              <tr>
                <th className="border border-slate-200 p-2 font-semibold">Subject</th>
                <th className="border border-slate-200 p-2 font-semibold text-center">Max Marks</th>
                <th className="border border-slate-200 p-2 font-semibold text-center">Marks Obtained</th>
                <th className="border border-slate-200 p-2 font-semibold text-center">Percentage</th>
                <th className="border border-slate-200 p-2 font-semibold text-center">Grade</th>
                <th className="border border-slate-200 p-2 font-semibold">Performance Descriptor</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(card.academic_evaluation?.subjects || {}).map(k => {
                const sub = card.academic_evaluation.subjects[k];
                return (
                  <tr key={k} className="border-b border-slate-200">
                    <td className="border border-slate-200 p-2 font-bold text-slate-900">
                      {sub.subject_name}
                    </td>
                    <td className="border border-slate-200 p-2 text-center font-mono">
                      {sub.max_marks}
                    </td>
                    <td className="border border-slate-200 p-2 text-center font-mono font-bold text-slate-900">
                      {sub.marks_obtained !== null ? sub.marks_obtained : "Ab"}
                    </td>
                    <td className="border border-slate-200 p-2 text-center font-mono font-bold">
                      {sub.percentage !== null ? `${sub.percentage}%` : "-"}
                    </td>
                    <td className="border border-slate-200 p-2 text-center font-bold text-xs">
                      {sub.grade}
                    </td>
                    <td className="border border-slate-200 p-2 text-slate-600">
                      {sub.grade_desc}
                    </td>
                  </tr>
                );
              })}
              <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-300">
                <td className="border border-slate-200 p-2">Grand Total / Overall</td>
                <td className="border border-slate-200 p-2 text-center font-mono">
                  {card.academic_evaluation?.grand_total_max}
                </td>
                <td className="border border-slate-200 p-2 text-center font-mono text-slate-900 font-bold">
                  {card.academic_evaluation?.grand_total_obtained}
                </td>
                <td className="border border-slate-200 p-2 text-center font-mono font-bold text-emerald-700">
                  {card.academic_evaluation?.overall_percentage}%
                </td>
                <td className="border border-slate-200 p-2 text-center font-bold text-sm">
                  {card.academic_evaluation?.overall_grade}
                </td>
                <td className="border border-slate-200 p-2 font-bold text-slate-800">
                  Class Rank: #{card.academic_evaluation?.rank || "-"} (of {card.academic_evaluation?.total_students || "-"})
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* FLN & Attendance Two-Column Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-4">
          {/* FLN Mission Buniyad Progress */}
          <div className="border border-slate-200 rounded-xl p-3 text-xs space-y-2">
            <span className="font-bold uppercase tracking-wider text-slate-700 block">
              Part 2: FLN Mission Buniyad Competency
            </span>
            <div className="space-y-1 text-[11px]">
              {Object.keys(card.fln_progress || {}).map(sub => {
                const fln = card.fln_progress[sub];
                return (
                  <div key={sub} className="flex justify-between border-b border-slate-100 py-1">
                    <span className="font-semibold text-slate-700">{sub}:</span>
                    <span className="font-bold text-slate-900">
                      Level {fln.level} ({fln.level_name})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Attendance Record */}
          <div className="border border-slate-200 rounded-xl p-3 text-xs space-y-2">
            <span className="font-bold uppercase tracking-wider text-slate-700 block">
              Part 3: Attendance Regularity Record
            </span>
            <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
              <div className="bg-slate-50 p-2 rounded">
                <span className="text-slate-500 block">Working</span>
                <span className="font-bold text-slate-900">{card.attendance?.working_days ?? 0}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <span className="text-slate-500 block">Present</span>
                <span className="font-bold text-slate-900">{card.attendance?.present_days ?? 0}</span>
              </div>
              <div className="bg-slate-50 p-2 rounded">
                <span className="text-slate-500 block">Percentage</span>
                <span className="font-bold text-emerald-700">{card.attendance?.percentage ?? 0}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Remarks & Result */}
        <div className="border border-slate-200 rounded-xl p-3 my-4 text-xs space-y-1">
          <div className="flex justify-between items-center mb-1">
            <span className="font-bold uppercase tracking-wider text-slate-700">Class Teacher Remarks:</span>
            <span className="font-bold text-xs px-2.5 py-0.5 rounded bg-emerald-600 text-white uppercase">
              Result: {card.academic_evaluation?.status || "PROMOTED"}
            </span>
          </div>
          <p className="text-slate-700 italic">"{card.teacher_remarks || "Consistently shows positive participation and learning progress."}"</p>
        </div>

        {/* Signature Blocks */}
        <div className="grid grid-cols-3 gap-6 text-center text-xs pt-8 border-t border-slate-200 mt-8">
          <div>
            <div className="h-8 border-b border-dashed border-slate-300 mb-1" />
            <span className="font-bold text-slate-800">Class Teacher Signature</span>
            <span className="text-[10px] text-slate-500 block">({card.student.class_teacher || "Teacher"})</span>
          </div>
          <div>
            <div className="h-8 border-b border-dashed border-slate-300 mb-1" />
            <span className="font-bold text-slate-800">Mentor / Inspector</span>
            <span className="text-[10px] text-slate-500 block">(Devender Singh)</span>
          </div>
          <div>
            <div className="h-8 border-b border-dashed border-slate-300 mb-1" />
            <span className="font-bold text-slate-800">Head of School (H.O.S.)</span>
            <span className="text-[10px] text-slate-500 block">({card.school.principal_name || "Principal"})</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col print:bg-white print:text-black">
      <div className="print:hidden">
        <Navbar />
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6 print:p-0 print:m-0 print:max-w-none">
        {/* Header Title & Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Module 12
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-600" />
                Official Reporting &amp; Report Card System
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Produce official MCD student report cards with photos, full-detail class packets, broadsheets, and print/PDF ready transcripts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="space-y-2 print:hidden">
          {/* Annexures Group (Official FLN Mission Buniyad) */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
              Official FLN Records
            </span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {[
                { key: "ANNEXURE_CS", label: "Annexure - CS (Case Study)", icon: FileText, badge: "Student" },
                { key: "ANNEXURE_SS", label: "Annexure - SS (Success Story)", icon: Award, badge: "Student" },
                { key: "ANNEXURE_F1", label: "Annexure - F1 (Student FLN Record)", icon: Sparkles, badge: "Student" },
                { key: "ANNEXURE_F2", label: "Annexure - F2 (Classwise FLN Record)", icon: Layers, badge: "Class" },
                { key: "ANNEXURE_F3_1", label: "Annexure - F3.1 (Schoolwise Class 1 & 2)", icon: School, badge: "School" },
                { key: "ANNEXURE_F3_2", label: "Annexure - F3.2 (Schoolwise Class 3 to 5)", icon: School, badge: "School" },
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = reportType === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setReportType(tab.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? "bg-emerald-600 text-white font-semibold shadow-xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-amber-400" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <a
              href={`http://127.0.0.1:5000/api/export/workbook?token=${localStorage.getItem("fln_access_token") || localStorage.getItem("token")}`}
              download
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Official Excel (.xlsx)</span>
            </a>
          </div>

          {/* Scholastic & Examination Group */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider bg-slate-100 px-2 py-0.5 rounded-md">
              Scholastic Assessment Cards & Registers
            </span>
            <div className="h-px bg-slate-200 flex-1"></div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "REPORT_CARD", label: "Annual Student Report Card (MCD)", icon: Award },
              { key: "CLASS_PACKET", label: "Class Full Detail Packet (PDF)", icon: Users },
              { key: "BROADSHEET", label: "Class Broadsheet Ledger", icon: Layers },
              { key: "SCHOOL_SUMMARY", label: "School Executive Summary", icon: School },
              { key: "EXCEL_EXPORT", label: "Excel Export Engine", icon: Download }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = reportType === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setReportType(tab.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? "bg-slate-900 text-white font-semibold shadow-xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ANNEXURE - CS (CASE STUDY) VIEW */}
        {reportType === "ANNEXURE_CS" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevStudent}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Student {currentIndex + 1} of {students.length}
                </span>
                <button
                  onClick={nextStudent}
                  disabled={currentIndex >= students.length - 1}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-600 font-semibold">Select Student:</label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      Roll #{s.roll_no}: {s.name} ({s.admission_no})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Case Study (Annexure - CS)</span>
                </button>
              </div>
            </div>

            {annexureF1Data && <AnnexureCS data={annexureF1Data} />}
          </div>
        )}

        {/* ANNEXURE - SS (SUCCESS STORY) VIEW */}
        {reportType === "ANNEXURE_SS" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevStudent}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Student {currentIndex + 1} of {students.length}
                </span>
                <button
                  onClick={nextStudent}
                  disabled={currentIndex >= students.length - 1}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-600 font-semibold">Select Student:</label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      Roll #{s.roll_no}: {s.name} ({s.admission_no})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Success Story (Annexure - SS)</span>
                </button>
              </div>
            </div>

            {annexureF1Data && <AnnexureSS data={annexureF1Data} />}
          </div>
        )}

        {/* ANNEXURE - F1 VIEW */}
        {reportType === "ANNEXURE_F1" && (
          <div className="space-y-4">
            {/* Student Switcher Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevStudent}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Student {currentIndex + 1} of {students.length}
                </span>
                <button
                  onClick={nextStudent}
                  disabled={currentIndex >= students.length - 1}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-600 font-semibold">Select Student:</label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      Roll #{s.roll_no}: {s.name} ({s.admission_no})
                    </option>
                  ))}
                </select>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Annexure F1</span>
                </button>
              </div>
            </div>

            {annexureF1Data && <AnnexureF1 data={annexureF1Data} />}
          </div>
        )}

        {/* ANNEXURE - F2 VIEW */}
        {reportType === "ANNEXURE_F2" && (
          <div className="space-y-4">
            {/* Class Switcher Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-600 font-semibold">Select Class &amp; Section:</label>
                <select
                  value={selectedClassId || ""}
                  onChange={(e) => setSelectedClassId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                >
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.display_name} ({c.total_students || 0} Students)
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Annexure F2</span>
              </button>
            </div>

            {annexureF2Data && <AnnexureF2 data={annexureF2Data} />}
          </div>
        )}

        {/* ANNEXURE - F3.1 VIEW */}
        {reportType === "ANNEXURE_F3_1" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3 print:hidden">
              <span className="text-xs font-bold text-slate-700">
                Schoolwide Aggregated Progress Record (Classes 1 &amp; 2)
              </span>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Annexure F3.1</span>
              </button>
            </div>

            {annexureF31Data && <AnnexureF3 data={annexureF31Data} />}
          </div>
        )}

        {/* ANNEXURE - F3.2 VIEW */}
        {reportType === "ANNEXURE_F3_2" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex items-center justify-between gap-3 print:hidden">
              <span className="text-xs font-bold text-slate-700">
                Schoolwide Aggregated Progress Record (Classes 3 to 5)
              </span>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Annexure F3.2</span>
              </button>
            </div>

            {annexureF32Data && <AnnexureF3 data={annexureF32Data} />}
          </div>
        )}

        {/* SINGLE REPORT CARD VIEW */}
        {reportType === "REPORT_CARD" && reportCard && (
          <div className="space-y-4">
            {/* Student Switcher Toolbar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <button
                  onClick={prevStudent}
                  disabled={currentIndex <= 0}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700">
                  Student {currentIndex + 1} of {students.length}
                </span>
                <button
                  onClick={nextStudent}
                  disabled={currentIndex >= students.length - 1}
                  className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-slate-600 font-semibold">Select Student:</label>
                <select
                  value={selectedStudentId || ""}
                  onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600"
                >
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      Roll #{s.roll_no}: {s.name} ({s.admission_no})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setDossierStudentId(selectedStudentId)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Open 360° Dossier</span>
                </button>
              </div>
            </div>

            {renderSingleReportCard(reportCard, false)}
          </div>
        )}

        {/* CLASS FULL DETAIL PACKET VIEW */}
        {reportType === "CLASS_PACKET" && classPacket && (
          <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
              <div>
                <span className="font-bold text-sm block">
                  Class Full Detail Packet: {classPacket.classroom?.display_name} ({classPacket.total_students} Students)
                </span>
                <span className="text-emerald-700">
                  Contains full individual report cards with photos, scholastic breakdowns, FLN levels, and attendance. Ready for bulk PDF printing.
                </span>
              </div>
              <button
                onClick={handlePrint}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition shrink-0"
              >
                <Printer className="w-4 h-4" />
                <span>Print All {classPacket.total_students} Report Cards</span>
              </button>
            </div>

            {classPacket.report_cards?.map(card => renderSingleReportCard(card, true))}
          </div>
        )}

        {/* BROADSHEET VIEW */}
        {reportType === "BROADSHEET" && broadsheet && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">
                Official Broadsheet &amp; Examination Ledger: {broadsheet.classroom.display_name}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Total Enrolled: {broadsheet.summary_stats.total_students} Students
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold text-center">Roll</th>
                    <th className="py-2.5 px-3 font-semibold">Student Name</th>
                    {broadsheet.subjects.map(s => (
                      <th key={s.code} className="py-2.5 px-2 font-semibold text-center">{s.code}</th>
                    ))}
                    <th className="py-2.5 px-2 font-semibold text-center">Total</th>
                    <th className="py-2.5 px-2 font-semibold text-center">%</th>
                    <th className="py-2.5 px-2 font-semibold text-center">Grade</th>
                    <th className="py-2.5 px-2 font-semibold text-center">Rank</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {broadsheet.roster.map(r => (
                    <tr key={r.student_id} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 text-center text-emerald-700 font-bold">
                        <button
                          type="button"
                          onClick={() => setDossierStudentId(r.student_id)}
                          className="hover:underline text-emerald-700"
                        >
                          #{r.roll_no}
                        </button>
                      </td>
                      <td className="py-2 px-3 font-sans font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setDossierStudentId(r.student_id)}
                          className="hover:underline text-left hover:text-emerald-700"
                        >
                          {r.name}
                        </button>
                      </td>
                      {broadsheet.subjects.map(s => (
                        <td key={s.code} className="py-2 px-2 text-center">
                          {r.subjects[s.code]?.marks_obtained ?? "Ab"}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center font-bold text-slate-900">{r.grand_total_obtained}</td>
                      <td className="py-2 px-2 text-center font-bold text-emerald-700">{r.overall_percentage}%</td>
                      <td className="py-2 px-2 text-center font-bold">{r.overall_grade}</td>
                      <td className="py-2 px-2 text-center font-bold text-amber-700">{r.rank ? `#${r.rank}` : "-"}</td>
                      <td className="py-2 px-3 font-sans font-semibold text-[10px] text-emerald-700">{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SCHOOL EXECUTIVE SUMMARY VIEW */}
        {reportType === "SCHOOL_SUMMARY" && schoolSummary && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="border-b border-slate-200 pb-4">
              <h3 className="text-lg font-bold text-slate-900">{schoolSummary.school.name}</h3>
              <p className="text-xs text-slate-500">
                Official School Executive Report • Zone: {schoolSummary.school.zone} • Principal: {schoolSummary.school.principal_name}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Enrollment</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{schoolSummary.metrics.total_students}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Total Classrooms</span>
                <span className="text-2xl font-bold text-slate-900 mt-1 block">{schoolSummary.metrics.total_classes}</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">School Mean Performance</span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">{schoolSummary.metrics.school_mean_percentage}%</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 block">Pass Rate</span>
                <span className="text-2xl font-bold text-emerald-700 mt-1 block">{schoolSummary.metrics.school_pass_percentage}%</span>
              </div>
            </div>
          </div>
        )}

        {/* EXCEL EXPORT ENGINE VIEW */}
        {reportType === "EXCEL_EXPORT" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Download className="w-5 h-5 text-emerald-600" />
                  Excel Export Engine (Original Workbook Replication)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Generates an openpyxl-powered multi-sheet workbook with live formula preservation (SUM, AVERAGE, IF, RANK).
                </p>
              </div>

              <a
                href={`http://127.0.0.1:5000/api/export/workbook?token=${localStorage.getItem("token")}`}
                download
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-2xs transition"
              >
                <Download className="w-4 h-4" />
                <span>Export Full Workbook (.xlsx)</span>
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="font-bold text-emerald-700 block text-sm">Sheet 1: ENTRY</span>
                <p className="text-slate-600 text-xs">
                  Institutional master details: school code, principal, teacher, and statutory working days (110 / 220).
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="font-bold text-emerald-700 block text-sm">Sheet 2: STUDENT</span>
                <p className="text-slate-600 text-xs">
                  Full student roster with roll numbers, admission codes, parents' names, DOB, and category tags.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="font-bold text-emerald-700 block text-sm">Sheet 3: PASHEET</span>
                <p className="text-slate-600 text-xs">
                  Scholastic marks ledger with dynamic <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">=SUM()</code> and <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">=AVERAGE()</code> formulas.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="font-bold text-emerald-700 block text-sm">Sheet 4: FLN</span>
                <p className="text-slate-600 text-xs">
                  Mission Buniyad baseline competencies across Hindi, Mathematics, and English (Levels 1 to 5).
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="font-bold text-emerald-700 block text-sm">Sheet 5: ATTENDANCE</span>
                <p className="text-slate-600 text-xs">
                  Attendance matrix preserving <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">=D-E</code>, <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">=(E/D)*100</code>, and <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">=IF()</code> alert formulas.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
                <span className="font-bold text-emerald-700 block text-sm">Sheet 6: BROADSHEET</span>
                <p className="text-slate-600 text-xs">
                  Complete examination ledger with <code className="text-emerald-700 font-mono bg-emerald-50 px-1 py-0.5 rounded">=RANK()</code>, 8-tier grade assignment, and result status.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* 360 Student Dossier Modal */}
      {dossierStudentId && (
        <StudentDossierModal
          studentId={dossierStudentId}
          onClose={() => setDossierStudentId(null)}
          onUpdated={() => {
            if (selectedStudentId === dossierStudentId && reportType === "REPORT_CARD") {
              api.get(`/reports/report-card/${selectedStudentId}`).then(res => {
                if (res.data.status === "success") setReportCard(res.data.data);
              });
            }
          }}
        />
      )}
    </div>
  );
}
