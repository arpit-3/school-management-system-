import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import {
  X,
  User,
  Camera,
  Upload,
  FileText,
  File,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Award,
  BookOpen,
  Calendar,
  Sparkles,
  ExternalLink,
  Eye,
  Plus,
  Layers,
  Search,
  Check,
  Landmark,
  CreditCard,
  Edit3,
  ShieldAlert,
  Phone,
  MapPin
} from "lucide-react";

export default function StudentDossierModal({ studentId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(true);
  const [dossier, setDossier] = useState(null);
  const [activeTab, setActiveTab] = useState("ACADEMICS"); // ACADEMICS, FLN, ATTENDANCE, TEST_COPIES, PROFILE, AI_INSIGHTS
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoSuccess, setPhotoSuccess] = useState("");

  // Test copy upload form state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [testAssessmentId, setTestAssessmentId] = useState("");
  const [testSubjectId, setTestSubjectId] = useState("");
  const [testMarks, setTestMarks] = useState("");
  const [testNotes, setTestNotes] = useState("");
  const [testFile, setTestFile] = useState(null);
  const [uploadingCopy, setUploadingCopy] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadSuccess, setUploadSuccess] = useState("");

  // Bank & Profile Edit state
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    bank_account_no: "",
    ifsc_code: "",
    bank_branch: "",
    account_holder_name: ""
  });
  const [savingBank, setSavingBank] = useState(false);
  const [bankSuccess, setBankSuccess] = useState("");
  const [bankError, setBankError] = useState("");

  // Delete Student Confirmation state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState(false);

  // Document preview state
  const [previewDoc, setPreviewDoc] = useState(null);

  // Dropdown options
  const [assessments, setAssessments] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const fileInputRef = useRef(null);

  const fetchDossier = async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/students/${studentId}/full-dossier`);
      if (res.data.status === "success") {
        setDossier(res.data);
        if (res.data.student) {
          setBankForm({
            bank_name: res.data.student.bank_name || "",
            bank_account_no: res.data.student.bank_account_no || "",
            ifsc_code: res.data.student.ifsc_code || "",
            bank_branch: res.data.student.bank_branch || "",
            account_holder_name: res.data.student.account_holder_name || res.data.student.name || ""
          });
        }
      }
    } catch (err) {
      console.error("Failed to load student dossier:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDossier();
    // Fetch dropdowns for test copy upload
    const fetchMeta = async () => {
      try {
        const [resAss, resSub] = await Promise.all([
          api.get("/assessments"),
          api.get("/subjects")
        ]);
        setAssessments(resAss.data.assessments || []);
        setSubjects(resSub.data.subjects || []);
        if (resAss.data.assessments?.length) setTestAssessmentId(resAss.data.assessments[0].id);
        if (resSub.data.subjects?.length) setTestSubjectId(resSub.data.subjects[0].id);
      } catch (e) {
        // ignore
      }
    };
    fetchMeta();
  }, [studentId]);

  // Handle Photo Upload
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      setPhotoError("");
      setPhotoSuccess("");

      const formData = new FormData();
      formData.append("photo", file);

      const res = await api.post(`/students/${studentId}/photo`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.status === "success") {
        setPhotoSuccess("Photo updated!");
        fetchDossier();
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      setPhotoError(err.response?.data?.error || "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Test Copy Upload
  const handleUploadTestCopy = async (e) => {
    e.preventDefault();
    if (!testFile) {
      setUploadError("Please select a file to upload.");
      return;
    }

    try {
      setUploadingCopy(true);
      setUploadError("");
      setUploadSuccess("");

      const formData = new FormData();
      formData.append("file", testFile);
      formData.append("title", testTitle || "Assessment Test Copy");
      if (testAssessmentId) formData.append("assessment_id", testAssessmentId);
      if (testSubjectId) formData.append("subject_id", testSubjectId);
      if (testMarks) formData.append("marks_awarded", testMarks);
      if (testNotes) formData.append("notes", testNotes);

      const res = await api.post(`/students/${studentId}/test-copies`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (res.data.status === "success") {
        setUploadSuccess("Test copy uploaded successfully!");
        setTestFile(null);
        setTestTitle("");
        setTestMarks("");
        setTestNotes("");
        setShowUploadModal(false);
        fetchDossier();
      }
    } catch (err) {
      setUploadError(err.response?.data?.error || "Failed to upload test copy.");
    } finally {
      setUploadingCopy(false);
    }
  };

  // Delete Test Copy
  const handleDeleteCopy = async (copyId) => {
    if (!window.confirm("Are you sure you want to remove this test copy?")) return;
    try {
      await api.delete(`/students/test-copies/${copyId}`);
      fetchDossier();
    } catch (err) {
      alert("Failed to delete test copy.");
    }
  };

  // Handle Save Bank Details
  const handleSaveBankDetails = async (e) => {
    e.preventDefault();
    try {
      setSavingBank(true);
      setBankError("");
      setBankSuccess("");

      const res = await api.put(`/students/${studentId}`, bankForm);
      if (res.data.status === "success") {
        setBankSuccess("Bank & DBT details saved successfully!");
        setIsEditingBank(false);
        fetchDossier();
        if (onUpdated) onUpdated();
      }
    } catch (err) {
      setBankError(err.response?.data?.error || "Failed to update bank details.");
    } finally {
      setSavingBank(false);
    }
  };

  // Handle Delete Student
  const handleDeleteStudentAction = async () => {
    try {
      setDeletingStudent(true);
      const res = await api.delete(`/students/${studentId}`);
      if (res.data.status === "success") {
        if (onUpdated) onUpdated();
        onClose();
      }
    } catch (err) {
      alert(err.response?.data?.error || "Failed to delete student.");
    } finally {
      setDeletingStudent(false);
      setShowDeleteConfirm(false);
    }
  };

  if (!studentId) return null;

  const student = dossier?.student;
  const marks = dossier?.marks || [];
  const flnRecords = dossier?.fln_records || [];
  const attendances = dossier?.attendances || [];
  const testCopies = dossier?.test_copies || [];
  const ai = dossier?.ai_insights;

  const photoBaseUrl = "http://127.0.0.1:5000";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header Hero Banner */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Student Photo Avatar with Camera Button */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative group cursor-pointer"
              title="Click to upload student photo"
            >
              <div className="w-16 h-16 rounded-2xl bg-slate-200 border-2 border-white shadow-md overflow-hidden flex items-center justify-center">
                {student?.photo_url ? (
                  <img
                    src={student.photo_url.startsWith("http") ? student.photo_url : `${photoBaseUrl}${student.photo_url}`}
                    alt={student.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-slate-400" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                <Camera className="w-5 h-5" />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handlePhotoSelect}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Roll #{student?.roll_no}
                </span>
                <h2 className="text-xl font-bold text-slate-900">{student?.name || "Student Profile"}</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                  {student?.category}
                </span>
                {student?.bank_account_no && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center gap-1">
                    <Landmark className="w-3 h-3" />
                    DBT Linked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                <span>Admission: <strong className="text-slate-700 font-mono">{student?.admission_no || "N/A"}</strong></span>
                <span>•</span>
                <span>Class: <strong className="text-slate-700">{student?.class_display || "Class III-A"}</strong></span>
                <span>•</span>
                <span>Father: <strong className="text-slate-700">{student?.father_name || "N/A"}</strong></span>
              </p>
              {photoSuccess && <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">{photoSuccess}</span>}
              {photoError && <span className="text-[11px] text-rose-600 font-bold block mt-0.5">{photoError}</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 shadow-2xs transition flex items-center gap-1.5"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>{uploadingPhoto ? "Uploading..." : "Change Photo"}</span>
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 transition flex items-center gap-1.5"
              title="Delete Student"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-200 bg-white overflow-x-auto text-xs font-semibold">
          {[
            { key: "ACADEMICS", label: "Academic Marks", count: marks.length, icon: Award },
            { key: "FLN", label: "FLN Competencies", count: flnRecords.length, icon: BookOpen },
            { key: "ATTENDANCE", label: "Attendance", count: attendances.length, icon: Calendar },
            { key: "TEST_COPIES", label: "Test Copies & Answer Sheets", count: testCopies.length, icon: FileText },
            { key: "PROFILE", label: "Bio & Bank Details", icon: Landmark },
            { key: "AI_INSIGHTS", label: "AI Diagnostic Dossier", icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                  isActive
                    ? "border-emerald-600 text-emerald-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Loading student record...</div>
          ) : (
            <>
              {/* TAB 1: ACADEMICS */}
              {activeTab === "ACADEMICS" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Evaluated Scholastic Marks &amp; Periodic Assessments
                    </h3>
                  </div>

                  {marks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                      No marks recorded yet for this student.
                    </div>
                  ) : (
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">Subject</th>
                            <th className="py-2.5 px-4">Assessment</th>
                            <th className="py-2.5 px-4 text-center">Marks Obtained</th>
                            <th className="py-2.5 px-4 text-center">Max Marks</th>
                            <th className="py-2.5 px-4 text-center">Percentage</th>
                            <th className="py-2.5 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {marks.map((m, i) => (
                            <tr key={i} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-4 font-bold text-slate-900">{m.subject_name}</td>
                              <td className="py-2.5 px-4 font-mono text-slate-600">{m.assessment_name || m.assessment_code}</td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">
                                {m.marks_obtained !== null ? m.marks_obtained : "Ab"}
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono text-slate-500">{m.max_marks}</td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-700">
                                {m.percentage !== null ? `${m.percentage}%` : "-"}
                              </td>
                              <td className="py-2.5 px-4">
                                {m.is_absent ? (
                                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">Absent</span>
                                ) : (
                                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">Recorded</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: FLN MISSION BUNIYAD */}
              {activeTab === "FLN" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    FLN Mission Buniyad Foundational Competencies
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {flnRecords.map((f, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900">{f.subject_name}</span>
                          <span className="text-[10px] font-mono text-slate-500 font-semibold">{f.assessment_code}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-emerald-700">
                            {f.is_absent ? "Ab" : `Level ${f.level}`}
                          </span>
                          <span className="text-xs text-slate-600 font-medium">{f.level_name}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: ATTENDANCE */}
              {activeTab === "ATTENDANCE" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Attendance Ledger &amp; Term Summaries
                  </h3>

                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left text-xs text-slate-700">
                      <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-semibold">
                        <tr>
                          <th className="py-2.5 px-4">Period</th>
                          <th className="py-2.5 px-4 text-center">Working Days</th>
                          <th className="py-2.5 px-4 text-center">Present Days</th>
                          <th className="py-2.5 px-4 text-center">Absent Days</th>
                          <th className="py-2.5 px-4 text-center">Attendance %</th>
                          <th className="py-2.5 px-4">Standing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {attendances.map((a, i) => (
                          <tr key={i} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-4 font-bold text-slate-900">{a.month || `Term ${a.term}`}</td>
                            <td className="py-2.5 px-4 text-center font-mono">{a.working_days}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-slate-900">{a.present_days}</td>
                            <td className="py-2.5 px-4 text-center font-mono text-slate-500">{a.absent_days}</td>
                            <td className="py-2.5 px-4 text-center font-mono font-bold text-emerald-700">{a.percentage}%</td>
                            <td className="py-2.5 px-4">
                              {a.is_low_attendance ? (
                                <span className="text-[11px] text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-semibold">
                                  Warning (&lt;75%)
                                </span>
                              ) : (
                                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                                  Regular
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: TEST COPIES & ANSWER SHEETS */}
              {activeTab === "TEST_COPIES" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        Uploaded Test Copies &amp; Scanned Answer Sheets
                      </h3>
                      <p className="text-xs text-slate-500">
                        Official repository of scanned assessment answer papers and graded tests.
                      </p>
                    </div>

                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition shrink-0"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Test Copy</span>
                    </button>
                  </div>

                  {testCopies.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl space-y-2">
                      <FileText className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                      <p className="font-semibold text-slate-600">No test copies uploaded yet.</p>
                      <p className="text-[11px] text-slate-400">Click the button above to upload scanned test papers (PDF, PNG, JPG).</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {testCopies.map(copy => (
                        <div key={copy.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:border-slate-300 transition">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                {copy.subject_code || "TEST"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {copy.uploaded_at ? new Date(copy.uploaded_at).toLocaleDateString() : ""}
                              </span>
                            </div>

                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{copy.title}</h4>
                            <p className="text-xs text-slate-500 font-mono text-[11px]">{copy.file_name} ({(copy.file_size / 1024).toFixed(1)} KB)</p>

                            {copy.marks_awarded !== null && copy.marks_awarded !== undefined && (
                              <div className="text-xs font-semibold text-slate-700 mt-1">
                                Marks Awarded: <strong className="text-emerald-700 font-bold">{copy.marks_awarded}</strong>
                              </div>
                            )}

                            {copy.notes && (
                              <p className="text-xs text-slate-600 italic bg-white p-2 rounded-lg border border-slate-200 mt-1">
                                "{copy.notes}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                            <button
                              onClick={() => setPreviewDoc(copy)}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Preview</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <a
                                href={`http://127.0.0.1:5000/api/students/test-copies/file/${copy.id}?token=${localStorage.getItem("token")}`}
                                target="_blank"
                                rel="noreferrer"
                                download
                                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition"
                                title="Download File"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => handleDeleteCopy(copy.id)}
                                className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                                title="Delete Copy"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: BIO & BANK DETAILS */}
              {activeTab === "PROFILE" && (
                <div className="space-y-6">
                  {/* Bank & DBT Welfare Card */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-emerald-950">
                            Bank Account &amp; Direct Benefit Transfer (DBT) Details
                          </h4>
                          <p className="text-xs text-emerald-800">
                            Required for government scholarships, uniform allowances, and welfare subsidies.
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setIsEditingBank(!isEditingBank)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold shadow-2xs transition"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{isEditingBank ? "Cancel" : "Update Bank Details"}</span>
                      </button>
                    </div>

                    {bankSuccess && (
                      <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{bankSuccess}</span>
                      </div>
                    )}
                    {bankError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span>{bankError}</span>
                      </div>
                    )}

                    {isEditingBank ? (
                      <form onSubmit={handleSaveBankDetails} className="space-y-3 bg-white p-4 rounded-xl border border-emerald-200 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Bank Name</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. State Bank of India"
                              value={bankForm.bank_name}
                              onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Account Number</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 10928374651"
                              value={bankForm.bank_account_no}
                              onChange={(e) => setBankForm({ ...bankForm, bank_account_no: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">IFSC Code</label>
                            <input
                              type="text"
                              required
                              placeholder="SBIN0001234"
                              value={bankForm.ifsc_code}
                              onChange={(e) => setBankForm({ ...bankForm, ifsc_code: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono uppercase text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Branch Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Rohini Sec-22"
                              value={bankForm.bank_branch}
                              onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-slate-700 font-semibold mb-1">Account Holder Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Student / Mother Name"
                              value={bankForm.account_holder_name}
                              onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setIsEditingBank(false)}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={savingBank}
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                          >
                            {savingBank ? "Saving..." : "Save Bank Details"}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Bank Name</span>
                          <span className="text-sm font-bold text-slate-900">{student?.bank_name || "Not Configured"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Account Number</span>
                          <span className="text-sm font-mono font-bold text-slate-900">{student?.bank_account_no || "Not Configured"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">IFSC Code</span>
                          <span className="text-sm font-mono font-bold text-slate-900">{student?.ifsc_code || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Branch</span>
                          <span className="text-xs font-semibold text-slate-800">{student?.bank_branch || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-bold block">Account Holder</span>
                          <span className="text-xs font-semibold text-slate-800">{student?.account_holder_name || student?.name}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Personal & Family Details Card */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Personal &amp; Demographic Profile
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Father's Name</span>
                        <span className="font-semibold text-slate-900">{student?.father_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Mother's Name</span>
                        <span className="font-semibold text-slate-900">{student?.mother_name || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Contact Phone</span>
                        <span className="font-semibold text-slate-900">{student?.contact_no || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Date of Birth</span>
                        <span className="font-semibold text-slate-900">{student?.dob || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Gender</span>
                        <span className="font-semibold text-slate-900">{student?.gender}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Category</span>
                        <span className="font-semibold text-slate-900">{student?.category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Aadhar Number</span>
                        <span className="font-mono font-semibold text-slate-900">{student?.aadhar_no || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold block">Blood Group</span>
                        <span className="font-semibold text-slate-900">{student?.blood_group || "N/A"}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">Residential Address</span>
                      <p className="text-xs text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200">
                        {student?.address || "No residential address on record."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: AI DIAGNOSTIC INSIGHTS */}
              {activeTab === "AI_INSIGHTS" && (
                <div className="space-y-4">
                  <div className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">AI Student Learning Diagnostic</h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Synthesized analysis of student exam performances, FLN milestones, and attendance correlations.
                      </p>
                    </div>
                  </div>

                  {ai ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                        <span className="font-bold text-emerald-700 block text-xs uppercase tracking-wider">Key Strengths</span>
                        <ul className="space-y-1 list-disc list-inside text-slate-700">
                          {(ai.strengths || ["Consistent participation in numeracy exercises", "Strong score in periodic testing"]).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                        <span className="font-bold text-amber-700 block text-xs uppercase tracking-wider">Growth Opportunities</span>
                        <ul className="space-y-1 list-disc list-inside text-slate-700">
                          {(ai.areas_to_improve || ["Needs practice in Hindi advanced paragraph reading", "Vocabulary enhancement"]).map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="sm:col-span-2 bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                        <span className="font-bold text-slate-800 block text-xs uppercase tracking-wider">Recommended Teacher Interventions</span>
                        <p className="text-slate-700 leading-relaxed">
                          {ai.recommended_interventions || "Provide 15 minutes of guided English phonetics practice daily and pair with peer mentor for mathematics word problems."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      AI Diagnostic is compiling for this student...
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>

      {/* Upload Test Copy Modal Sub-Dialog */}
      {showUploadModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-600" />
                Upload Student Test Copy / Answer Sheet
              </h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <form onSubmit={handleUploadTestCopy} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Title / Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Periodic Assessment 1 - Hindi Answer Sheet"
                  value={testTitle}
                  onChange={(e) => setTestTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Subject</label>
                  <select
                    value={testSubjectId}
                    onChange={(e) => setTestSubjectId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Assessment Type</label>
                  <select
                    value={testAssessmentId}
                    onChange={(e) => setTestAssessmentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                  >
                    {assessments.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.code})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Marks Awarded</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 18.5"
                    value={testMarks}
                    onChange={(e) => setTestMarks(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Teacher Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Good handwriting, missed Q4"
                    value={testNotes}
                    onChange={(e) => setTestNotes(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 outline-none focus:border-emerald-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Document File (PDF / PNG / JPG) *</label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:border-emerald-600 transition bg-slate-50">
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp"
                    required
                    onChange={(e) => setTestFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300"
                  />
                  {testFile && (
                    <span className="text-[11px] text-emerald-700 mt-2 block font-medium">
                      Selected: {testFile.name} ({(testFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingCopy}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-2 shadow-xs"
                >
                  {uploadingCopy ? "Uploading..." : "Save Test Copy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-70 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Delete Student Record</h3>
                <p className="text-xs text-slate-500">This action permanently deletes all associated data.</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
              <p className="font-bold text-sm text-slate-900">
                Roll #{student?.roll_no}: {student?.name}
              </p>
              <p className="text-[11px] text-rose-700">
                All academic marks, FLN levels, attendance logs, and uploaded test copy documents will be permanently removed.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={deletingStudent}
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingStudent}
                onClick={handleDeleteStudentAction}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deletingStudent ? "Deleting..." : "Permanently Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm">{previewDoc.title}</h4>
                <p className="text-[11px] text-slate-400 font-mono">{previewDoc.file_name}</p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-2 overflow-auto flex items-center justify-center">
              {previewDoc.file_name.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={`http://127.0.0.1:5000/api/students/test-copies/file/${previewDoc.id}?token=${localStorage.getItem("token")}`}
                  title={previewDoc.title}
                  className="w-full h-full rounded-xl border border-slate-300"
                />
              ) : (
                <img
                  src={`http://127.0.0.1:5000/api/students/test-copies/file/${previewDoc.id}?token=${localStorage.getItem("token")}`}
                  alt={previewDoc.title}
                  className="max-h-full max-w-full object-contain rounded-xl shadow-md"
                />
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
