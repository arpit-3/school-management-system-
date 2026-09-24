import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StudentDossierModal from "../components/StudentDossierModal";
import {
  CalendarCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Clock,
  TrendingDown,
  TrendingUp,
  UserCheck,
  ShieldAlert,
  Calendar,
  Layers,
  Settings,
  Sliders,
  Check,
  Eye,
  ChevronRight,
  Sparkles,
  Zap
} from "lucide-react";

export default function AttendanceManagement() {
  const { user, hasRole } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  
  // View Modes: "SINGLE_MONTH" or "MATRIX"
  const [viewMode, setViewMode] = useState("SINGLE_MONTH");

  // Selected Month / Term
  const [selectedMonth, setSelectedMonth] = useState("APR");
  const [term, setTerm] = useState(1);
  const [workingDays, setWorkingDays] = useState(22);

  // Month Catalog
  const [monthCatalog, setMonthCatalog] = useState([
    { code: "APR", label: "April", term: 1, default_days: 22, is_month: true },
    { code: "MAY", label: "May", term: 1, default_days: 10, is_month: true },
    { code: "JUL", label: "July", term: 1, default_days: 24, is_month: true },
    { code: "AUG", label: "August", term: 1, default_days: 23, is_month: true },
    { code: "SEP", label: "September", term: 1, default_days: 22, is_month: true },
    { code: "TERM_1", label: "Term 1 (Cumulative)", term: 1, default_days: 110, is_month: false },
    { code: "OCT", label: "October", term: 2, default_days: 20, is_month: true },
    { code: "NOV", label: "November", term: 2, default_days: 22, is_month: true },
    { code: "DEC", label: "December", term: 2, default_days: 21, is_month: true },
    { code: "JAN", label: "January", term: 2, default_days: 20, is_month: true },
    { code: "FEB", label: "February", term: 2, default_days: 22, is_month: true },
    { code: "MAR", label: "March", term: 2, default_days: 23, is_month: true },
    { code: "TERM_2", label: "Term 2 (Cumulative)", term: 2, default_days: 110, is_month: false },
    { code: "ANNUAL", label: "Annual (Cumulative)", term: 0, default_days: 220, is_month: false }
  ]);

  const [sheetData, setSheetData] = useState(null);
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [matrixData, setMatrixData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLowOnly, setFilterLowOnly] = useState(false);

  // 360 Student Dossier Modal
  const [dossierStudentId, setDossierStudentId] = useState(null);

  const canEdit = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER");

  // Load classrooms and months catalog
  useEffect(() => {
    const initData = async () => {
      try {
        setLoading(true);
        const [resClasses, resMonths] = await Promise.all([
          api.get("/classrooms"),
          api.get("/attendance/months").catch(() => null)
        ]);

        const list = resClasses.data.classrooms || [];
        setClasses(list);
        const c3a = list.find(c => c.class_name === "III" && c.section_name === "A") || list[0];
        if (c3a) setSelectedClassId(c3a.id);

        if (resMonths?.data?.months) {
          setMonthCatalog(resMonths.data.months);
        }
      } catch (err) {
        setError("Failed to load initial classroom data.");
      } finally {
        setLoading(false);
      }
    };
    initData();
  }, []);

  // Fetch Attendance Sheet for selected month
  const fetchAttendance = async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setError("");

      if (viewMode === "SINGLE_MONTH") {
        const res = await api.get("/attendance/sheet", {
          params: {
            class_section_id: selectedClassId,
            term,
            month: selectedMonth
          }
        });
        if (res.data.status === "success") {
          setSheetData(res.data.data);
          setRows(res.data.data.rows || []);
          setStats(res.data.data.stats || null);
          if (res.data.data.default_working_days) {
            setWorkingDays(res.data.data.default_working_days);
          }
        }
      } else {
        const res = await api.get("/attendance/monthly-matrix", {
          params: { class_section_id: selectedClassId }
        });
        if (res.data.status === "success") {
          setMatrixData(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedClassId, selectedMonth, term, viewMode]);

  // Handle Month Switch
  const handleSelectMonth = (m) => {
    setSelectedMonth(m.code);
    setTerm(m.term);
    setWorkingDays(m.default_days);
  };

  // Apply custom working days to all active rows
  const handleApplyWorkingDaysToAll = (newWorkingDays) => {
    const days = parseFloat(newWorkingDays) || 0;
    if (days <= 0) return;
    setWorkingDays(days);

    setRows(prev => prev.map(r => {
      const p = Math.min(r.present_days, days);
      const a = Math.max(0, Math.round((days - p) * 10) / 10);
      const pct = days > 0 ? Math.round((p / days) * 100 * 10) / 10 : 0.0;
      return {
        ...r,
        working_days: days,
        present_days: p,
        absent_days: a,
        percentage: pct,
        is_low_attendance: pct < 75.0,
        isDirty: true
      };
    }));
  };

  // Handle individual student present days change
  const handlePresentDaysChange = (studentId, val) => {
    if (!canEdit) return;

    setRows(prev => prev.map(r => {
      if (r.student_id !== studentId) return r;

      if (val === "" || val === null) {
        return {
          ...r,
          present_days: 0,
          absent_days: r.working_days,
          percentage: 0.0,
          is_low_attendance: true,
          isDirty: true
        };
      }

      const p = parseFloat(val);
      const w = r.working_days || workingDays;
      const a = Math.max(0, Math.round((w - p) * 10) / 10);
      const pct = w > 0 ? Math.round((p / w) * 100 * 10) / 10 : 0.0;

      return {
        ...r,
        present_days: p,
        absent_days: a,
        percentage: pct,
        is_low_attendance: pct < 75.0,
        isDirty: true
      };
    }));
  };

  // Handle individual student custom working days change
  const handleStudentWorkingDaysChange = (studentId, val) => {
    if (!canEdit) return;
    const w = parseFloat(val) || 0;

    setRows(prev => prev.map(r => {
      if (r.student_id !== studentId) return r;
      const p = Math.min(r.present_days, w);
      const a = Math.max(0, Math.round((w - p) * 10) / 10);
      const pct = w > 0 ? Math.round((p / w) * 100 * 10) / 10 : 0.0;

      return {
        ...r,
        working_days: w,
        present_days: p,
        absent_days: a,
        percentage: pct,
        is_low_attendance: pct < 75.0,
        isDirty: true
      };
    }));
  };

  // Quick fill helper: mark all present for active working days
  const handleMarkAllFull = () => {
    if (!canEdit) return;
    setRows(prev => prev.map(r => ({
      ...r,
      present_days: r.working_days,
      absent_days: 0,
      percentage: 100.0,
      is_low_attendance: false,
      isDirty: true
    })));
  };

  // Save All Attendance
  const handleSaveAll = async () => {
    if (!canEdit) return;
    try {
      setSaving(true);
      setError("");
      setSuccessMsg("");

      const entries = rows.map(r => ({
        student_id: r.student_id,
        working_days: r.working_days || workingDays,
        present_days: r.present_days,
        remarks: r.remarks
      }));

      const res = await api.post("/attendance/bulk", {
        class_section_id: selectedClassId,
        term,
        month: selectedMonth,
        working_days: workingDays,
        entries
      });

      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchAttendance();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save attendance.");
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
      const res = await api.post("/attendance/sync-workbook");
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchAttendance();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to sync attendance from workbook.");
    } finally {
      setSaving(false);
    }
  };

  // Filter rows
  const filteredRows = rows.filter(r => {
    if (filterLowOnly && !r.is_low_attendance) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      String(r.roll_no).includes(q) ||
      String(r.admission_no).includes(q)
    );
  });

  const term1Months = monthCatalog.filter(m => m.term === 1 && m.is_month);
  const term2Months = monthCatalog.filter(m => m.term === 2 && m.is_month);
  const cumulativePeriods = monthCatalog.filter(m => !m.is_month);

  const activeMonthObj = monthCatalog.find(m => m.code === selectedMonth) || { label: selectedMonth };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Header Title & Controls */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Module 9
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <CalendarCheck className="w-6 h-6 text-emerald-600" />
                Month-Wise Attendance &amp; Working Days Engine
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Record and customize monthly working days (April to March), monitor present days, and track automatic &lt; 75% attendance alerts.
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
                <span>Sync PASHEET</span>
              </button>
            )}

            {canEdit && viewMode === "SINGLE_MONTH" && (
              <>
                <button
                  type="button"
                  onClick={handleMarkAllFull}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                  title="Mark 100% attendance for all students"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Mark All 100%</span>
                </button>

                <button
                  onClick={handleSaveAll}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs transition disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? "Saving..." : `Save ${activeMonthObj.label} Attendance`}</span>
                </button>
              </>
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

        {/* View Mode Switcher + Class Selector */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 font-semibold mb-1">Classroom</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-semibold outline-none focus:border-emerald-600"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.display_name} ({c.total_students} Students)
                  </option>
                ))}
              </select>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block" />

            <div>
              <label className="block text-[11px] text-slate-500 font-semibold mb-1">View Mode</label>
              <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode("SINGLE_MONTH")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                    viewMode === "SINGLE_MONTH"
                      ? "bg-white text-emerald-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Month-by-Month Entry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("MATRIX")}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition ${
                    viewMode === "MATRIX"
                      ? "bg-white text-emerald-800 shadow-2xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Annual Consolidated Matrix</span>
                </button>
              </div>
            </div>
          </div>

          {viewMode === "SINGLE_MONTH" && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterLowOnly(!filterLowOnly)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  filterLowOnly
                    ? "bg-rose-50 text-rose-700 border-rose-300"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 shadow-2xs"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                <span>Low Attendance (&lt;75%) Only</span>
              </button>

              <div className="relative w-48">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* MONTH-WISE TABS & WORKING DAYS CUSTOMIZER (SINGLE_MONTH MODE) */}
        {viewMode === "SINGLE_MONTH" && (
          <div className="space-y-4">
            {/* Month Navigation Pill Bars */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
              {/* Term 1 Months */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-24">
                  Term 1 (Apr–Sep):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {term1Months.map(m => (
                    <button
                      key={m.code}
                      onClick={() => handleSelectMonth(m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        selectedMonth === m.code
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedMonth === m.code ? "bg-emerald-700 text-emerald-100" : "bg-slate-200 text-slate-600"
                      }`}>
                        {m.default_days}d
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Term 2 Months */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-24">
                  Term 2 (Oct–Mar):
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {term2Months.map(m => (
                    <button
                      key={m.code}
                      onClick={() => handleSelectMonth(m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                        selectedMonth === m.code
                          ? "bg-emerald-600 text-white shadow-2xs"
                          : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      <span>{m.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedMonth === m.code ? "bg-emerald-700 text-emerald-100" : "bg-slate-200 text-slate-600"
                      }`}>
                        {m.default_days}d
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cumulative Aggregates */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 w-24">
                  Aggregates:
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {cumulativePeriods.map(m => (
                    <button
                      key={m.code}
                      onClick={() => handleSelectMonth(m)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition ${
                        selectedMonth === m.code
                          ? "bg-slate-900 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {m.label} ({m.default_days} Days)
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Working Days Customizer Bar */}
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-2xs">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                      Customize Working Days for {activeMonthObj.label}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold">
                      Active: {workingDays} Days
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Adjusting the total working days automatically recalculates absent days and attendance percentages across all students in real-time.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center bg-white border border-emerald-300 rounded-xl p-1 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => handleApplyWorkingDaysToAll(Math.max(1, workingDays - 1))}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    step="0.5"
                    value={workingDays}
                    onChange={(e) => handleApplyWorkingDaysToAll(e.target.value)}
                    className="w-16 text-center font-bold text-slate-900 text-sm outline-none bg-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyWorkingDaysToAll(workingDays + 1)}
                    className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition"
                  >
                    +
                  </button>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1">
                  {[20, 22, 24, 110].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleApplyWorkingDaysToAll(preset)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition ${
                        workingDays === preset
                          ? "bg-emerald-600 text-white"
                          : "bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-100"
                      }`}
                    >
                      {preset}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Analytics KPI Cards */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-slate-500 block">Total Students</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">{stats.total_students}</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-sky-700 block">{activeMonthObj.label} Class Average</span>
                  <span className="text-2xl font-bold text-slate-900 mt-1 block">
                    {stats.average_percentage}%
                  </span>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-emerald-700 block">Good Standing (&ge; 85%)</span>
                  <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                    {stats.excellent_attendance_count}
                  </span>
                </div>

                <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-4 shadow-2xs">
                  <span className="text-xs font-semibold text-rose-700 block flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Low Attendance (&lt; 75%)
                  </span>
                  <span className="text-2xl font-bold text-rose-700 mt-1 block">
                    {stats.low_attendance_count}
                  </span>
                </div>
              </div>
            )}

            {/* Month-Wise Attendance Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{activeMonthObj.label} Attendance Roster ({filteredRows.length} Students)</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">
                  Active Statutory Formula: Present Days / {workingDays} Working Days
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold w-12 text-center">Roll</th>
                      <th className="py-3.5 px-4 font-semibold">Student Name</th>
                      <th className="py-3.5 px-4 font-semibold">Admission No</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Working Days</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Present Days</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Absent Days</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Attendance %</th>
                      <th className="py-3.5 px-4 font-semibold">Status &amp; Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map(row => {
                      const isInvalid = row.present_days > row.working_days || row.present_days < 0;

                      return (
                        <tr key={row.student_id} className="hover:bg-slate-50/80 transition group">
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

                          {/* Editable Working Days per student */}
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="1"
                              max="365"
                              disabled={!canEdit}
                              value={row.working_days}
                              onChange={(e) => handleStudentWorkingDaysChange(row.student_id, e.target.value)}
                              className="w-16 text-center py-1 px-1.5 rounded-lg text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </td>

                          {/* Present Days Input */}
                          <td className="py-2.5 px-4 text-center">
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={row.working_days}
                              disabled={!canEdit}
                              value={row.present_days !== null && row.present_days !== undefined ? row.present_days : ""}
                              onChange={(e) => handlePresentDaysChange(row.student_id, e.target.value)}
                              className={`w-20 text-center py-1.5 px-2 rounded-xl text-xs font-bold outline-none transition ${
                                isInvalid
                                  ? "bg-rose-50 border border-rose-300 text-rose-700"
                                  : "bg-slate-50 border border-slate-300 text-slate-900 focus:border-emerald-600 focus:bg-white"
                              }`}
                            />
                          </td>

                          <td className="py-3 px-4 font-mono text-center text-slate-500">
                            {row.absent_days}
                          </td>

                          {/* Percentage Badge */}
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                row.percentage >= 75
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {row.percentage}%
                            </span>
                          </td>

                          {/* Warning Status & 360 Profile link */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-between gap-2">
                              {row.is_low_attendance ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  Low (&lt;75%)
                                </span>
                              ) : row.percentage >= 85 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3" />
                                  Good Standing
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-500 font-medium">Regular</span>
                              )}

                              <button
                                type="button"
                                onClick={() => setDossierStudentId(row.student_id)}
                                className="text-[10px] text-emerald-700 hover:text-emerald-800 font-bold underline"
                              >
                                View 360°
                              </button>
                            </div>
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
          </div>
        )}

        {/* ANNUAL CONSOLIDATED MATRIX VIEW */}
        {viewMode === "MATRIX" && matrixData && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-4">
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-sm font-bold text-slate-900 block">
                  Annual Month-by-Month Attendance Ledger ({matrixData.total_students} Students)
                </span>
                <span className="text-xs text-slate-500">
                  Full academic cycle attendance record across April to March. Click any student to open dossier.
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">Roll</th>
                    <th className="py-3 px-3 min-w-36">Student Name</th>
                    {matrixData.month_columns?.map(m => (
                      <th key={m.code} className="py-3 px-2 text-center">
                        <div>{m.label.substring(0, 3)}</div>
                        <div className="text-[9px] font-normal text-slate-400">({m.default_days}d)</div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center bg-slate-100/70 font-bold">Total Present</th>
                    <th className="py-3 px-3 text-center bg-slate-100/70 font-bold">Total Work</th>
                    <th className="py-3 px-3 text-center bg-slate-100/70 font-bold">Overall %</th>
                    <th className="py-3 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {matrixData.rows?.map(r => (
                    <tr key={r.student_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 text-center text-emerald-700 font-bold">
                        <button
                          type="button"
                          onClick={() => setDossierStudentId(r.student_id)}
                          className="hover:underline text-emerald-700"
                        >
                          #{r.roll_no}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setDossierStudentId(r.student_id)}
                          className="hover:underline hover:text-emerald-700 text-left block"
                        >
                          {r.name}
                        </button>
                      </td>

                      {/* Month Columns */}
                      {matrixData.month_columns?.map(m => {
                        const mRec = r.months?.[m.code];
                        return (
                          <td key={m.code} className="py-2.5 px-2 text-center">
                            {mRec ? (
                              <div>
                                <span className="font-bold text-slate-900">{mRec.present_days}</span>
                                <span className="text-[10px] text-slate-400">/{mRec.working_days}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-center font-bold text-slate-900 bg-slate-50">
                        {r.cumulative_present_days}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-500 bg-slate-50">
                        {r.cumulative_working_days}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold bg-slate-50">
                        <span className={r.cumulative_percentage >= 75 ? "text-emerald-700" : "text-rose-700"}>
                          {r.cumulative_percentage}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        {r.is_low_attendance ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                            &lt;75%
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-700">OK</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* 360 Student Dossier Modal */}
      {dossierStudentId && (
        <StudentDossierModal
          studentId={dossierStudentId}
          onClose={() => setDossierStudentId(null)}
          onUpdated={() => fetchAttendance()}
        />
      )}
    </div>
  );
}
