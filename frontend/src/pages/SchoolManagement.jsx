import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { 
  School, 
  Building2, 
  Calendar, 
  UserCheck, 
  MapPin, 
  Phone, 
  Edit3, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles,
  Award,
  Users
} from "lucide-react";

export default function SchoolManagement() {
  const { user, hasRole } = useAuth();
  const [school, setSchool] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  
  // Edit Form state
  const [editForm, setEditForm] = useState({});
  const [sessionForm, setSessionForm] = useState({
    session_name: "",
    start_date: "",
    end_date: "",
    result_date: "",
    working_days_term1: 110,
    working_days_annual: 220,
    is_active: false
  });

  const canEdit = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN");

  const fetchSchoolData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/schools/current");
      if (res.data.status === "success") {
        setSchool(res.data.school);
        setSessions(res.data.sessions || []);
        setEditForm(res.data.school);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load school profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchoolData();
  }, []);

  const handleUpdateSchool = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.put(`/schools/${school.id}`, editForm);
      if (res.data.status === "success") {
        setSchool(res.data.school);
        setSuccessMsg("School profile updated successfully!");
        setIsEditModalOpen(false);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update school details.");
    }
  };

  const handleAddSession = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.post(`/schools/${school.id}/sessions`, sessionForm);
      if (res.data.status === "success") {
        setSuccessMsg(`Session '${sessionForm.session_name}' created successfully!`);
        setIsSessionModalOpen(false);
        setSessionForm({ session_name: "", start_date: "", end_date: "", result_date: "", working_days_term1: 110, working_days_annual: 220, is_active: false });
        fetchSchoolData();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to add academic session.");
    }
  };

  const handleActivateSession = async (sessionId) => {
    try {
      const res = await api.put(`/schools/${school.id}/sessions/${sessionId}/activate`);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchSchoolData();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to activate session.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-500 text-xs font-medium">Loading School Profile...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Module 3
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                School Profile & Session Management
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Manage institution metadata, administrative leadership, and academic calendar sessions.
            </p>
          </div>

          {canEdit && (
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 shadow-2xs transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
              <button
                onClick={() => setIsSessionModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Academic Session</span>
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

        {/* School Profile Hero Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                  {school?.corporation_name}
                </span>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5">
                  {school?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {school?.address || "MCP Nithari, Rohini Zone, New Delhi"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center min-w-[100px]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">School No.</span>
                <span className="text-sm font-bold text-slate-900">{school?.code || "20"}</span>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-center min-w-[100px]">
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Ward No.</span>
                <span className="text-sm font-bold text-slate-900">{school?.ward_number || "40"}</span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 text-center min-w-[120px]">
                <span className="text-[10px] text-emerald-700 uppercase font-semibold block">Zone</span>
                <span className="text-sm font-bold text-emerald-800">{school?.zone || "ROHINI ZONE"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Head of School (Principal)</span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                {school?.principal_name || "SHAMBHU DAYAL MEENA"}
              </span>
              {school?.principal_phone && (
                <span className="text-xs text-slate-500 block mt-0.5 flex items-center gap-1 font-medium">
                  <Phone className="w-3 h-3 text-slate-400" />
                  {school.principal_phone}
                </span>
              )}
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Mentor Officer</span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-purple-600" />
                {school?.mentor_name || "DEVENDER SINGH"}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block font-medium">U-DISE Code</span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block font-mono">
                {school?.udise_id || "07020102001"}
              </span>
            </div>

            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Total School Students (MB)</span>
              <span className="text-sm font-bold text-emerald-700 mt-0.5 block flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-600" />
                {school?.total_school_students || 1156} Students
              </span>
            </div>
          </div>
        </div>

        {/* Academic Sessions Section */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Academic Sessions & Evaluation Calendar
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sessions control active assessment recording and official report generation.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Session Name</th>
                  <th className="py-3 px-4">Term Dates</th>
                  <th className="py-3 px-4">Result Declaration</th>
                  <th className="py-3 px-4">Working Days (Term 1 / Annual)</th>
                  <th className="py-3 px-4">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((sess) => (
                  <tr key={sess.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      {sess.session_name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {sess.start_date || "2026-04-01"} to {sess.end_date || "2027-03-31"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {sess.result_date || "2026-03-21"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-medium">
                      {sess.working_days_term1 || 110} / {sess.working_days_annual || 220} days
                    </td>
                    <td className="py-3.5 px-4">
                      {sess.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ACTIVE
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-slate-400 font-medium">
                          Archived
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-right">
                        {!sess.is_active && (
                          <button
                            onClick={() => handleActivateSession(sess.id)}
                            className="text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                          >
                            Set Active
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Edit School Profile */}
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-emerald-600" />
                Edit School Details
              </h3>

              <form onSubmit={handleUpdateSchool} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">School Name</label>
                    <input
                      type="text"
                      required
                      value={editForm.name || ""}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">School Number / Code</label>
                    <input
                      type="text"
                      value={editForm.code || ""}
                      onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Zone</label>
                    <input
                      type="text"
                      value={editForm.zone || ""}
                      onChange={(e) => setEditForm({ ...editForm, zone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Ward Number</label>
                    <input
                      type="text"
                      value={editForm.ward_number || ""}
                      onChange={(e) => setEditForm({ ...editForm, ward_number: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">U-DISE Code</label>
                    <input
                      type="text"
                      value={editForm.udise_id || ""}
                      onChange={(e) => setEditForm({ ...editForm, udise_id: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Principal / HOS Name</label>
                    <input
                      type="text"
                      value={editForm.principal_name || ""}
                      onChange={(e) => setEditForm({ ...editForm, principal_name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Principal Phone</label>
                    <input
                      type="text"
                      value={editForm.principal_phone || ""}
                      onChange={(e) => setEditForm({ ...editForm, principal_phone: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Mentor Name</label>
                  <input
                    type="text"
                    value={editForm.mentor_name || ""}
                    onChange={(e) => setEditForm({ ...editForm, mentor_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Address</label>
                  <textarea
                    rows="2"
                    value={editForm.address || ""}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20"
                  ></textarea>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Academic Session */}
        {isSessionModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Add New Academic Session
              </h3>

              <form onSubmit={handleAddSession} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Session Name (e.g. 2027-28)</label>
                  <input
                    type="text"
                    required
                    placeholder="2027-28"
                    value={sessionForm.session_name}
                    onChange={(e) => setSessionForm({ ...sessionForm, session_name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={sessionForm.start_date}
                      onChange={(e) => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">End Date</label>
                    <input
                      type="date"
                      value={sessionForm.end_date}
                      onChange={(e) => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Result Declaration Date</label>
                  <input
                    type="date"
                    value={sessionForm.result_date}
                    onChange={(e) => setSessionForm({ ...sessionForm, result_date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_active_check"
                    checked={sessionForm.is_active}
                    onChange={(e) => setSessionForm({ ...sessionForm, is_active: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <label htmlFor="is_active_check" className="text-slate-700 font-medium">Set as current active session</label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSessionModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs"
                  >
                    Create Session
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
