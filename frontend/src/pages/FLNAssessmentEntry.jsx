import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StudentDossierModal from "../components/StudentDossierModal";
import { StudentPassportPhoto } from "../components/OfficialAnnexureReports";
import {
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Award,
  BookOpen,
  Calculator,
  Languages,
  UserCheck,
  Search,
  Filter,
  Layers,
  Eye,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  ArrowRight,
  Send,
  Lightbulb,
  Check,
  ChevronRight,
  Calendar
} from "lucide-react";

export default function FLNAssessmentEntry() {
  const { user, hasRole } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState("");

  const [subjects, setSubjects] = useState([]);
  const [matrix, setMatrix] = useState([]);
  const [summary, setSummary] = useState({});

  // View Tab Mode: "MATRIX" | "REMARKS" | "CLASSWISE_PROGRESS"
  const [activeTab, setActiveTab] = useState("MATRIX");

  // Classwise Student Progression State
  const [classProgress, setClassProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  // Remarks State: map of studentId -> string
  const [remarksMap, setRemarksMap] = useState({});
  const [savingRemarkStudentId, setSavingRemarkStudentId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("ALL"); // ALL, L1, L2, L3, L4, L5
  const [dossierStudentId, setDossierStudentId] = useState(null);

  const canEdit = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER");

  // Quick preset suggestions for teacher remarks
  const QUICK_REMARK_PRESETS = [
    "Improving reading fluency steadily.",
    "Needs number recognition practice (10-99).",
    "Fluent in story comprehension & vocabulary.",
    "Practicing 2-digit addition & subtraction.",
    "Active learner with high classroom participation.",
    "Needs phonological reinforcement in English.",
    "Advancing rapidly from Level 1 to Level 2.",
    "Regular home practice guided with parents."
  ];

  // Load initial dropdowns
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        // Classes
        const resClasses = await api.get("/classrooms");
        const classList = resClasses.data.classrooms || resClasses.data.classes || [];
        setClasses(classList);

        // Default to Class III-A if found
        const c3a = classList.find(c => c.class_name === "III" && c.section_name === "A") || classList[0];
        if (c3a) setSelectedClassId(c3a.id);

        // FLN Assessments
        const resAss = await api.get("/assessments", { params: { assessment_type: "FLN" } });
        const assList = resAss.data.assessments || [];
        setAssessments(assList);

        const baseAss = assList.find(a => a.code === "FLN_BASELINE") || assList[0];
        if (baseAss) setSelectedAssessmentId(baseAss.id);

      } catch (err) {
        setError("Failed to load classes or assessments.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Fetch Matrix whenever class or assessment changes
  const fetchMatrix = async () => {
    if (!selectedClassId || !selectedAssessmentId) return;
    try {
      setLoading(true);
      setError("");
      const [resMatrix, resSummary] = await Promise.all([
        api.get("/fln/matrix", {
          params: { class_section_id: selectedClassId, assessment_id: selectedAssessmentId }
        }),
        api.get("/fln/summary", {
          params: { class_section_id: selectedClassId, assessment_id: selectedAssessmentId }
        })
      ]);

      if (resMatrix.data.status === "success") {
        const mat = resMatrix.data.data.matrix || [];
        setMatrix(mat);
        setSubjects(resMatrix.data.data.subjects || []);

        // Initialize remarks map from existing matrix data
        const rems = {};
        mat.forEach(row => {
          // Check if any subject has remarks
          let rText = "";
          Object.values(row.subjects || {}).forEach(s => {
            if (s.remarks) rText = s.remarks;
          });
          rems[row.student_id] = rText;
        });
        setRemarksMap(rems);
      }
      if (resSummary.data.status === "success") {
        setSummary(resSummary.data.summary || {});
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load FLN matrix.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Classwise Student Progression data
  const fetchClassProgress = async () => {
    if (!selectedClassId) return;
    try {
      setLoadingProgress(true);
      const res = await api.get("/fln/class-students-progress", {
        params: { class_section_id: selectedClassId }
      });
      if (res.data.status === "success") {
        setClassProgress(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch class progression:", err);
    } finally {
      setLoadingProgress(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
    if (activeTab === "CLASSWISE_PROGRESS") {
      fetchClassProgress();
    }
  }, [selectedClassId, selectedAssessmentId, activeTab]);

  // Handle cell level selection
  const handleLevelChange = (studentId, subjectCode, newLevel, isAbsent = false) => {
    if (!canEdit) return;

    setMatrix(prev => prev.map(row => {
      if (row.student_id !== studentId) return row;

      const currentSub = row.subjects[subjectCode] || {};
      const updatedSub = {
        ...currentSub,
        level: isAbsent ? null : newLevel,
        is_absent: isAbsent,
        isDirty: true
      };

      return {
        ...row,
        subjects: {
          ...row.subjects,
          [subjectCode]: updatedSub
        }
      };
    }));
  };

  // Handle single student remark change in state
  const handleRemarkChange = (studentId, text) => {
    setRemarksMap(prev => ({
      ...prev,
      [studentId]: text
    }));
  };

  // Append preset chip text to remark
  const appendPresetRemark = (studentId, preset) => {
    setRemarksMap(prev => {
      const current = prev[studentId] || "";
      const updated = current ? `${current} ${preset}` : preset;
      return { ...prev, [studentId]: updated };
    });
  };

  // Save single student's remark to backend
  const handleSaveSingleRemark = async (studentId) => {
    try {
      setSavingRemarkStudentId(studentId);
      setError("");
      setSuccessMsg("");

      const res = await api.post("/fln/student-remarks", {
        class_section_id: selectedClassId,
        assessment_id: selectedAssessmentId,
        remarks_list: [
          { student_id: studentId, remarks: remarksMap[studentId] || "" }
        ]
      });

      if (res.data.status === "success") {
        setSuccessMsg("Teacher remark saved successfully.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save remark.");
    } finally {
      setSavingRemarkStudentId(null);
    }
  };

  // Bulk Save all modified cells and remarks
  const handleSaveAll = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const entries = [];
      matrix.forEach(row => {
        const studentRemark = remarksMap[row.student_id] || "";
        Object.keys(row.subjects).forEach(code => {
          const subData = row.subjects[code];
          if (subData && (subData.isDirty || subData.level !== null || subData.is_absent || studentRemark)) {
            entries.push({
              student_id: row.student_id,
              subject_id: subData.subject_id,
              level: subData.level,
              is_absent: subData.is_absent,
              remarks: studentRemark
            });
          }
        });
      });

      if (entries.length === 0) {
        setSuccessMsg("No modifications detected to save.");
        setSaving(false);
        return;
      }

      const res = await api.post("/fln/matrix", {
        class_section_id: selectedClassId,
        assessment_id: selectedAssessmentId,
        entries
      });

      if (res.data.status === "success") {
        setSuccessMsg("All FLN evaluation levels and teacher remarks saved successfully!");
        fetchMatrix();
        if (activeTab === "CLASSWISE_PROGRESS") fetchClassProgress();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save FLN entries.");
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
      const res = await api.post("/fln/sync-workbook");
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchMatrix();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to sync FLN records from workbook.");
    } finally {
      setSaving(false);
    }
  };

  // Filter students by name, roll number, or FLN level
  const filteredMatrix = matrix.filter(row => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesSearch = (
        row.name.toLowerCase().includes(q) ||
        String(row.roll_no).includes(q) ||
        String(row.admission_no).includes(q)
      );
      if (!matchesSearch) return false;
    }

    if (levelFilter !== "ALL") {
      const targetLvl = parseInt(levelFilter.replace("L", ""), 10);
      const hasLevel = Object.values(row.subjects || {}).some(s => s.level === targetLvl);
      if (!hasLevel) return false;
    }

    return true;
  });

  const getSubjectIcon = (code) => {
    switch (code) {
      case "HIN": return <BookOpen className="w-4 h-4 text-amber-600" />;
      case "MATH": return <Calculator className="w-4 h-4 text-emerald-600" />;
      case "ENG": return <Languages className="w-4 h-4 text-indigo-600" />;
      default: return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Header Title & Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Module 7
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-emerald-600" />
                FLN Mission Buniyad Assessment &amp; Remarks Engine
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Comprehensive evaluation matrix, individual teacher remarks, and classwise student progression trajectory.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {hasRole("SUPER_ADMIN", "SCHOOL_ADMIN") && (
              <button
                onClick={handleSyncWorkbook}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sync Workbook</span>
              </button>
            )}

            {canEdit && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? "Saving Changes..." : "Save All Levels & Remarks"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* --- NAVIGATION TABS --- */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab("MATRIX")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "MATRIX"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>1. Level Matrix Grid</span>
            </button>

            <button
              onClick={() => setActiveTab("REMARKS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "REMARKS"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>2. Teacher Remarks &amp; Feedback</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-700/40 text-white font-mono">
                {matrix.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("CLASSWISE_PROGRESS")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === "CLASSWISE_PROGRESS"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>3. Classwise Student FLN Progression</span>
            </button>
          </div>

          {/* Classroom Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-600">Class:</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 outline-none focus:border-emerald-600"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.display_name} ({c.total_students} Students)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selectors Bar (Assessment Round, Level Filter, Search) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            {activeTab !== "CLASSWISE_PROGRESS" && (
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Assessment Round</label>
                <select
                  value={selectedAssessmentId}
                  onChange={(e) => setSelectedAssessmentId(e.target.value)}
                  className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium outline-none focus:border-emerald-600 focus:bg-white font-semibold"
                >
                  {assessments.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-slate-600 font-semibold mb-1">Filter by Level</label>
              <div className="flex items-center gap-1">
                {["ALL", "L1", "L2", "L3", "L4", "L5"].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setLevelFilter(lvl)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition ${
                      levelFilter === lvl
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student by name or roll..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: LEVEL MATRIX GRID */}
        {/* ========================================================================= */}
        {activeTab === "MATRIX" && (
          <div className="space-y-6">
            {/* Real-time Summary Cards (Hindi, Maths, English) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.keys(summary).map((code) => {
                const s = summary[code];
                return (
                  <div key={code} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getSubjectIcon(code)}
                        <h3 className="text-sm font-bold text-slate-900">{s.subject_name}</h3>
                      </div>
                      <span className="text-xs font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                        Evaluated: {s.total}
                      </span>
                    </div>

                    <div className="grid grid-cols-6 gap-1.5 text-center">
                      {[
                        { label: "L1", count: s.L1, color: "text-rose-700 bg-rose-50 border-rose-200" },
                        { label: "L2", count: s.L2, color: "text-orange-700 bg-orange-50 border-orange-200" },
                        { label: "L3", count: s.L3, color: "text-amber-700 bg-amber-50 border-amber-200" },
                        { label: "L4", count: s.L4, color: "text-teal-700 bg-teal-50 border-teal-200" },
                        { label: "L5", count: s.L5, color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                        { label: "Ab", count: s.Ab, color: "text-slate-600 bg-slate-100 border-slate-200" }
                      ].map((lvl) => (
                        <div key={lvl.label} className={`p-1.5 rounded-xl border ${lvl.color}`}>
                          <div className="text-[10px] font-semibold text-slate-500">{lvl.label}</div>
                          <div className="text-xs font-bold">{lvl.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Matrix Table with Teacher Remark Input */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold w-12 text-center">Roll</th>
                      <th className="py-3.5 px-4 font-semibold w-48">Student Name</th>
                      {subjects.map(sub => (
                        <th key={sub.code} className="py-3.5 px-4 font-semibold text-center w-48">
                          <div className="inline-flex items-center gap-1.5">
                            {getSubjectIcon(sub.code)}
                            <span>{sub.name} Level</span>
                          </div>
                        </th>
                      ))}
                      <th className="py-3.5 px-4 font-semibold">Teacher's Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMatrix.map(row => (
                      <tr key={row.student_id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-bold text-center text-emerald-700">
                          <button
                            type="button"
                            onClick={() => setDossierStudentId(row.student_id)}
                            className="hover:underline text-emerald-700 font-bold"
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
                          <div className="text-[10px] font-mono text-slate-500">
                            Adm: {row.admission_no || "N/A"}
                          </div>
                        </td>

                        {subjects.map(sub => {
                          const rec = row.subjects[sub.code] || {};
                          const currentLevel = rec.level;
                          const isAbsent = rec.is_absent;

                          return (
                            <td key={sub.code} className="py-2.5 px-4 text-center">
                              <div className="inline-flex items-center justify-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200">
                                {[1, 2, 3, 4, 5].map(lvl => (
                                  <button
                                    key={lvl}
                                    type="button"
                                    disabled={!canEdit}
                                    onClick={() => handleLevelChange(row.student_id, sub.code, lvl, false)}
                                    className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                                      !isAbsent && currentLevel === lvl
                                        ? "bg-emerald-600 text-white shadow-xs"
                                        : "text-slate-600 hover:text-slate-900 hover:bg-white"
                                    }`}
                                  >
                                    L{lvl}
                                  </button>
                                ))}
                                <button
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => handleLevelChange(row.student_id, sub.code, null, true)}
                                  className={`px-2 h-7 rounded-lg text-[10px] font-semibold transition ${
                                    isAbsent
                                      ? "bg-rose-100 text-rose-700 border border-rose-300 font-bold"
                                      : "text-slate-500 hover:text-slate-900 hover:bg-white"
                                  }`}
                                >
                                  Ab
                                </button>
                              </div>
                            </td>
                          );
                        })}

                        {/* Inline Teacher's Remark Column */}
                        <td className="py-2.5 px-4">
                          <input
                            type="text"
                            value={remarksMap[row.student_id] || ""}
                            onChange={(e) => handleRemarkChange(row.student_id, e.target.value)}
                            placeholder="Add pedagogical observation / remark..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredMatrix.length === 0 && !loading && (
                <div className="p-12 text-center text-slate-400 text-xs">
                  No students found matching your search.
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TEACHER REMARKS & FEEDBACK ENGINE */}
        {/* ========================================================================= */}
        {activeTab === "REMARKS" && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 font-semibold">
                <Lightbulb className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Provide personalized qualitative feedback and suggested interventions for each student for Round {selectedAssessmentId}. You can click suggestion chips to auto-fill.
                </span>
              </div>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 shadow-2xs transition"
              >
                Save All Teacher Remarks
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredMatrix.map(st => {
                const currentRemark = remarksMap[st.student_id] || "";
                const isSavingThis = savingRemarkStudentId === st.student_id;

                return (
                  <div
                    key={st.student_id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-emerald-300 transition"
                  >
                    <div>
                      {/* Student Card Header */}
                      <div className="flex items-start justify-between gap-3 pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <StudentPassportPhoto
                            student={{ id: st.student_id, name: st.name }}
                            className="w-10 h-12 rounded-lg"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-emerald-700">#{st.roll_no}</span>
                              <h4 className="font-bold text-sm text-slate-900">{st.name}</h4>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">Adm: {st.admission_no}</span>
                          </div>
                        </div>

                        {/* Current Level Badges */}
                        <div className="flex items-center gap-1">
                          {Object.keys(st.subjects || {}).map(subCode => {
                            const s = st.subjects[subCode];
                            return (
                              <span
                                key={subCode}
                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {subCode}: {s.is_absent ? "Ab" : (s.level ? `L${s.level}` : "-")}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Remark Textarea */}
                      <div className="mt-3 space-y-2">
                        <label className="text-xs font-bold text-slate-700 block">
                          Teacher's Observation &amp; Qualitative Remark:
                        </label>
                        <textarea
                          rows={3}
                          value={currentRemark}
                          onChange={(e) => handleRemarkChange(st.student_id, e.target.value)}
                          placeholder="Write feedback, reading milestones, mathematical challenges, or recommendations..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:border-emerald-600 focus:bg-white resize-none"
                        />
                      </div>

                      {/* Quick Suggestion Chips */}
                      <div className="mt-2 space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Quick Suggestion Tags (Click to Append):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_REMARK_PRESETS.slice(0, 4).map((preset, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => appendPresetRemark(st.student_id, preset)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 text-[10px] font-semibold transition border border-slate-200"
                            >
                              + {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setDossierStudentId(st.student_id)}
                        className="text-xs text-emerald-700 hover:text-emerald-800 font-bold underline flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View 360° Profile</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSaveSingleRemark(st.student_id)}
                        disabled={isSavingThis}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition shadow-2xs disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isSavingThis ? "Saving..." : "Save Remark"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CLASSWISE STUDENT FLN PROGRESSION */}
        {/* ========================================================================= */}
        {activeTab === "CLASSWISE_PROGRESS" && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Classwise FLN Student Progression Cards ({classProgress?.classroom?.display_name || "Active Class"})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Multi-round assessment progression trajectory tracking Hindi, Mathematics, and English mastery levels.
                </p>
              </div>

              <button
                onClick={fetchClassProgress}
                disabled={loadingProgress}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingProgress ? "animate-spin" : ""}`} />
                <span>Reload</span>
              </button>
            </div>

            {/* Student Cards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(classProgress?.students || []).map(st => (
                <div
                  key={st.student_id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between hover:border-emerald-300 hover:shadow-xs transition"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <StudentPassportPhoto
                          student={{ id: st.student_id, name: st.name, photo_url: st.photo_url }}
                          className="w-12 h-14 rounded-lg"
                        />
                        <div>
                          <span className="text-xs font-mono font-bold text-emerald-700">#{st.roll_no}</span>
                          <h4 className="font-bold text-sm text-slate-900">{st.name}</h4>
                          <span className="text-[10px] text-slate-500 font-mono">Adm: {st.admission_no}</span>
                        </div>
                      </div>

                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          st.status_tag === "Advanced Mastery"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : st.status_tag === "Remedial Attention"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {st.status_tag}
                      </span>
                    </div>

                    {/* Latest Levels Snapshot */}
                    <div className="grid grid-cols-3 gap-2 my-3 text-center">
                      <div className="bg-amber-50/60 border border-amber-200 p-2 rounded-xl">
                        <span className="text-[10px] font-bold text-amber-800 block">Hindi</span>
                        <span className="text-sm font-black text-slate-900">
                          {st.latest_hindi_level ? `Level ${st.latest_hindi_level}` : "N/A"}
                        </span>
                      </div>
                      <div className="bg-emerald-50/60 border border-emerald-200 p-2 rounded-xl">
                        <span className="text-[10px] font-bold text-emerald-800 block">Maths</span>
                        <span className="text-sm font-black text-slate-900">
                          {st.latest_maths_level ? `Level ${st.latest_maths_level}` : "N/A"}
                        </span>
                      </div>
                      <div className="bg-indigo-50/60 border border-indigo-200 p-2 rounded-xl">
                        <span className="text-[10px] font-bold text-indigo-800 block">English</span>
                        <span className="text-sm font-black text-slate-900">
                          {st.latest_english_level ? `Level ${st.latest_english_level}` : "N/A"}
                        </span>
                      </div>
                    </div>

                    {/* Assessment Rounds Progress Timeline */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Rounds Progress History:
                      </span>
                      <div className="space-y-1">
                        {(st.rounds || []).map(r => (
                          <div
                            key={r.assessment_id}
                            className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 text-xs border border-slate-100"
                          >
                            <span className="font-semibold text-slate-700 text-[11px] truncate max-w-[110px]">
                              {r.assessment_name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono">
                              <span className="text-amber-700 font-bold">H:{r.hindi?.level || "-"}</span>
                              <span className="text-emerald-700 font-bold">M:{r.maths?.level || "-"}</span>
                              <span className="text-indigo-700 font-bold">E:{r.english?.level || "-"}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Latest Teacher's Remark */}
                    {st.latest_remark && (
                      <div className="mt-3 bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                          Teacher's Remark:
                        </span>
                        <p className="text-slate-800 font-medium italic">"{st.latest_remark}"</p>
                      </div>
                    )}
                  </div>

                  {/* Footer Button */}
                  <button
                    onClick={() => setDossierStudentId(st.student_id)}
                    className="w-full py-2 rounded-xl bg-slate-50 hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open 360° Profile &amp; Test Copies</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {(!classProgress?.students || classProgress.students.length === 0) && !loadingProgress && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
                No class progression records found for this classroom.
              </div>
            )}
          </div>
        )}

      </main>

      {/* 360 Student Dossier Modal */}
      {dossierStudentId && (
        <StudentDossierModal
          studentId={dossierStudentId}
          onClose={() => setDossierStudentId(null)}
          onUpdated={() => {
            fetchMatrix();
            fetchClassProgress();
          }}
        />
      )}
    </div>
  );
}

