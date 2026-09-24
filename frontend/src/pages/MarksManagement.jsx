import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StudentDossierModal from "../components/StudentDossierModal";
import {
  Award,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Lock,
  Unlock,
  Search,
  BookOpen,
  Calendar,
  Layers,
  Percent,
  TrendingUp,
  UserX,
  Sparkles,
  Eye
} from "lucide-react";

export default function MarksManagement() {
  const { user, hasRole } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState("");

  const [sheetData, setSheetData] = useState(null);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dossierStudentId, setDossierStudentId] = useState(null);

  const canEdit = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER");
  const canLock = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN");

  // Load initial dropdowns
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // Classes
        const resClasses = await api.get("/classrooms");
        const classList = resClasses.data.classrooms || [];
        setClasses(classList);
        const c3a = classList.find(c => c.class_name === "III" && c.section_name === "A") || classList[0];
        if (c3a) setSelectedClassId(c3a.id);

        // Assessments (PA, Term, Internal)
        const resAss = await api.get("/assessments");
        const allAss = resAss.data.assessments || [];
        // Filter out pure FLN level assessments from marks entry
        const markAss = allAss.filter(a => a.assessment_type !== "FLN");
        setAssessments(markAss);
        const pa1 = markAss.find(a => a.code === "PA1") || markAss[0];
        if (pa1) setSelectedAssessmentId(pa1.id);

        // Subjects
        const resSub = await api.get("/subjects");
        const subList = resSub.data.subjects || [];
        setSubjects(subList);
        const hin = subList.find(s => s.code === "HIN") || subList[0];
        if (hin) setSelectedSubjectId(hin.id);

      } catch (err) {
        setError("Failed to load initial configuration.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Fetch Marks Sheet
  const fetchMarksSheet = async () => {
    if (!selectedClassId || !selectedAssessmentId || !selectedSubjectId) return;
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/marks/sheet", {
        params: {
          class_section_id: selectedClassId,
          assessment_id: selectedAssessmentId,
          subject_id: selectedSubjectId
        }
      });
      if (res.data.status === "success") {
        setSheetData(res.data.data);
        setRows(res.data.data.rows || []);
        setStats(res.data.data.stats || null);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load marks sheet.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarksSheet();
  }, [selectedClassId, selectedAssessmentId, selectedSubjectId]);

  // Handle Marks Input
  const handleMarksChange = (studentId, val) => {
    if (!canEdit || sheetData?.is_locked) return;

    setRows(prev => prev.map(r => {
      if (r.student_id !== studentId) return r;

      if (val === "" || val === null) {
        return {
          ...r,
          marks_obtained: null,
          percentage: null,
          is_absent: false,
          isDirty: true
        };
      }

      const numVal = parseFloat(val);
      const maxM = r.max_marks || 20;
      const pct = numVal >= 0 && maxM > 0 ? Math.round((numVal / maxM) * 100 * 10) / 10 : null;

      return {
        ...r,
        marks_obtained: numVal,
        percentage: pct,
        is_absent: false,
        isDirty: true
      };
    }));
  };

  // Toggle Absent
  const handleToggleAbsent = (studentId) => {
    if (!canEdit || sheetData?.is_locked) return;

    setRows(prev => prev.map(r => {
      if (r.student_id !== studentId) return r;
      const nextAbsent = !r.is_absent;
      return {
        ...r,
        is_absent: nextAbsent,
        marks_obtained: nextAbsent ? null : r.marks_obtained,
        percentage: nextAbsent ? null : r.percentage,
        isDirty: true
      };
    }));
  };

  // Save All Changes
  const handleSaveAll = async () => {
    if (!canEdit || sheetData?.is_locked) return;
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const entries = rows.map(r => ({
        student_id: r.student_id,
        marks_obtained: r.marks_obtained,
        is_absent: r.is_absent,
        remarks: r.remarks
      }));

      const res = await api.post("/marks/bulk", {
        class_section_id: selectedClassId,
        assessment_id: selectedAssessmentId,
        subject_id: selectedSubjectId,
        entries
      });

      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchMarksSheet();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save marks.");
    } finally {
      setSaving(false);
    }
  };

  // Lock / Unlock Toggle
  const handleToggleLock = async () => {
    if (!canLock) return;
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const nextState = !sheetData?.is_locked;
      const res = await api.post("/marks/lock", {
        class_section_id: selectedClassId,
        assessment_id: selectedAssessmentId,
        subject_id: selectedSubjectId,
        is_locked: nextState
      });

      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchMarksSheet();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to lock/unlock marks.");
    } finally {
      setSaving(false);
    }
  };

  // Sync from workbook
  const handleSyncWorkbook = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");
      const res = await api.post("/marks/sync-workbook");
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchMarksSheet();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to sync marks from workbook.");
    } finally {
      setSaving(false);
    }
  };

  // Filter students
  const filteredRows = rows.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      String(r.roll_no).includes(q) ||
      String(r.admission_no).includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Header Title & Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Module 8
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Academic Marks & Score Management
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Record, validate, and finalize marks for Periodic Assessments, Term Exams, and Internal Evaluation components.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canLock && (
              <button
                onClick={handleToggleLock}
                disabled={saving}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                  sheetData?.is_locked
                    ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs"
                }`}
              >
                {sheetData?.is_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{sheetData?.is_locked ? "Unlock Marks Sheet" : "Finalize & Lock Sheet"}</span>
              </button>
            )}

            {canLock && (
              <button
                onClick={handleSyncWorkbook}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sync PASHEET</span>
              </button>
            )}

            {canEdit && !sheetData?.is_locked && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving..." : "Save Marks Sheet"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Selection Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Classroom</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} ({c.total_students} Students)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Assessment</label>
              <select
                value={selectedAssessmentId}
                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
              >
                {assessments.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.code} • Max {a.max_marks} M)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Subject</label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white"
              >
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* Real-time KPI Stats Banner */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-slate-500 block">Total Students</span>
              <span className="text-xl font-bold text-slate-900">{stats.total_students}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-emerald-700 block">Evaluated</span>
              <span className="text-xl font-bold text-slate-900">{stats.evaluated_count}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-amber-700 block">Absent (Ab)</span>
              <span className="text-xl font-bold text-slate-900">{stats.absent_count}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-sky-700 block">Class Average</span>
              <span className="text-xl font-bold text-slate-900">
                {stats.average_marks} <span className="text-xs font-normal text-slate-500">/ {sheetData?.assessment?.max_marks}</span>
              </span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-teal-700 block">Highest Marks</span>
              <span className="text-xl font-bold text-slate-900">{stats.highest_marks}</span>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs">
              <span className="text-[11px] font-semibold text-rose-700 block">Lowest Marks</span>
              <span className="text-xl font-bold text-slate-900">{stats.lowest_marks}</span>
            </div>
          </div>
        )}

        {/* Lock Warning Banner */}
        {sheetData?.is_locked && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>This marks sheet is officially locked and finalized. Modifying marks requires unlocking by School Admin.</span>
            </div>
          </div>
        )}

        {/* Marks Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold w-12 text-center">Roll</th>
                  <th className="py-3.5 px-4 font-semibold">Student Name</th>
                  <th className="py-3.5 px-4 font-semibold">Admission No</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Marks Obtained</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Max Marks</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Percentage</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Absent</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map(row => {
                  const maxM = row.max_marks || 20;
                  const isInvalid = row.marks_obtained > maxM || row.marks_obtained < 0;

                  return (
                    <tr key={row.student_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono font-bold text-center text-emerald-700">
                        <button
                          type="button"
                          onClick={() => setDossierStudentId(row.student_id)}
                          className="hover:underline text-emerald-700"
                        >
                          #{row.roll_no}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setDossierStudentId(row.student_id)}
                          className="font-semibold text-slate-900 hover:text-emerald-700 text-left transition flex items-center gap-1.5"
                        >
                          <span>{row.name}</span>
                          <Eye className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-emerald-600" />
                        </button>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {row.admission_no || "N/A"}
                      </td>

                      {/* Marks Input */}
                      <td className="py-2.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxM}
                            disabled={row.is_absent || !canEdit || sheetData?.is_locked}
                            value={row.marks_obtained !== null && row.marks_obtained !== undefined ? row.marks_obtained : ""}
                            onChange={(e) => handleMarksChange(row.student_id, e.target.value)}
                            placeholder={row.is_absent ? "Ab" : "-"}
                            className={`w-20 text-center py-1.5 px-2 rounded-xl text-xs font-bold outline-none transition ${
                              row.is_absent
                                ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                : isInvalid
                                ? "bg-rose-50 border border-rose-300 text-rose-700"
                                : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white"
                            }`}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-center text-slate-500">
                        {maxM}
                      </td>

                      {/* Percentage */}
                      <td className="py-3 px-4 text-center">
                        {row.percentage !== null && row.percentage !== undefined ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              row.percentage >= 75
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : row.percentage >= 40
                                ? "bg-sky-50 text-sky-700 border border-sky-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {row.percentage}%
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Absent Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={!canEdit || sheetData?.is_locked}
                          onClick={() => handleToggleAbsent(row.student_id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition ${
                            row.is_absent
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          {row.is_absent ? "Absent" : "Present"}
                        </button>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {row.is_absent ? (
                          <span className="text-amber-700 text-[11px] font-medium">Marked Absent</span>
                        ) : row.marks_obtained !== null ? (
                          <span className="text-emerald-700 text-[11px] font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Recorded
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending Entry</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length === 0 && !loading && (
            <div className="p-12 text-center text-slate-400 text-xs">
              No students found matching your search.
            </div>
          )}
        </div>

      </main>

      {/* 360 Student Dossier Modal */}
      {dossierStudentId && (
        <StudentDossierModal
          studentId={dossierStudentId}
          onClose={() => setDossierStudentId(null)}
          onUpdated={() => fetchMarksSheet()}
        />
      )}
    </div>
  );
}
