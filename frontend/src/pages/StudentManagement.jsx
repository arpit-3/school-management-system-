import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Users,
  Search,
  Filter,
  Plus,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit3,
  Calendar,
  Building2,
  Phone,
  CreditCard,
  Sparkles,
  RefreshCw,
  UserCheck,
  Camera,
  FileText,
  Trash2,
  AlertTriangle,
  Landmark,
  User as UserIcon
} from "lucide-react";
import StudentDossierModal from "../components/StudentDossierModal";

export default function StudentManagement() {
  const { user, hasRole } = useAuth();
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, boys: 0, girls: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Dossier Modal state
  const [dossierStudentId, setDossierStudentId] = useState(null);

  // Modals state
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  // Delete Confirmation Modal
  const [deleteConfirmStudent, setDeleteConfirmStudent] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // File upload state
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Student Form
  const [newStudentForm, setNewStudentForm] = useState({
    roll_no: "",
    name: "",
    student_id: "",
    admission_no: "",
    dob: "",
    gender: "BOY",
    category: "GEN",
    father_name: "",
    mother_name: "",
    contact_no: "",
    address: "",
    aadhar_no: "",
    blood_group: "",
    cwsn_status: "NO",
    bank_name: "",
    bank_account_no: "",
    ifsc_code: "",
    bank_branch: "",
    account_holder_name: ""
  });

  const canEdit = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER");

  const fetchClasses = async () => {
    try {
      const res = await api.get("/classrooms");
      if (res.data.status === "success") {
        setClassrooms(res.data.classrooms || []);
        if (res.data.classrooms.length > 0 && !selectedClassId) {
          const c3a = res.data.classrooms.find(c => c.class_name === "III" && c.section_name === "A");
          setSelectedClassId(c3a ? c3a.id : res.data.classrooms[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = {
        class_section_id: selectedClassId || undefined,
        search: search || undefined,
        category: categoryFilter || undefined
      };

      const [stRes, statsRes] = await Promise.all([
        api.get("/students", { params }),
        api.get("/students/stats", { params: { class_section_id: selectedClassId || undefined } })
      ]);

      if (stRes.data.status === "success") {
        setStudents(stRes.data.students || []);
      }
      if (statsRes.data.status === "success") {
        setStats(statsRes.data.stats || { total: 0, active: 0, boys: 0, girls: 0 });
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load students.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchStudents();
    }
  }, [selectedClassId, categoryFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        ...newStudentForm,
        class_section_id: parseInt(selectedClassId),
        roll_no: parseInt(newStudentForm.roll_no)
      };

      const res = await api.post("/students", payload);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        setIsRegisterModalOpen(false);
        setNewStudentForm({
          roll_no: "",
          name: "",
          student_id: "",
          admission_no: "",
          dob: "",
          gender: "BOY",
          category: "GEN",
          father_name: "",
          mother_name: "",
          contact_no: "",
          address: "",
          aadhar_no: "",
          blood_group: "",
          cwsn_status: "NO",
          bank_name: "",
          bank_account_no: "",
          ifsc_code: "",
          bank_branch: "",
          account_holder_name: ""
        });
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to register student.");
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setError("");
    setSuccessMsg("");

    try {
      const res = await api.put(`/students/${selectedStudent.id}`, editForm);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        setSelectedStudent(res.data.student);
        setIsEditMode(false);
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update student profile.");
    }
  };

  const handleDeleteStudent = async () => {
    if (!deleteConfirmStudent) return;
    try {
      setIsDeleting(true);
      setError("");
      setSuccessMsg("");

      const res = await api.delete(`/students/${deleteConfirmStudent.id}`);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message || `Student '${deleteConfirmStudent.name}' deleted successfully.`);
        setDeleteConfirmStudent(null);
        if (selectedStudent?.id === deleteConfirmStudent.id) {
          setSelectedStudent(null);
        }
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete student.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSyncWorkbook = async () => {
    setError("");
    setSuccessMsg("");
    try {
      const res = await api.post("/students/sync-workbook");
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to synchronize students from workbook.");
    }
  };

  const handleImportExcel = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setIsUploading(true);
    setError("");
    setSuccessMsg("");

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("class_section_id", selectedClassId);

    try {
      const res = await api.post("/students/import", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        setIsImportModalOpen(false);
        setUploadFile(null);
        fetchStudents();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to import Excel file.");
    } finally {
      setIsUploading(false);
    }
  };

  const exportToCSV = () => {
    if (students.length === 0) return;
    const headers = [
      "Roll No", "Student ID", "Admission No", "Name", "Father Name",
      "Mother Name", "DOB", "Gender", "Category", "Contact", "Address",
      "Bank Name", "Account No", "IFSC Code", "Branch", "Account Holder"
    ];
    const rows = students.map(s => [
      s.roll_no,
      s.student_id || "",
      s.admission_no || "",
      `"${s.name}"`,
      `"${s.father_name || ""}"`,
      `"${s.mother_name || ""}"`,
      s.dob || "",
      s.gender || "",
      s.category || "",
      s.contact_no || "",
      `"${(s.address || "").replace(/"/g, '""')}"`,
      `"${s.bank_name || ""}"`,
      `"${s.bank_account_no || ""}"`,
      `"${s.ifsc_code || ""}"`,
      `"${s.bank_branch || ""}"`,
      `"${s.account_holder_name || ""}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Students_Class_${selectedClassId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
                Module 5
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Student Management &amp; Enrollment
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Student master records, banking &amp; DBT details, welfare profiles, and enrollment management.
            </p>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSyncWorkbook}
                title="1-Click synchronize the 39 students from the Excel workbook template"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 shadow-2xs transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sync Excel Workbook</span>
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 shadow-2xs transition"
              >
                <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
                <span>Import Excel</span>
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-semibold border border-slate-200 shadow-2xs transition"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Student</span>
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

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Total Enrolled</span>
              <span className="text-lg font-bold text-slate-900">{stats.total} Students</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-100">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Active Records</span>
              <span className="text-lg font-bold text-slate-900">{stats.active}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-100">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Boys / Girls</span>
              <span className="text-lg font-bold text-slate-900">{stats.boys} B / {stats.girls} G</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-medium block">Active Class</span>
              <span className="text-sm font-bold text-emerald-700">Class III-A (Boys)</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <form onSubmit={handleSearchSubmit} className="flex-1 flex items-center gap-2 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by student name, ID, or father..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition"
            >
              Search
            </button>
          </form>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5" />
              <span>Class:</span>
            </div>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 outline-none focus:border-emerald-600"
            >
              {classrooms.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name} ({c.category})
                </option>
              ))}
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-slate-900 outline-none focus:border-emerald-600"
            >
              <option value="">All Categories</option>
              <option value="GEN">GEN</option>
              <option value="SC">SC</option>
              <option value="ST">ST</option>
              <option value="OBC">OBC</option>
              <option value="EWS">EWS</option>
            </select>
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">Roll No</th>
                  <th className="py-3 px-4">Student Name</th>
                  <th className="py-3 px-4">Student ID / SR No</th>
                  <th className="py-3 px-4">Father / Mother Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Bank &amp; DBT</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition group">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setDossierStudentId(st.id)}
                        className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 font-bold flex items-center justify-center border border-emerald-200 transition"
                        title="Open Student 360° Dossier"
                      >
                        {st.roll_no}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          onClick={() => setDossierStudentId(st.id)}
                          className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 cursor-pointer hover:border-emerald-500 transition"
                          title="Click to view/change student photo"
                        >
                          {st.photo_url ? (
                            <img
                              src={st.photo_url.startsWith("http") ? st.photo_url : `http://127.0.0.1:5000${st.photo_url}`}
                              alt={st.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <button
                            onClick={() => setDossierStudentId(st.id)}
                            className="font-bold text-slate-900 hover:text-emerald-700 transition text-left block"
                          >
                            {st.name}
                          </button>
                          <span className="text-[10px] text-slate-400 font-medium">{st.gender}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-slate-700 block">{st.student_id || "N/A"}</span>
                      {st.admission_no && (
                        <span className="text-[10px] text-slate-400">SR: {st.admission_no}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <span>{st.father_name || "—"}</span>
                      {st.mother_name && (
                        <span className="text-[10px] text-slate-400 block">{st.mother_name}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {st.category || "GEN"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {st.bank_account_no ? (
                        <div className="text-[11px]">
                          <span className="font-semibold text-emerald-700 flex items-center gap-1">
                            <Landmark className="w-3 h-3" />
                            {st.bank_name || "Bank Linked"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block">
                            A/C: ••••{st.bank_account_no.slice(-4)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Not Linked</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      {st.contact_no || "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        {st.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setDossierStudentId(st.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 text-[11px] font-semibold border border-emerald-200 transition flex items-center gap-1"
                          title="Open 360° Dossier & Uploads"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Dossier</span>
                        </button>
                        <button
                          onClick={() => {
                            setSelectedStudent(st);
                            setEditForm(st);
                            setIsEditMode(false);
                          }}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Edit Student Info"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setDeleteConfirmStudent(st)}
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 transition"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {students.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs font-medium">
              No students found matching your criteria.
            </div>
          )}
        </div>

        {/* Modal: Student Profile Details / Edit */}
        {selectedStudent && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center border border-emerald-200 text-sm">
                    {selectedStudent.roll_no}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {selectedStudent.name}
                    </h3>
                    <span className="text-[11px] text-slate-500 font-medium">
                      ID: {selectedStudent.student_id || "N/A"} • Admission No: {selectedStudent.admission_no || "N/A"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditMode ? "Cancel Edit" : "Edit Profile"}</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmStudent(selectedStudent)}
                        className="flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {isEditMode ? (
                <form onSubmit={handleUpdateStudent} className="space-y-4 text-xs">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Roll Number</label>
                      <input
                        type="number"
                        required
                        value={editForm.roll_no || ""}
                        onChange={(e) => setEditForm({ ...editForm, roll_no: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Student ID</label>
                      <input
                        type="text"
                        value={editForm.student_id || ""}
                        onChange={(e) => setEditForm({ ...editForm, student_id: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Admission No</label>
                      <input
                        type="text"
                        value={editForm.admission_no || ""}
                        onChange={(e) => setEditForm({ ...editForm, admission_no: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Category</label>
                      <select
                        value={editForm.category || "GEN"}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      >
                        <option value="GEN">GEN</option>
                        <option value="SC">SC</option>
                        <option value="ST">ST</option>
                        <option value="OBC">OBC</option>
                        <option value="EWS">EWS</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Father's Name</label>
                      <input
                        type="text"
                        value={editForm.father_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, father_name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Mother's Name</label>
                      <input
                        type="text"
                        value={editForm.mother_name || ""}
                        onChange={(e) => setEditForm({ ...editForm, mother_name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                      <input
                        type="text"
                        value={editForm.contact_no || ""}
                        onChange={(e) => setEditForm({ ...editForm, contact_no: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={editForm.dob || ""}
                        onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Bank Details Section */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-600" />
                      Bank Account &amp; DBT Details
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. State Bank of India"
                          value={editForm.bank_name || ""}
                          onChange={(e) => setEditForm({ ...editForm, bank_name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Account Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 10928374651"
                          value={editForm.bank_account_no || ""}
                          onChange={(e) => setEditForm({ ...editForm, bank_account_no: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-900 outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="SBIN0001234"
                          value={editForm.ifsc_code || ""}
                          onChange={(e) => setEditForm({ ...editForm, ifsc_code: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase text-slate-900 outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Branch Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Rohini Sec-22"
                          value={editForm.bank_branch || ""}
                          onChange={(e) => setEditForm({ ...editForm, bank_branch: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1">Account Holder</label>
                        <input
                          type="text"
                          placeholder="e.g. Student / Mother Name"
                          value={editForm.account_holder_name || ""}
                          onChange={(e) => setEditForm({ ...editForm, account_holder_name: e.target.value })}
                          className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Address</label>
                    <textarea
                      rows="2"
                      value={editForm.address || ""}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                    >
                      Save Profile &amp; Bank Details
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Father's Name</span>
                      <span className="text-slate-800 font-semibold">{selectedStudent.father_name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Mother's Name</span>
                      <span className="text-slate-800 font-semibold">{selectedStudent.mother_name || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Date of Birth</span>
                      <span className="text-slate-800 font-semibold">{selectedStudent.dob || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Gender / Category</span>
                      <span className="text-slate-800 font-semibold">{selectedStudent.gender} • {selectedStudent.category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Phone / Mobile</span>
                      <span className="text-slate-800 font-semibold">{selectedStudent.contact_no || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Aadhar No.</span>
                      <span className="text-slate-800 font-semibold">{selectedStudent.aadhar_no || "N/A"}</span>
                    </div>
                  </div>

                  {/* Bank & DBT Welfare Details Card */}
                  <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 space-y-2">
                    <span className="text-[11px] text-emerald-900 uppercase font-bold flex items-center gap-1.5">
                      <Landmark className="w-4 h-4 text-emerald-600" />
                      Direct Benefit Transfer (DBT) &amp; Bank Account Details
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Bank Name</span>
                        <span className="text-slate-900 font-bold">{selectedStudent.bank_name || "Not Linked"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Account Number</span>
                        <span className="text-slate-900 font-mono font-bold">{selectedStudent.bank_account_no || "Not Linked"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">IFSC Code</span>
                        <span className="text-slate-900 font-mono font-bold">{selectedStudent.ifsc_code || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Branch</span>
                        <span className="text-slate-800 font-semibold">{selectedStudent.bank_branch || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block">Account Holder Name</span>
                        <span className="text-slate-800 font-semibold">{selectedStudent.account_holder_name || selectedStudent.name}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block mb-1">Residential Address</span>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                      {selectedStudent.address || "No address on record."}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      onClick={() => setSelectedStudent(null)}
                      className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Register Student with Bank Details */}
        {isRegisterModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Register New Student
              </h3>

              <form onSubmit={handleRegisterStudent} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Roll Number *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 40"
                      value={newStudentForm.roll_no}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, roll_no: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ROHAN SHARMA"
                      value={newStudentForm.name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Student ID</label>
                    <input
                      type="text"
                      placeholder="2022..."
                      value={newStudentForm.student_id}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, student_id: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Admission No</label>
                    <input
                      type="text"
                      placeholder="14..."
                      value={newStudentForm.admission_no}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, admission_no: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Category</label>
                    <select
                      value={newStudentForm.category}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, category: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="GEN">GEN</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="OBC">OBC</option>
                      <option value="EWS">EWS</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Father's Name</label>
                    <input
                      type="text"
                      placeholder="FATHER NAME"
                      value={newStudentForm.father_name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, father_name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Mother's Name</label>
                    <input
                      type="text"
                      placeholder="MOTHER NAME"
                      value={newStudentForm.mother_name}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, mother_name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="Mobile No."
                      value={newStudentForm.contact_no}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, contact_no: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Date of Birth</label>
                    <input
                      type="date"
                      value={newStudentForm.dob}
                      onChange={(e) => setNewStudentForm({ ...newStudentForm, dob: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Bank Details in Registration */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-emerald-600" />
                    Bank Account &amp; DBT Details (Optional)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. State Bank of India"
                        value={newStudentForm.bank_name}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, bank_name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="Account Number"
                        value={newStudentForm.bank_account_no}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, bank_account_no: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="IFSC Code"
                        value={newStudentForm.ifsc_code}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, ifsc_code: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-mono uppercase text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Branch</label>
                      <input
                        type="text"
                        placeholder="Branch Name"
                        value={newStudentForm.bank_branch}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, bank_branch: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Account Holder</label>
                      <input
                        type="text"
                        placeholder="Holder Name"
                        value={newStudentForm.account_holder_name}
                        onChange={(e) => setNewStudentForm({ ...newStudentForm, account_holder_name: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsRegisterModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                  >
                    Register Student
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Delete Confirmation */}
        {deleteConfirmStudent && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Delete Student Record</h3>
                  <p className="text-xs text-slate-500">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                <p className="font-semibold">
                  Are you sure you want to permanently delete:
                </p>
                <p className="font-bold text-sm text-slate-900">
                  Roll #{deleteConfirmStudent.roll_no}: {deleteConfirmStudent.name} ({deleteConfirmStudent.admission_no})
                </p>
                <p className="text-[11px] text-rose-700 mt-1">
                  All associated marks, FLN assessment levels, attendance logs, and uploaded test copies will also be removed.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setDeleteConfirmStudent(null)}
                  className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteStudent}
                  className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? "Deleting..." : "Permanently Delete"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Import Excel */}
        {isImportModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-blue-600" />
                Upload Student Excel File
              </h3>

              <form onSubmit={handleImportExcel} className="space-y-4 text-xs">
                <p className="text-slate-500 font-medium">
                  Upload an Excel workbook (<code className="text-emerald-700 font-bold">.xlsx</code>) containing student records formatted identically to the <code className="text-slate-800 font-bold">STUDENT</code> sheet.
                </p>

                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-emerald-600 transition bg-slate-50/50">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    required
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                  />
                  {uploadFile && (
                    <span className="text-[11px] text-emerald-700 mt-2 block font-medium">
                      Selected: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 shadow-xs"
                  >
                    {isUploading ? "Uploading..." : "Start Import"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Student 360° Dossier & Uploads Modal */}
        {dossierStudentId && (
          <StudentDossierModal
            studentId={dossierStudentId}
            onClose={() => setDossierStudentId(null)}
            onUpdated={fetchStudents}
          />
        )}

      </main>
    </div>
  );
}
