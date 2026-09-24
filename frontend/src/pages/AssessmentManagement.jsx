import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  Plus,
  Edit3,
  Sparkles,
  Layers,
  Clock,
  Lock,
  Unlock,
  RefreshCw,
  FileCheck2,
  Bookmark
} from "lucide-react";

export default function AssessmentManagement() {
  const { user, hasRole } = useAuth();
  const [assessments, setAssessments] = useState([]);
  const [filterType, setFilterType] = useState("ALL"); // ALL, PERIODIC, TERM, INTERNAL, FLN
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    assessment_type: "PERIODIC",
    term: 1,
    max_marks: 20.0,
    weightage: 10.0,
    start_date: "",
    end_date: "",
    round_number: ""
  });

  const [editForm, setEditForm] = useState({});

  const canManage = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN");

  const fetchAssessments = async () => {
    try {
      setLoading(true);
      const params = filterType !== "ALL" ? { assessment_type: filterType } : {};
      const res = await api.get("/assessments", { params });
      if (res.data.status === "success") {
        setAssessments(res.data.assessments || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [filterType]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        ...createForm,
        term: parseInt(createForm.term),
        max_marks: parseFloat(createForm.max_marks),
        weightage: parseFloat(createForm.weightage),
        round_number: createForm.round_number ? parseInt(createForm.round_number) : undefined
      };

      const res = await api.post("/assessments", payload);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        setIsCreateModalOpen(false);
        setCreateForm({
          name: "",
          code: "",
          assessment_type: "PERIODIC",
          term: 1,
          max_marks: 20.0,
          weightage: 10.0,
          start_date: "",
          end_date: "",
          round_number: ""
        });
        fetchAssessments();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create assessment.");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!selectedAssessment) return;
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        ...editForm,
        term: parseInt(editForm.term),
        max_marks: parseFloat(editForm.max_marks),
        weightage: parseFloat(editForm.weightage)
      };

      const res = await api.put(`/assessments/${selectedAssessment.id}`, payload);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        setIsEditModalOpen(false);
        fetchAssessments();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update assessment.");
    }
  };

  const handleSeedDefaults = async () => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post("/assessments/seed-defaults");
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchAssessments();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to seed default assessments.");
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case "PERIODIC":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">PERIODIC (PA)</span>;
      case "TERM":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">TERM EXAM</span>;
      case "INTERNAL":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">INTERNAL</span>;
      case "FLN":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">FLN MISSION BUNIYAD</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">{type}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Module 6
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Assessment & Examination Management
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Configure Periodic Assessments (PA-1 to PA-4), Term Examinations, Internals, and FLN evaluation rounds.
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedDefaults}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 shadow-2xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Initialize Standard Scheme</span>
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Assessment</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL", label: "All Evaluations" },
            { key: "PERIODIC", label: "Periodic (PA1 - PA4)" },
            { key: "TERM", label: "Term Examinations" },
            { key: "INTERNAL", label: "Internal Components" },
            { key: "FLN", label: "FLN Rounds (Mission Buniyad)" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilterType(tab.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
                filterType === tab.key
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Assessments List / Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assessments.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 flex flex-col justify-between transition shadow-2xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {getTypeBadge(a.assessment_type)}
                    <h3 className="text-base font-bold text-slate-900 mt-2">
                      {a.name}
                    </h3>
                    <span className="font-mono text-xs text-slate-500">
                      Code: <strong className="text-emerald-700">{a.code}</strong> • Term {a.term}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-bold text-slate-900 block">
                      {a.max_marks > 0 ? `${a.max_marks} M` : "L1-L5"}
                    </span>
                    {a.weightage > 0 && (
                      <span className="text-[10px] text-slate-500 block font-medium">
                        Weight: {a.weightage}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      {a.start_date ? `${a.start_date} to ${a.end_date || "Ongoing"}` : "Timeline configured in session"}
                    </span>
                  </div>
                  {a.round_number && (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>FLN Round Sequence: #{a.round_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active
                </span>

                {canManage && (
                  <button
                    onClick={() => {
                      setSelectedAssessment(a);
                      setEditForm(a);
                      setIsEditModalOpen(true);
                    }}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 transition"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Configure</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {assessments.length === 0 && !loading && (
          <div className="p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-2xl text-xs font-medium">
            No assessments found in this category. Click "Initialize Standard Scheme" to populate default Delhi MCD examinations.
          </div>
        )}

        {/* Modal: Schedule Assessment */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Schedule New Assessment
              </h3>

              <form onSubmit={handleCreate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assessment Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Periodic Assessment 5"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Code</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. PA5"
                      value={createForm.code}
                      onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Assessment Type</label>
                    <select
                      value={createForm.assessment_type}
                      onChange={(e) => setCreateForm({ ...createForm, assessment_type: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="PERIODIC">PERIODIC</option>
                      <option value="TERM">TERM</option>
                      <option value="INTERNAL">INTERNAL</option>
                      <option value="FLN">FLN</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Term</label>
                    <select
                      value={createForm.term}
                      onChange={(e) => setCreateForm({ ...createForm, term: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="1">Term 1</option>
                      <option value="2">Term 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Max Marks</label>
                    <input
                      type="number"
                      step="0.5"
                      value={createForm.max_marks}
                      onChange={(e) => setCreateForm({ ...createForm, max_marks: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Weightage %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={createForm.weightage}
                      onChange={(e) => setCreateForm({ ...createForm, weightage: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={createForm.start_date}
                      onChange={(e) => setCreateForm({ ...createForm, start_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      value={createForm.end_date}
                      onChange={(e) => setCreateForm({ ...createForm, end_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    Schedule Assessment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Assessment */}
        {isEditModalOpen && selectedAssessment && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                Configure Assessment: {selectedAssessment.code}
              </h3>

              <form onSubmit={handleUpdate} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assessment Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Max Marks</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.max_marks ?? 20}
                      onChange={(e) => setEditForm({ ...editForm, max_marks: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Weightage %</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editForm.weightage ?? 10}
                      onChange={(e) => setEditForm({ ...editForm, weightage: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editForm.start_date || ""}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      value={editForm.end_date || ""}
                      onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
