import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import StudentDossierModal from "../components/StudentDossierModal";
import {
  Calculator,
  Trophy,
  Award,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Layers,
  Search,
  BookOpen,
  Filter,
  UserCheck,
  Eye
} from "lucide-react";

export default function CalculationEngine() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [activeTab, setActiveTab] = useState("RESULTS"); // RESULTS, PA_SUMMARY, GRADES

  const [classData, setClassData] = useState(null);
  const [paData, setPaData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [dossierStudentId, setDossierStudentId] = useState(null);

  // Load classrooms
  useEffect(() => {
    const initClasses = async () => {
      try {
        setLoading(true);
        const res = await api.get("/classrooms");
        const list = res.data.classrooms || [];
        setClasses(list);
        const c3a = list.find(c => c.class_name === "III" && c.section_name === "A") || list[0];
        if (c3a) setSelectedClassId(c3a.id);
      } catch (err) {
        setError("Failed to load classrooms.");
      } finally {
        setLoading(false);
      }
    };
    initClasses();
  }, []);

  // Fetch Calculation Data
  const fetchResults = async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setError("");

      if (activeTab === "PA_SUMMARY") {
        const res = await api.get("/calculations/pa-summary", {
          params: { class_section_id: selectedClassId }
        });
        if (res.data.status === "success") {
          setPaData(res.data.data || []);
        }
      } else {
        const res = await api.get("/calculations/class-results", {
          params: { class_section_id: selectedClassId }
        });
        if (res.data.status === "success") {
          setClassData(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load calculation results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [selectedClassId, activeTab]);

  const stats = classData?.summary_stats;
  const subjects = classData?.subjects || [];
  const roster = classData?.roster || [];

  // Filter roster
  const filteredRoster = roster.filter(r => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      String(r.roll_no).includes(q) ||
      String(r.admission_no).includes(q)
    );
  });

  const getGradeBadge = (grade) => {
    switch (grade) {
      case "A1":
      case "A2":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "B1":
      case "B2":
        return "bg-sky-50 text-sky-700 border-sky-200";
      case "C1":
      case "C2":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "D":
        return "bg-orange-50 text-orange-700 border-orange-200";
      case "E":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PROMOTED":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Promoted</span>;
      case "COMPARTMENT":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3 h-3" /> Compartment</span>;
      case "ESSENTIAL_REPEAT":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">Essential Repeat</span>;
      default:
        return <span className="text-[10px] text-slate-400">Pending</span>;
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
                Module 10
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Python Calculation Engine & Ranks
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Automated evaluation logic: best-of-PA scaling, term aggregation, CBSE 8-tier grading (A1 to E), and class ranks.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-emerald-600 shadow-2xs"
            >
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.display_name} ({c.total_students} Students)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "RESULTS", label: "Class Results & Ranks", icon: Trophy },
            { key: "PA_SUMMARY", label: "PA Scaling & Best-Of", icon: Calculator },
            { key: "GRADES", label: "Grade Distribution", icon: BarChart3 }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-emerald-600 text-white shadow-2xs font-semibold"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Analytics KPI Cards */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 block">Class Mean Percentage</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {stats.class_mean_percentage}%
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-semibold text-emerald-700 block">Pass Rate</span>
              <span className="text-2xl font-bold text-emerald-700 mt-1 block">
                {stats.pass_percentage}%
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-semibold text-sky-700 block">Promoted Students</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {stats.promoted_count} <span className="text-xs font-normal text-slate-500">/ {stats.evaluated_count}</span>
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs">
              <span className="text-xs font-semibold text-amber-700 block">Compartment / Repeat</span>
              <span className="text-2xl font-bold text-slate-900 mt-1 block">
                {stats.compartment_count + stats.essential_repeat_count}
              </span>
            </div>
          </div>
        )}

        {/* Visual Grade Distribution Bar (Active in GRADES or RESULTS) */}
        {stats?.grade_distribution && activeTab === "GRADES" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-600" />
              CBSE 8-Tier Grade Distribution Histogram
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {Object.keys(stats.grade_distribution).map(g => {
                const count = stats.grade_distribution[g];
                const pct = stats.evaluated_count > 0 ? Math.round((count / stats.evaluated_count) * 100) : 0;
                return (
                  <div key={g} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-1">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${getGradeBadge(g)}`}>
                      {g}
                    </span>
                    <div className="text-xl font-bold text-slate-900">{count}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{pct}% of class</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* RESULTS TAB: Comprehensive Ranks & Grades Table */}
        {activeTab === "RESULTS" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-3">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4">
              <span className="text-xs font-bold text-slate-700">
                Official Roster: Class Results, Total Score &amp; Ranks
              </span>

              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search student or roll..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 font-semibold w-12 text-center">Rank</th>
                    <th className="py-3 px-3 font-semibold w-12 text-center">Roll</th>
                    <th className="py-3 px-4 font-semibold">Student Name</th>
                    {subjects.map(s => (
                      <th key={s.code} className="py-3 px-3 font-semibold text-center">
                        {s.code} (Marks/Grd)
                      </th>
                    ))}
                    <th className="py-3 px-3 font-semibold text-center">Grand Total</th>
                    <th className="py-3 px-3 font-semibold text-center">Percentage</th>
                    <th className="py-3 px-3 font-semibold text-center">Grade</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map(row => (
                    <tr key={row.student_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-center">
                        {row.rank ? (
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                            row.rank === 1 ? "bg-amber-100 text-amber-800 border border-amber-300" :
                            row.rank === 2 ? "bg-slate-200 text-slate-800 border border-slate-300" :
                            row.rank === 3 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                            "text-slate-500 font-semibold"
                          }`}>
                            #{row.rank}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-center text-emerald-700">
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
                        <div className="text-[10px] font-mono text-slate-500">{row.admission_no}</div>
                      </td>

                      {subjects.map(s => {
                        const subResult = row.subjects[s.code] || {};
                        return (
                          <td key={s.code} className="py-3 px-3 text-center font-mono">
                            {subResult.marks_obtained !== null ? (
                              <div className="text-xs font-bold text-slate-900">
                                {subResult.marks_obtained}
                                <span className={`ml-1 text-[10px] px-1 py-0.2 rounded border ${getGradeBadge(subResult.grade)}`}>
                                  {subResult.grade}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400">Ab</span>
                            )}
                          </td>
                        );
                      })}

                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                        {row.grand_total_obtained} <span className="text-[10px] text-slate-500 font-normal">/ {row.grand_total_max}</span>
                      </td>

                      <td className="py-3 px-3 text-center font-mono font-bold text-emerald-700">
                        {row.overall_percentage}%
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${getGradeBadge(row.overall_grade)}`}>
                          {row.overall_grade}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {getStatusBadge(row.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PA SUMMARY TAB */}
        {activeTab === "PA_SUMMARY" && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                Periodic Assessment Scaling &amp; Best-of-PA Calculation (Scaled to 5.0 Marks)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-3 font-semibold w-12 text-center">Roll</th>
                    <th className="py-3 px-4 font-semibold">Student Name</th>
                    {subjects.map(s => (
                      <th key={s.code} className="py-3 px-3 font-semibold text-center">
                        {s.code} (Best / Scaled 5)
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paData.map(row => (
                    <tr key={row.student_id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-mono font-bold text-center text-emerald-700">
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
                          className="font-semibold text-slate-900 hover:text-emerald-700 text-left transition"
                        >
                          {row.name}
                        </button>
                      </td>

                      {subjects.map(s => {
                        const subInfo = row.subjects?.[s.code];
                        return (
                          <td key={s.code} className="py-3 px-3 text-center font-mono">
                            {subInfo ? (
                              <div className="text-xs">
                                <span className="font-bold text-slate-900">{subInfo.best}</span>
                                <span className="text-slate-500 text-[10px]"> / 20</span>
                                <span className="ml-2 font-bold text-emerald-700">({subInfo.scaled_5} / 5)</span>
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        );
                      })}
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
          onUpdated={() => {
            if (selectedClassId) {
              api.get("/calculation/annual-results", { params: { class_section_id: selectedClassId } }).then(res => {
                if (res.data.status === "success") setClassData(res.data.data);
              });
            }
          }}
        />
      )}
    </div>
  );
}
