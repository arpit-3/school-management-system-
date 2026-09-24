import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import {
  Users,
  BookOpen,
  GraduationCap,
  Plus,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  Layers,
  UserCheck,
  Tag,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Sliders
} from "lucide-react";

export default function ClassManagement() {
  const { user, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState("classes"); // "classes" or "subjects"

  const [classrooms, setClassrooms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [isAllocModalOpen, setIsAllocModalOpen] = useState(false);
  const [isEditCapacityOpen, setIsEditCapacityOpen] = useState(false);

  // Selected class for allocation / capacity
  const [selectedClass, setSelectedClass] = useState(null);

  // Forms state
  const [classForm, setClassForm] = useState({
    class_name: "III",
    section_name: "B",
    category: "BOYS",
    room_number: "Room 14",
    max_capacity: 45,
    class_teacher_id: "",
    total_students: 0
  });

  const [capacityForm, setCapacityForm] = useState({
    max_capacity: 45,
    room_number: ""
  });

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    code: "",
    is_fln_subject: true,
    max_pa_marks: 20.0,
    max_term_marks: 50.0
  });

  const [allocForm, setAllocForm] = useState({
    subject_id: "",
    teacher_id: ""
  });

  const canManage = hasRole("SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classRes, subRes, teacherRes] = await Promise.all([
        api.get("/classrooms"),
        api.get("/subjects"),
        api.get("/teachers")
      ]);

      if (classRes.data.status === "success") {
        setClassrooms(classRes.data.classrooms || []);
      }
      if (subRes.data.status === "success") {
        setSubjects(subRes.data.subjects || []);
      }
      if (teacherRes.data.status === "success") {
        setTeachers(teacherRes.data.teachers || []);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load classroom data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        ...classForm,
        school_id: user?.school_id || 1,
        session_id: 1, // Active 2026-27 session
        max_capacity: parseInt(classForm.max_capacity) || 45,
        class_teacher_id: classForm.class_teacher_id ? parseInt(classForm.class_teacher_id) : null,
        total_students: parseInt(classForm.total_students) || 0
      };

      const res = await api.post("/classrooms", payload);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        setIsClassModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create class section.");
    }
  };

  const handleUpdateCapacity = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;
    try {
      const res = await api.put(`/classrooms/${selectedClass.id}`, {
        max_capacity: parseInt(capacityForm.max_capacity) || 45,
        room_number: capacityForm.room_number
      });
      if (res.data.status === "success") {
        setSuccessMsg("Class capacity and room updated successfully.");
        setIsEditCapacityOpen(false);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update capacity.");
    }
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    try {
      const payload = {
        ...subjectForm,
        school_id: user?.school_id || 1,
        max_pa_marks: parseFloat(subjectForm.max_pa_marks),
        max_term_marks: parseFloat(subjectForm.max_term_marks)
      };

      const res = await api.post("/subjects", payload);
      if (res.data.status === "success") {
        setSuccessMsg(res.data.message);
        setIsSubjectModalOpen(false);
        setSubjectForm({ name: "", code: "", is_fln_subject: true, max_pa_marks: 20.0, max_term_marks: 50.0 });
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create subject.");
    }
  };

  const handleOpenAllocation = async (cls) => {
    setSelectedClass(cls);
    setIsAllocModalOpen(true);
    setAllocForm({
      subject_id: subjects[0]?.id || "",
      teacher_id: cls.class_teacher_id || teachers[0]?.id || ""
    });
  };

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    if (!selectedClass) return;

    try {
      const payload = {
        class_section_id: selectedClass.id,
        subject_id: parseInt(allocForm.subject_id),
        teacher_id: parseInt(allocForm.teacher_id)
      };

      const res = await api.post("/classrooms/allocations", payload);
      if (res.data.status === "success") {
        setSuccessMsg("Teacher allocated to subject successfully.");
        setIsAllocModalOpen(false);
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to allocate teacher.");
    }
  };

  const quickAddNextSection = (currentClass) => {
    const nextSectionChar = String.fromCharCode((currentClass.section_name || "A").charCodeAt(0) + 1);
    setClassForm({
      class_name: currentClass.class_name,
      section_name: nextSectionChar,
      category: currentClass.category || "BOYS",
      room_number: `Room ${parseInt(currentClass.room_number?.replace(/\D/g, '') || 12) + 1}`,
      max_capacity: 45,
      class_teacher_id: "",
      total_students: 0
    });
    setIsClassModalOpen(true);
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
                Module 4
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Class, Section &amp; Subject Management
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Configure primary grade levels (I-V), exceed section capacity, add new sections (A-E), and assign teachers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center gap-1 shadow-2xs">
              <button
                onClick={() => setActiveTab("classes")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "classes"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Classes & Sections ({classrooms.length})
              </button>
              <button
                onClick={() => setActiveTab("subjects")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === "subjects"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Subjects ({subjects.length})
              </button>
            </div>

            {canManage && (
              activeTab === "classes" ? (
                <button
                  onClick={() => {
                    setClassForm({
                      class_name: "III",
                      section_name: "B",
                      category: "BOYS",
                      room_number: "Room 14",
                      max_capacity: 45,
                      class_teacher_id: "",
                      total_students: 0
                    });
                    setIsClassModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add / Exceed Section</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsSubjectModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Subject</span>
                </button>
              )
            )}
          </div>
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

        {/* TAB 1: Classes and Sections */}
        {activeTab === "classes" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map((cls) => {
                const isWorkbookPrimaryClass = cls.class_name === "III" && cls.section_name === "A";
                const capacity = cls.max_capacity || 45;
                const capacityPct = Math.min(100, Math.round((cls.total_students / capacity) * 100));
                const isNearCapacity = cls.total_students >= capacity;

                return (
                  <div
                    key={cls.id}
                    className={`rounded-2xl p-5 border transition flex flex-col justify-between ${
                      isWorkbookPrimaryClass
                        ? "bg-gradient-to-b from-white via-white to-emerald-50/50 border-emerald-300 shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm shadow-2xs ${
                            isWorkbookPrimaryClass
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-800"
                          }`}>
                            {cls.class_name}-{cls.section_name}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">
                                {cls.display_name}
                              </h3>
                              {isWorkbookPrimaryClass && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  PRIMARY DATASET
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 block font-medium">
                              Category: <strong className="text-slate-700">{cls.category}</strong> • {cls.room_number || "Room N/A"}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 block">
                            {cls.total_students} / {capacity}
                          </span>
                        </div>
                      </div>

                      {/* Section Capacity Bar */}
                      <div className="mt-3 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1">
                          <span className="font-semibold flex items-center gap-1">
                            <span>Capacity Usage</span>
                            {isNearCapacity && <AlertTriangle className="w-3 h-3 text-amber-500" />}
                          </span>
                          <span className="font-bold">{capacityPct}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              capacityPct >= 95 ? "bg-rose-500" : capacityPct >= 80 ? "bg-amber-500" : "bg-emerald-600"
                            }`}
                            style={{ width: `${capacityPct}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center mt-1 text-[10px] text-slate-400">
                          <span>{capacity - cls.total_students > 0 ? `${capacity - cls.total_students} seats available` : "Section full / exceeded"}</span>
                          {canManage && (
                            <button
                              onClick={() => {
                                setSelectedClass(cls);
                                setCapacityForm({ max_capacity: capacity, room_number: cls.room_number || "" });
                                setIsEditCapacityOpen(true);
                              }}
                              className="text-emerald-700 font-bold hover:underline"
                            >
                              Edit Capacity
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Class Teacher Allocation */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                          Assigned Class Teacher
                        </span>
                        {cls.class_teacher ? (
                          <div className="mt-1 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-emerald-600" />
                              <div>
                                <span className="text-xs font-bold text-slate-800 block">
                                  {cls.class_teacher.full_name}
                                </span>
                                {cls.class_teacher.employee_id && (
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    BMID: {cls.class_teacher.employee_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600 italic mt-1 block font-medium">
                            No Class Teacher assigned
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        onClick={() => quickAddNextSection(cls)}
                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                        title="Add next section for this class (e.g. III-B, III-C)"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Section {String.fromCharCode((cls.section_name || "A").charCodeAt(0) + 1)}</span>
                      </button>

                      {canManage && (
                        <button
                          onClick={() => handleOpenAllocation(cls)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-emerald-700 transition"
                        >
                          <span>Allocations</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: Subjects Catalog */}
        {activeTab === "subjects" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Primary Academic Subjects & Evaluation Scheme
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Primary subjects evaluated in Periodic Assessments (PA-1 to PA-4) and Term Examinations.
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4">Subject Name</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">FLN Mission Buniyad</th>
                    <th className="py-3 px-4">Max Periodic Marks</th>
                    <th className="py-3 px-4">Max Term Marks</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                        {sub.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {sub.code}
                      </td>
                      <td className="py-3.5 px-4">
                        {sub.is_fln_subject ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            <Sparkles className="w-3 h-3" />
                            FLN CORE (L1-L5)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-slate-400 font-medium">
                            Standard Subject
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {sub.max_pa_marks} Marks (PA-1 to PA-4)
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {sub.max_term_marks} Marks (Mid / Final)
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px]">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal: Create / Exceed Class Section */}
        {isClassModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-600" />
                Add / Exceed Class Section
              </h3>
              <p className="text-xs text-slate-500">
                Create an additional section (e.g. Class III-B, III-C, IV-A) and set custom student capacity limits.
              </p>

              <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Class Level</label>
                    <select
                      value={classForm.class_name}
                      onChange={(e) => setClassForm({ ...classForm, class_name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="I">Class I</option>
                      <option value="II">Class II</option>
                      <option value="III">Class III</option>
                      <option value="IV">Class IV</option>
                      <option value="V">Class V</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Section</label>
                    <select
                      value={classForm.section_name}
                      onChange={(e) => setClassForm({ ...classForm, section_name: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                      <option value="E">Section E</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Max Student Capacity</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={classForm.max_capacity}
                      onChange={(e) => setClassForm({ ...classForm, max_capacity: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Room Number</label>
                    <input
                      type="text"
                      placeholder="Room 14"
                      value={classForm.room_number}
                      onChange={(e) => setClassForm({ ...classForm, room_number: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Category</label>
                  <select
                    value={classForm.category}
                    onChange={(e) => setClassForm({ ...classForm, category: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="BOYS">BOYS</option>
                    <option value="GIRLS">GIRLS</option>
                    <option value="CO-ED">CO-ED</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Class Teacher</label>
                  <select
                    value={classForm.class_teacher_id}
                    onChange={(e) => setClassForm({ ...classForm, class_teacher_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  >
                    <option value="">-- Select Class Teacher --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} {t.employee_id ? `(BMID: ${t.employee_id})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsClassModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs"
                  >
                    Create Section
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Edit Capacity */}
        {isEditCapacityOpen && selectedClass && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-600" />
                Edit Capacity: {selectedClass.display_name}
              </h3>

              <form onSubmit={handleUpdateCapacity} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Max Student Capacity</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={capacityForm.max_capacity}
                    onChange={(e) => setCapacityForm({ ...capacityForm, max_capacity: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Room Number</label>
                  <input
                    type="text"
                    value={capacityForm.room_number}
                    onChange={(e) => setCapacityForm({ ...capacityForm, room_number: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsEditCapacityOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Subject */}
        {isSubjectModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-600" />
                Add New Primary Subject
              </h3>

              <form onSubmit={handleCreateSubject} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subject Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SANSKRIT or ART"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subject Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKT or ART"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Max PA Marks</label>
                    <input
                      type="number"
                      step="0.5"
                      value={subjectForm.max_pa_marks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, max_pa_marks: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Max Term Marks</label>
                    <input
                      type="number"
                      step="0.5"
                      value={subjectForm.max_term_marks}
                      onChange={(e) => setSubjectForm({ ...subjectForm, max_term_marks: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="is_fln_check"
                    checked={subjectForm.is_fln_subject}
                    onChange={(e) => setSubjectForm({ ...subjectForm, is_fln_subject: e.target.checked })}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                  <label htmlFor="is_fln_check" className="text-slate-700 font-medium">
                    Include in FLN Mission Buniyad (L1 to L5 assessment)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsSubjectModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs"
                  >
                    Create Subject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Allocate Teacher to Subject */}
        {isAllocModalOpen && selectedClass && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Allocate Subject Teacher: {selectedClass.display_name}
              </h3>

              <form onSubmit={handleSaveAllocation} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subject</label>
                  <select
                    required
                    value={allocForm.subject_id}
                    onChange={(e) => setAllocForm({ ...allocForm, subject_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code}) {s.is_fln_subject ? "• FLN" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assign Teacher</label>
                  <select
                    required
                    value={allocForm.teacher_id}
                    onChange={(e) => setAllocForm({ ...allocForm, teacher_id: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 outline-none focus:border-emerald-600"
                  >
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name} {t.employee_id ? `(BMID: ${t.employee_id})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAllocModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition shadow-xs"
                  >
                    Save Allocation
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
