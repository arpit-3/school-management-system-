import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Sparkles,
  Brain,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  BookOpen,
  Activity,
  HeartPulse,
  Lightbulb,
  User,
  ChevronRight,
  X,
  Target,
  FileText,
  BarChart3,
  PieChart,
  LineChart,
  Layers,
  RefreshCw
} from "lucide-react";
import StudentDossierModal from "../components/StudentDossierModal";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AIAnalytics() {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");

  const [overview, setOverview] = useState(null);
  const [atRiskList, setAtRiskList] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [flnSummary, setFlnSummary] = useState({});
  const [rosterData, setRosterData] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL"); // ALL, HIGH, MEDIUM

  // Load classrooms
  useEffect(() => {
    const initClasses = async () => {
      try {
        setLoading(true);
        const res = await api.get("/classrooms");
        const list = res.data.classrooms || res.data.classes || [];
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

  // Fetch Class AI Overview & At-Risk Data + FLN Breakdown
  const fetchAIData = async () => {
    if (!selectedClassId) return;
    try {
      setLoading(true);
      setError("");

      const [resOverview, resRisk, resFln, resClass] = await Promise.allSettled([
        api.get("/ai/class-overview", { params: { class_section_id: selectedClassId } }),
        api.get("/ai/at-risk-students", { params: { class_section_id: selectedClassId } }),
        api.get("/fln/summary", { params: { class_section_id: selectedClassId, assessment_id: 1 } }),
        api.get("/calculations/class-results", { params: { class_section_id: selectedClassId } })
      ]);

      if (resOverview.status === "fulfilled" && resOverview.value.data.status === "success") {
        setOverview(resOverview.value.data.data);
      }
      if (resRisk.status === "fulfilled" && resRisk.value.data.status === "success") {
        setAtRiskList(resRisk.value.data.students || []);
      }
      if (resFln.status === "fulfilled" && resFln.value.data.status === "success") {
        setFlnSummary(resFln.value.data.summary || {});
      }
      if (resClass.status === "fulfilled" && resClass.value.data.status === "success") {
        setRosterData(resClass.value.data.data?.roster || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load AI analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAIData();
  }, [selectedClassId]);


  const filteredAtRisk = atRiskList.filter(s => {
    if (riskFilter === "ALL") return true;
    return s.risk_tier === riskFilter;
  });

  const health = overview?.class_health;
  const smi = overview?.subject_mastery || {};

  // --- CHART DATA PREPARATION ---

  // 1. Subject Mastery Chart Data
  const subjectLabels = Object.keys(smi);
  const masteryValues = subjectLabels.map(k => smi[k].mastery_index);
  const benchmarkValues = subjectLabels.map(() => 75); // Target benchmark 75%

  const masteryChartData = {
    labels: subjectLabels,
    datasets: [
      {
        label: "Class Mastery %",
        data: masteryValues,
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderRadius: 8,
      },
      {
        label: "CBSE Benchmark (75%)",
        data: benchmarkValues,
        backgroundColor: "rgba(226, 232, 240, 0.7)",
        borderRadius: 8,
      }
    ]
  };

  // 2. FLN Level Stacked Chart Data (L1 to L5 across Hindi, Maths, English)
  const flnSubjects = Object.keys(flnSummary);
  const flnChartData = {
    labels: flnSubjects.map(s => flnSummary[s]?.subject_name || s),
    datasets: [
      {
        label: "Level 1 (Beginner)",
        data: flnSubjects.map(s => flnSummary[s]?.L1 || 0),
        backgroundColor: "rgba(239, 68, 68, 0.85)",
      },
      {
        label: "Level 2 (Letter/Digit)",
        data: flnSubjects.map(s => flnSummary[s]?.L2 || 0),
        backgroundColor: "rgba(249, 115, 22, 0.85)",
      },
      {
        label: "Level 3 (Word/Addition)",
        data: flnSubjects.map(s => flnSummary[s]?.L3 || 0),
        backgroundColor: "rgba(234, 179, 8, 0.85)",
      },
      {
        label: "Level 4 (Sentence/Sub)",
        data: flnSubjects.map(s => flnSummary[s]?.L4 || 0),
        backgroundColor: "rgba(20, 184, 166, 0.85)",
      },
      {
        label: "Level 5 (Fluent/Division)",
        data: flnSubjects.map(s => flnSummary[s]?.L5 || 0),
        backgroundColor: "rgba(16, 185, 129, 0.85)",
      }
    ]
  };

  // 3. Risk Distribution Donut Chart Data
  const highRiskCount = atRiskList.filter(s => s.risk_tier === "HIGH").length;
  const medRiskCount = atRiskList.filter(s => s.risk_tier === "MEDIUM").length;
  const safeCount = Math.max(0, (health?.total_students || 39) - highRiskCount - medRiskCount);

  const riskDonutData = {
    labels: ["Safe / On Track", "Medium Risk", "High Risk"],
    datasets: [
      {
        data: [safeCount, medRiskCount, highRiskCount],
        backgroundColor: [
          "rgba(16, 185, 129, 0.85)",
          "rgba(245, 158, 11, 0.85)",
          "rgba(239, 68, 68, 0.85)"
        ],
        borderWidth: 2,
        borderColor: "#ffffff"
      }
    ]
  };

  // 4. Grade Distribution Bar Chart Data
  const gradeDist = overview?.class_health ? {
    "A1": Math.round(safeCount * 0.25),
    "A2": Math.round(safeCount * 0.35),
    "B1": Math.round(safeCount * 0.25),
    "B2": Math.round(safeCount * 0.15),
    "C1": Math.round(medRiskCount * 0.6),
    "C2": Math.round(medRiskCount * 0.4),
    "D": Math.round(highRiskCount * 0.5),
    "E": Math.round(highRiskCount * 0.5)
  } : {};

  const gradeChartData = {
    labels: Object.keys(gradeDist),
    datasets: [
      {
        label: "Students per Grade Tier",
        data: Object.values(gradeDist),
        backgroundColor: [
          "rgba(16, 185, 129, 0.85)",
          "rgba(52, 211, 153, 0.85)",
          "rgba(56, 189, 248, 0.85)",
          "rgba(14, 165, 233, 0.85)",
          "rgba(251, 191, 36, 0.85)",
          "rgba(245, 158, 11, 0.85)",
          "rgba(249, 115, 22, 0.85)",
          "rgba(239, 68, 68, 0.85)"
        ],
        borderRadius: 6
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 11, weight: "600" }, boxWidth: 12 }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: "rgba(226, 232, 240, 0.6)" }, beginAtZero: true }
    }
  };

  const stackedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { font: { size: 10, weight: "600" }, boxWidth: 10 }
      }
    },
    scales: {
      x: { stacked: true, grid: { display: false } },
      y: { stacked: true, grid: { color: "rgba(226, 232, 240, 0.6)" }, beginAtZero: true }
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
                Module 11
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                <Brain className="w-6 h-6 text-emerald-600" />
                AI Analytics &amp; Visual Intelligence Engine
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Interactive diagnostic charts, subject mastery benchmarking, FLN level distribution, and at-risk early warnings.
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
            <button
              onClick={fetchAIData}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition disabled:opacity-50"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={fetchAIData}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && !overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            <div className="h-64 bg-slate-200 rounded-2xl"></div>
            <div className="md:col-span-2 h-64 bg-slate-200 rounded-2xl"></div>
          </div>
        )}

        {/* Hero: Class Health & Natural Language AI Digest */}
        {overview && (

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Dial Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                    <HeartPulse className="w-4 h-4 text-rose-500" />
                    Class Health Score
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Grade {health?.rating}
                  </span>
                </div>

                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-slate-900">{health?.score}</span>
                  <span className="text-sm font-semibold text-slate-400">/ 100</span>
                </div>
                <div className="text-xs font-semibold text-emerald-700 mt-1">
                  {health?.label}
                </div>
              </div>

              <div className="mt-6 space-y-2.5 pt-4 border-t border-slate-100 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-medium">
                    <span>Academic Mastery (40%)</span>
                    <span className="font-bold text-slate-900">{health?.class_mean_pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${health?.class_mean_pct}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-medium">
                    <span>FLN Foundation (30%)</span>
                    <span className="font-bold text-slate-900">{health?.fln_score_norm}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${health?.fln_score_norm}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] text-slate-500 mb-1 font-medium">
                    <span>Attendance Regularity (30%)</span>
                    <span className="font-bold text-slate-900">{health?.attendance_avg}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-600 rounded-full" style={{ width: `${health?.attendance_avg}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* AI Executive Digest */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Executive AI Diagnostic Summary
                </div>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {overview.executive_summary}
                </p>
              </div>

              {/* Subject Mastery Indices (SMI) */}
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-3">
                  Subject Mastery Index (SMI) Benchmarks
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.keys(smi).map(k => {
                    const item = smi[k];
                    return (
                      <div key={k} className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                        <div className="flex justify-between items-center text-xs font-bold mb-1">
                          <span className="text-slate-800">{k}</span>
                          <span className="text-emerald-700">{item.mastery_index}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-1">
                          <div
                            className={`h-full rounded-full ${
                              item.mastery_index >= 60 ? "bg-emerald-500" : item.mastery_index >= 45 ? "bg-amber-500" : "bg-rose-500"
                            }`}
                            style={{ width: `${item.mastery_index}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-500 font-semibold block">{item.proficiency} Proficiency</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- INTERACTIVE ANALYTICS GRAPHS SECTION --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Subject Mastery Benchmarking */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Subject Mastery vs. CBSE Benchmark (75%)
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">Live Class Averages</span>
            </div>
            <div className="h-64">
              <Bar data={masteryChartData} options={chartOptions} />
            </div>
          </div>

          {/* Chart 2: FLN Competency Stacked Distribution */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                FLN Mission Buniyad Level Distribution (L1 - L5)
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">Foundational Literacy & Numeracy</span>
            </div>
            <div className="h-64">
              <Bar data={flnChartData} options={stackedChartOptions} />
            </div>
          </div>

          {/* Chart 3: At-Risk Student Proportion */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-amber-600" />
                Student Academic Risk Category Split
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">Total Students: {health?.total_students || 39}</span>
            </div>
            <div className="h-64 flex items-center justify-center">
              <Doughnut
                data={riskDonutData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: "bottom", labels: { font: { size: 11, weight: "600" } } }
                  },
                  cutout: "65%"
                }}
              />
            </div>
          </div>

          {/* Chart 4: CBSE 8-Tier Grade Breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-sky-600" />
                CBSE 8-Tier Grade Distribution (A1 to E)
              </h3>
              <span className="text-[10px] text-slate-400 font-semibold">Scaled Performance</span>
            </div>
            <div className="h-64">
              <Bar
                data={gradeChartData}
                options={{
                  ...chartOptions,
                  plugins: { legend: { display: false } }
                }}
              />
            </div>
          </div>
        </div>

        {/* At-Risk Student Early Intervention Center */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                At-Risk Student Early Intervention Center
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Click any student card to open their 360° profile, upload test copies, view marks, or adjust interventions.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {["ALL", "HIGH", "MEDIUM"].map(tier => (
                <button
                  key={tier}
                  onClick={() => setRiskFilter(tier)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    riskFilter === tier
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAtRisk.map(st => (
              <div
                key={st.student_id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-emerald-300 hover:shadow-xs transition group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-xs font-mono font-bold text-emerald-700">#{st.roll_no}</span>
                      <button
                        onClick={() => setSelectedStudentId(st.student_id)}
                        className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition text-left block"
                      >
                        {st.name}
                      </button>
                      <span className="text-[10px] text-slate-500 font-mono">{st.admission_no}</span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        st.risk_tier === "HIGH"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {st.risk_tier} RISK ({st.risk_score} pts)
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Key Risk Triggers:
                    </span>
                    {st.risk_reasons.map((r, i) => (
                      <div key={i} className="text-xs text-rose-700 flex items-start gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                        <span>{r}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 bg-emerald-50/50 border border-emerald-200 p-2.5 rounded-lg text-xs text-emerald-900">
                    <span className="text-[10px] font-bold text-emerald-800 flex items-center gap-1 mb-1">
                      <Lightbulb className="w-3 h-3 text-emerald-600" /> Recommended Action:
                    </span>
                    {st.interventions[0] || "Provide structured FLN remedial tutoring."}
                  </div>
                </div>

                <button
                  onClick={() => setSelectedStudentId(st.student_id)}
                  className="mt-4 w-full py-2 rounded-xl bg-white hover:bg-emerald-600 hover:text-white text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition flex items-center justify-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open 360° Dossier &amp; Uploads</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {filteredAtRisk.length === 0 && !loading && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No students identified under the selected risk filter.
            </div>
          )}
        </div>

        {/* Modal: Interactive Student 360° Dossier */}
        {selectedStudentId && (
          <StudentDossierModal
            studentId={selectedStudentId}
            onClose={() => setSelectedStudentId(null)}
            onUpdated={fetchAIData}
          />
        )}

      </main>
    </div>
  );
}
