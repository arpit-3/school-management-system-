import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";
import { Printer, Download, Sparkles, User, School, Calendar, Award, CheckCircle, RefreshCw, FileSpreadsheet, Camera, Upload } from "lucide-react";

// =========================================================================
// INTERACTIVE PASSPORT PHOTO COMPONENT (PASTE / UPLOAD / AUTO-RENDER)
// =========================================================================
export function StudentPassportPhoto({
  student,
  showBlank = false,
  className = "w-20 h-24",
  captionLines = ["Passport Size", "Photo", "Of", "Student"],
  onPhotoChanged
}) {
  const [localPhoto, setLocalPhoto] = useState(null);
  const fileInputRef = useRef(null);

  // Sync with student prop when student changes
  useEffect(() => {
    setLocalPhoto(null);
  }, [student?.id]);

  // Compute final photo URL
  const rawUrl = localPhoto || student?.photo_url;
  let resolvedUrl = null;
  if (!showBlank) {
    if (rawUrl) {
      if (rawUrl.startsWith("http") || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
        resolvedUrl = rawUrl;
      } else {
        resolvedUrl = `http://127.0.0.1:5000${rawUrl.startsWith("/") ? "" : "/"}${rawUrl}`;
      }
    } else if (student?.name) {
      // High-resolution realistic student portrait based on name/roll
      const seed = encodeURIComponent(student.name || `student_${student.id || 1}`);
      resolvedUrl = `https://api.dicebear.com/7.x/personas/svg?seed=${seed}&backgroundColor=e2e8f0`;
    }
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setLocalPhoto(previewUrl);

    if (student?.id) {
      try {
        const formData = new FormData();
        formData.append("photo", file);
        const res = await api.post(`/students/${student.id}/photo`, formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        if (res.data?.status === "success") {
          if (onPhotoChanged) onPhotoChanged(res.data.photo_url);
        }
      } catch (err) {
        console.error("Failed to upload student photo:", err);
      }
    }
  };

  const handlePaste = async (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const previewUrl = URL.createObjectURL(file);
          setLocalPhoto(previewUrl);
          if (student?.id) {
            try {
              const formData = new FormData();
              formData.append("photo", file);
              const res = await api.post(`/students/${student.id}/photo`, formData, {
                headers: { "Content-Type": "multipart/form-data" }
              });
              if (res.data?.status === "success") {
                if (onPhotoChanged) onPhotoChanged(res.data.photo_url);
              }
            } catch (err) {
              console.error("Failed to upload pasted photo:", err);
            }
          }
        }
      }
    }
  };

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      onClick={() => fileInputRef.current?.click()}
      className={`relative ${className} mx-auto border border-black bg-white flex flex-col items-center justify-center cursor-pointer group select-none overflow-hidden shadow-2xs`}
      title="Click to change photo or paste image (Ctrl+V)"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt={student?.name || "Student"}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(student?.name || "Student")}&backgroundColor=e2e8f0&textColor=1e293b`;
          }}
        />
      ) : (
        <div className="w-full h-full border border-dashed border-slate-300 flex flex-col items-center justify-center p-1 text-slate-700 text-[10px] font-bold leading-tight text-center">
          {captionLines.map((line, idx) => (
            <span key={idx}>{line}</span>
          ))}
        </div>
      )}

      {/* Screen-only hover overlay to indicate upload/paste */}
      <div className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity print:hidden p-1 text-center">
        <Camera className="w-4 h-4 mb-0.5" />
        <span className="text-[9px] font-bold leading-tight">Change / Paste</span>
      </div>
    </div>
  );
}

// =========================================================================
// HIGH-FIDELITY MCD EMBLEM (OFFICIAL LOGO & FULL-COLOR WATERMARK)
// =========================================================================
export function MCDLogo({ className = "w-20 h-20", isWatermark = false }) {

  if (isWatermark) {
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden select-none">
        <div className="w-[500px] h-[500px] opacity-[0.14] transform scale-110">
          <MCDLogoSVG />
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <MCDLogoSVG />
    </div>
  );
}

function MCDLogoSVG() {
  return (
    <svg viewBox="0 0 240 240" className="w-full h-full drop-shadow-xs" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Blue Ring with Gold Borders */}
      <circle cx="120" cy="120" r="110" fill="#1e3a8a" stroke="#d97706" strokeWidth="4" />
      <circle cx="120" cy="120" r="98" fill="#ffffff" stroke="#d97706" strokeWidth="3" />

      {/* Top Arc Text: दिल्ली नगर निगम */}
      <path id="crestTopArc" d="M 38 120 A 82 82 0 0 1 202 120" fill="none" />
      <text fontSize="14" fontWeight="900" fill="#1e293b" textAnchor="middle">
        <textPath href="#crestTopArc" startOffset="50%">
          दिल्ली नगर निगम
        </textPath>
      </text>

      {/* Bottom Arc Text: MUNICIPAL CORPORATION OF DELHI */}
      <path id="crestBottomArc" d="M 202 120 A 82 82 0 0 1 38 120" fill="none" />
      <text fontSize="9.5" fontWeight="900" fill="#1e3a8a" textAnchor="middle">
        <textPath href="#crestBottomArc" startOffset="50%">
          MUNICIPAL CORPORATION OF DELHI
        </textPath>
      </text>

      {/* Shield Container */}
      <g transform="translate(62, 54)">
        {/* Shield Border */}
        <path
          d="M 10 10 L 106 10 L 106 72 C 106 108 58 128 58 128 C 58 128 10 108 10 72 Z"
          fill="#dc2626"
          stroke="#1e3a8a"
          strokeWidth="3.5"
        />
        {/* Top Green Portion */}
        <path
          d="M 12 12 L 104 12 L 104 56 L 12 56 Z"
          fill="#15803d"
        />

        {/* Monument Silhouette (Qutub Minar / Red Fort Motif) */}
        <path d="M 48 20 L 52 14 L 64 14 L 68 20 L 66 56 L 50 56 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
        <rect x="54" y="24" width="8" height="32" fill="#eab308" />
        <polygon points="58,6 52,14 64,14" fill="#ca8a04" />
        
        {/* Sun Rays / Side Motifs */}
        <circle cx="34" cy="34" r="7" fill="#fef08a" />
        <circle cx="82" cy="34" r="7" fill="#fef08a" />

        {/* Open Book in Red Portion */}
        <path
          d="M 26 80 Q 58 90 58 74 Q 58 90 90 80 L 90 96 Q 58 106 58 90 Q 58 106 26 96 Z"
          fill="#ffffff"
          stroke="#0f172a"
          strokeWidth="2"
        />
        <line x1="58" y1="74" x2="58" y2="105" stroke="#0f172a" strokeWidth="2" />
      </g>

      {/* Bottom Motto Banner (Navy Blue Ribbon) */}
      <g transform="translate(0, 10)">
        <path
          d="M 28 184 L 212 184 L 198 206 L 42 206 Z"
          fill="#1d4ed8"
          stroke="#1e3a8a"
          strokeWidth="2.5"
        />
        <text x="120" y="200" textAnchor="middle" fontSize="11.5" fontWeight="900" fill="#ffffff" letterSpacing="0.5">
          तमसो मा ज्योतिर्गमय
        </text>
      </g>
    </svg>
  );
}

// =========================================================================
// ANNEXURE - F1: STUDENT'S FLN/EXCELLENCE RECORD (SINGLE UNIFIED CARD)
// =========================================================================
export function AnnexureF1({ data }) {
  const [showBlank, setShowBlank] = useState(false);
  if (!data) return null;
  const { school, student, progress_rows = [] } = data;

  // Filter valid data rows or provide rows for continuous listing
  const filledRows = progress_rows.filter(r => r.assessment_id || r.assessment_date || r.hindi || r.maths || r.english);
  const minRows = 20;
  
  // Combine all entries in single continuous card
  const displayRows = showBlank 
    ? Array(minRows).fill({}) 
    : [...filledRows, ...Array(Math.max(0, minRows - filledRows.length)).fill({})];

  return (
    <div className="annexure-root max-w-[920px] mx-auto space-y-6 text-black font-sans select-text">
      
      {/* View Options Toolbar (Screen Only) */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Display Mode:</span>
          <button
            onClick={() => setShowBlank(false)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              !showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Filled Student Card ({filledRows.length} Entries)
          </button>
          <button
            onClick={() => setShowBlank(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Blank Register Card
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Annexure F1</span>
        </button>
      </div>

      {/* ======================= SINGLE UNIFIED CARD ======================= */}
      <div className="annexure-sheet relative bg-white border-[2px] border-black p-4 sm:p-6 w-full min-h-[1050px] flex flex-col justify-between shadow-2xl print:shadow-none print:m-0 print:p-4 print:border-[2px] print:border-black">
        <MCDLogo isWatermark />

        <div className="relative z-10">
          {/* Header Box (Logo | Title | Photo Box) */}
          <table className="w-full border-collapse border border-black mb-1">
            <tbody>
              <tr>
                {/* Left: MCD Logo */}
                <td className="w-24 p-1 border-r border-black text-center align-middle bg-white">
                  <MCDLogo className="w-20 h-20 mx-auto" />
                </td>

                {/* Center: Official Title */}
                <td className="text-center p-2 align-middle bg-white">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight">
                    MUNICIPAL CORPORATION OF DELHI
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider mt-0.5">
                    EDUCATION DEPARTMENT
                  </h2>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight mt-1">
                    STUDENT'S FLN/EXCELLENCE RECORD
                  </h3>
                  <h4 className="text-sm sm:text-base font-black tracking-tight">
                    (ANNEXURE - F1)
                  </h4>
                  <p className="text-xs sm:text-sm font-bold uppercase mt-0.5">
                    SESSION: {school.session ? `20${school.session.replace('20', '')}` : "20__-__"}
                  </p>
                </td>

                {/* Right: Passport Photo Box */}
                <td className="w-24 p-1 border-l border-black text-center align-middle bg-white text-[11px] font-bold leading-tight">
                  <StudentPassportPhoto
                    student={student}
                    showBlank={showBlank}
                    className="w-20 h-24"
                    captionLines={["Passport Size", "Photo", "Of", "Student"]}
                  />
                </td>
              </tr>
            </tbody>
          </table>


          {/* Student Profile Table */}
          <table className="w-full border-collapse border border-black mb-1 text-xs sm:text-sm font-bold bg-white/95">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-44 p-1 border-r border-black uppercase text-slate-800">NAME OF SCHOOL:</td>
                <td colSpan={5} className="p-1 uppercase text-slate-950 font-black">
                  {!showBlank ? school.name : ""}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-44 p-1 border-r border-black uppercase text-slate-800">NAME OF STUDENT:</td>
                <td colSpan={5} className="p-1 uppercase text-slate-950 font-black">
                  {!showBlank ? student.name : ""}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-44 p-1 border-r border-black uppercase text-slate-800">FATHER'S NAME:</td>
                <td colSpan={5} className="p-1 uppercase text-slate-950 font-black">
                  {!showBlank ? student.father_name : ""}
                </td>
              </tr>
              <tr>
                <td className="w-36 p-1 border-r border-black uppercase text-slate-800">ADMISSION NO.:</td>
                <td className="p-1 border-r border-black uppercase font-black">
                  {!showBlank ? student.admission_no : ""}
                </td>
                <td className="w-28 p-1 border-r border-black uppercase text-slate-800">CLASS-SEC:</td>
                <td className="p-1 border-r border-black uppercase font-black">
                  {!showBlank ? student.class_section : ""}
                </td>
                <td className="w-24 p-1 border-r border-black uppercase text-slate-800">ROLL NO.:</td>
                <td className="p-1 uppercase font-black">
                  {!showBlank ? student.roll_no : ""}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Progress Report Table (All entries in same continuous table below first entry) */}
          <table className="w-full border-collapse border border-black text-xs bg-white/90">
            <thead>
              {/* Yellow Banner Row */}
              <tr>
                <th
                  colSpan={5}
                  className="bg-[#FFFF00] text-black font-black text-xs sm:text-sm py-1 border-b border-black text-center tracking-wide uppercase"
                >
                  FLN / EXCELLENCE PROGRESS REPORT
                </th>
              </tr>
              {/* Columns Header Row */}
              <tr className="border-b border-black text-center font-bold text-[11px] sm:text-xs">
                <th className="w-32 py-1 px-1 border-r border-black leading-tight uppercase">
                  ASSESSMENT<br />DATE
                </th>
                <th className="w-32 py-1 px-1 border-r border-black leading-tight text-emerald-900">
                  <span className="font-black text-black">HINDI</span><br />
                  <span className="text-[10px] text-slate-700 font-semibold">(Green Colour)<br />Mention Level</span>
                </th>
                <th className="w-32 py-1 px-1 border-r border-black leading-tight text-blue-900">
                  <span className="font-black text-black">MATHS</span><br />
                  <span className="text-[10px] text-slate-700 font-semibold">(Blue Colour)<br />Mention Level</span>
                </th>
                <th className="w-32 py-1 px-1 border-r border-black leading-tight text-red-900">
                  <span className="font-black text-black">ENGLISH</span><br />
                  <span className="text-[10px] text-slate-700 font-semibold">(Red Colour)<br />Mention Level</span>
                </th>
                <th className="py-1 px-2 uppercase font-black">
                  REMARKS
                </th>
              </tr>
            </thead>
            <tbody>
              {displayRows.map((row, idx) => (
                <tr key={idx} className="border-b border-black h-[28px] text-center font-bold text-xs hover:bg-yellow-50/30">
                  <td className="border-r border-black px-1 font-mono text-slate-900">
                    {!showBlank ? (row.assessment_date || (row.assessment_name ? row.assessment_name : "")) : ""}
                  </td>
                  <td className="border-r border-black px-1 text-emerald-800">
                    {!showBlank && row.hindi ? `Level ${row.hindi.level || ""}` : ""}
                  </td>
                  <td className="border-r border-black px-1 text-blue-800">
                    {!showBlank && row.maths ? `Level ${row.maths.level || ""}` : ""}
                  </td>
                  <td className="border-r border-black px-1 text-red-800">
                    {!showBlank && row.english ? `Level ${row.english.level || ""}` : ""}
                  </td>
                  <td className="px-2 text-left text-[11px] font-normal text-slate-800">
                    {!showBlank ? (row.remarks || "") : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Signatures Block at end of same card */}
        <div className="relative z-10 pt-10 pb-2 px-6 flex items-end justify-between font-black uppercase text-xs sm:text-sm">
          <div className="text-center">
            <div className="w-56 border-b border-black mb-1"></div>
            <span className="underline underline-offset-4 tracking-tight">SIGNATURE (CLASS TEACHER)</span>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5 normal-case">{school.teacher_name || "Class Teacher"}</p>
          </div>
          <div className="text-center">
            <div className="w-56 border-b border-black mb-1"></div>
            <span className="underline underline-offset-4 tracking-tight">H.O.S. SIGNATURE WITH STAMP</span>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5 normal-case">{school.principal_name || "Head of School"}</p>
          </div>
        </div>
      </div>

    </div>
  );
}

// =========================================================================
// ANNEXURE - F2: CLASSWISE FLN/EXCELLENCE RECORD (SINGLE UNIFIED CARD)
// =========================================================================
export function AnnexureF2({ data }) {
  const [showBlank, setShowBlank] = useState(false);
  if (!data) return null;
  const { school, class_info, rows = [] } = data;

  const filledRows = rows.filter(r => r.assessment_id || r.assessment_date || r.total_assessed);
  const minPairs = 10;
  
  const displayRows = showBlank 
    ? Array(minPairs).fill({}) 
    : [...filledRows, ...Array(Math.max(0, minPairs - filledRows.length)).fill({})];

  const renderGridRows = (rowList) => {
    return rowList.map((row, idx) => (
      <React.Fragment key={idx}>
        {/* Row 1: NUM */}
        <tr className="border-b border-black h-[24px] text-[10px] sm:text-[11px] font-bold text-center hover:bg-yellow-50/30">
          <td rowSpan={2} className="border-r border-black px-1 bg-white font-mono">
            {!showBlank ? (row.assessment_date || (row.assessment_name || "")) : ""}
          </td>
          <td rowSpan={2} className="border-r border-black px-1 bg-white">
            {!showBlank ? (row.total_enrolled || "") : ""}
          </td>
          <td rowSpan={2} className="border-r border-black px-1 bg-white">
            {!showBlank ? (row.total_absent || "") : ""}
          </td>
          <td rowSpan={2} className="border-r border-black px-1 bg-white">
            {!showBlank ? (row.total_assessed || "") : ""}
          </td>
          <td className="border-r border-black px-0.5 bg-slate-50 font-black">NUM-</td>

          {/* Hindi L1-L5 */}
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L1?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L2?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L3?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L4?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L5?.num ?? "") : ""}</td>

          {/* Maths L1-L5 */}
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L1?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L2?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L3?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L4?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L5?.num ?? "") : ""}</td>

          {/* English L1-L5 */}
          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L1?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L2?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L3?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L4?.num ?? "") : ""}</td>
          <td className="px-0.5 text-red-800">{!showBlank ? (row.english?.L5?.num ?? "") : ""}</td>
        </tr>

        {/* Row 2: % */}
        <tr className="border-b border-black h-[24px] text-[10px] sm:text-[11px] font-bold text-center bg-slate-50/20">
          <td className="border-r border-black px-0.5 bg-slate-100 font-black">%-</td>

          {/* Hindi L1-L5 % */}
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L1?.pct !== "" && row.hindi?.L1?.pct !== undefined ? `${row.hindi.L1.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L2?.pct !== "" && row.hindi?.L2?.pct !== undefined ? `${row.hindi.L2.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L3?.pct !== "" && row.hindi?.L3?.pct !== undefined ? `${row.hindi.L3.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L4?.pct !== "" && row.hindi?.L4?.pct !== undefined ? `${row.hindi.L4.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L5?.pct !== "" && row.hindi?.L5?.pct !== undefined ? `${row.hindi.L5.pct}%` : ""}</td>

          {/* Maths L1-L5 % */}
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L1?.pct !== "" && row.maths?.L1?.pct !== undefined ? `${row.maths.L1.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L2?.pct !== "" && row.maths?.L2?.pct !== undefined ? `${row.maths.L2.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L3?.pct !== "" && row.maths?.L3?.pct !== undefined ? `${row.maths.L3.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L4?.pct !== "" && row.maths?.L4?.pct !== undefined ? `${row.maths.L4.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L5?.pct !== "" && row.maths?.L5?.pct !== undefined ? `${row.maths.L5.pct}%` : ""}</td>

          {/* English L1-L5 % */}
          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L1?.pct !== "" && row.english?.L1?.pct !== undefined ? `${row.english.L1.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L2?.pct !== "" && row.english?.L2?.pct !== undefined ? `${row.english.L2.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L3?.pct !== "" && row.english?.L3?.pct !== undefined ? `${row.english.L3.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L4?.pct !== "" && row.english?.L4?.pct !== undefined ? `${row.english.L4.pct}%` : ""}</td>
          <td className="px-0.5 text-red-700">{!showBlank && row.english?.L5?.pct !== "" && row.english?.L5?.pct !== undefined ? `${row.english.L5.pct}%` : ""}</td>
        </tr>
      </React.Fragment>
    ));
  };

  return (
    <div className="annexure-root max-w-[940px] mx-auto space-y-6 text-black font-sans select-text">
      
      {/* View Options Toolbar (Screen Only) */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Display Mode:</span>
          <button
            onClick={() => setShowBlank(false)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              !showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Filled Class Progress ({filledRows.length} Assessments)
          </button>
          <button
            onClick={() => setShowBlank(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Blank Register Card
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Annexure F2</span>
        </button>
      </div>

      {/* ======================= SINGLE UNIFIED CARD ======================= */}
      <div className="annexure-sheet relative bg-white border-[2px] border-black p-4 sm:p-6 w-full min-h-[1050px] flex flex-col justify-between shadow-2xl print:shadow-none print:m-0 print:p-4 print:border-[2px] print:border-black">
        <MCDLogo isWatermark />

        <div className="relative z-10">
          {/* Header Box (Logo Left | Title | Logo Right) */}
          <table className="w-full border-collapse border border-black mb-1 bg-white">
            <tbody>
              <tr>
                <td className="w-24 p-1 border-r border-black text-center align-middle">
                  <MCDLogo className="w-20 h-20 mx-auto" />
                </td>
                <td className="text-center p-2 align-middle">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight">
                    MUNICIPAL CORPORATION OF DELHI
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider mt-0.5">
                    EDUCATION DEPARTMENT
                  </h2>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight mt-1">
                    CLASSWISE FLN/EXCELLENCE RECORD
                  </h3>
                  <h4 className="text-sm sm:text-base font-black tracking-tight">
                    (ANNEXURE – F2)
                  </h4>
                  <p className="text-xs sm:text-sm font-bold uppercase mt-0.5">
                    SESSION: {school.session ? `20${school.session.replace('20', '')}` : "20__-__"}
                  </p>
                </td>
                <td className="w-24 p-1 border-l border-black text-center align-middle">
                  <MCDLogo className="w-20 h-20 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>

          {/* Class Details Table */}
          <table className="w-full border-collapse border border-black mb-1 text-xs sm:text-sm font-bold bg-white/95">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-44 p-1 border-r border-black uppercase text-slate-800">NAME OF SCHOOL:</td>
                <td colSpan={5} className="p-1 uppercase text-slate-950 font-black">
                  {!showBlank ? school.name : ""}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-32 p-1 border-r border-black uppercase text-slate-800">SCHOOL ID:</td>
                <td className="p-1 border-r border-black font-black">{!showBlank ? school.code : ""}</td>
                <td className="w-28 p-1 border-r border-black uppercase text-slate-800">WARD NO.:</td>
                <td className="p-1 border-r border-black font-black">{!showBlank ? school.ward_number : ""}</td>
                <td className="w-20 p-1 border-r border-black uppercase text-slate-800">ZONE:</td>
                <td className="p-1 font-black uppercase">{!showBlank ? school.zone : ""}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-56 p-1 border-r border-black uppercase text-slate-800">NAME OF CLASS TEACHER:</td>
                <td colSpan={5} className="p-1 uppercase text-slate-950 font-black">
                  {!showBlank ? class_info.teacher_name : ""}
                </td>
              </tr>
              <tr>
                <td className="w-44 p-1 border-r border-black uppercase text-slate-800">CLASS – SECTION :</td>
                <td className="p-1 border-r border-black font-black">{!showBlank ? class_info.display_name : ""}</td>
                <td className="w-20 p-1 border-r border-black uppercase text-slate-800">BMID:</td>
                <td className="p-1 border-r border-black font-black">{!showBlank ? class_info.bmid : ""}</td>
                <td className="w-32 p-1 border-r border-black uppercase text-slate-800">CONTACT NO.:</td>
                <td className="p-1 font-black">{!showBlank ? class_info.contact_no : ""}</td>
              </tr>
            </tbody>
          </table>

          {/* Main Grid Table (All assessment rounds listed sequentially below first entry) */}
          <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-[11px] bg-white/90">
            <thead>
              {/* Yellow Banner */}
              <tr>
                <th
                  colSpan={20}
                  className="bg-[#FFFF00] text-black font-black text-xs sm:text-sm py-1 border-b border-black text-center tracking-wide uppercase"
                >
                  FLN / EXCELLENCE Class Wise Progress Report
                </th>
              </tr>
              {/* Column Groups Header */}
              <tr className="border-b border-black font-bold text-[9px] sm:text-[10px]">
                <th rowSpan={2} className="w-20 border-r border-black py-1 px-1 uppercase leading-tight">
                  ASSESSMENT<br />DATE
                </th>
                <th rowSpan={2} className="w-16 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  TOTAL<br />ENROLLED<br />STUDENTS
                </th>
                <th rowSpan={2} className="w-16 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  TOTAL<br />ABSENT<br />STUDENTS
                </th>
                <th rowSpan={2} className="w-16 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  TOTAL<br />STUDENTS<br />ASSESSED
                </th>
                <th rowSpan={2} className="w-12 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  SUB-<br />LEV-
                </th>
                <th colSpan={5} className="border-r border-black py-1 px-1 uppercase font-black">HINDI</th>
                <th colSpan={5} className="border-r border-black py-1 px-1 uppercase font-black">MATHEMATICS</th>
                <th colSpan={5} className="py-1 px-1 uppercase font-black">ENGLISH</th>
              </tr>
              {/* Sub-Levels L1-L5 Header */}
              <tr className="border-b border-black font-bold text-[9px]">
                <th className="w-7 border-r border-black py-0.5">L1</th>
                <th className="w-7 border-r border-black py-0.5">L2</th>
                <th className="w-7 border-r border-black py-0.5">L3</th>
                <th className="w-7 border-r border-black py-0.5">L4</th>
                <th className="w-7 border-r border-black py-0.5">L5</th>

                <th className="w-7 border-r border-black py-0.5">L1</th>
                <th className="w-7 border-r border-black py-0.5">L2</th>
                <th className="w-7 border-r border-black py-0.5">L3</th>
                <th className="w-7 border-r border-black py-0.5">L4</th>
                <th className="w-7 border-r border-black py-0.5">L5</th>

                <th className="w-7 border-r border-black py-0.5">L1</th>
                <th className="w-7 border-r border-black py-0.5">L2</th>
                <th className="w-7 border-r border-black py-0.5">L3</th>
                <th className="w-7 border-r border-black py-0.5">L4</th>
                <th className="w-7 py-0.5">L5</th>
              </tr>
            </thead>
            <tbody>
              {renderGridRows(displayRows)}
            </tbody>
          </table>
        </div>

        {/* Bottom Signatures Block */}
        <div className="relative z-10 pt-10 pb-2 px-6 flex items-end justify-between font-black uppercase text-xs sm:text-sm">
          <div className="text-center">
            <div className="w-56 border-b border-black mb-1"></div>
            <span className="underline underline-offset-4 tracking-tight">SIGNATURE (CLASS TEACHER)</span>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5 normal-case">{class_info.teacher_name}</p>
          </div>
          <div className="text-center">
            <div className="w-56 border-b border-black mb-1"></div>
            <span className="underline underline-offset-4 tracking-tight">H.O.S. SIGNATURE WITH STAMP</span>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5 normal-case">{school.hos_name}</p>
          </div>
        </div>
      </div>

    </div>
  );
}

// =========================================================================
// ANNEXURE - F3.1 & F3.2: SCHOOLWISE FLN/EXCELLENCE RECORD (SINGLE UNIFIED CARD)
// =========================================================================
export function AnnexureF3({ data }) {
  const [showBlank, setShowBlank] = useState(false);
  if (!data) return null;
  const { school, title_suffix = "CLASS 1 & 2", rows = [] } = data;
  const annexureNum = title_suffix.includes("1 & 2") ? "F3.1" : "F3.2";

  const filledRows = rows.filter(r => r.assessment_id || r.assessment_date || r.total_assessed);
  const minPairs = 10;
  
  const displayRows = showBlank 
    ? Array(minPairs).fill({}) 
    : [...filledRows, ...Array(Math.max(0, minPairs - filledRows.length)).fill({})];

  const renderGridRows = (rowList) => {
    return rowList.map((row, idx) => (
      <React.Fragment key={idx}>
        <tr className="border-b border-black h-[24px] text-[10px] sm:text-[11px] font-bold text-center hover:bg-yellow-50/30">
          <td rowSpan={2} className="border-r border-black px-1 bg-white font-mono">
            {!showBlank ? (row.assessment_date || (row.assessment_name || "")) : ""}
          </td>
          <td rowSpan={2} className="border-r border-black px-1 bg-white">
            {!showBlank ? (row.total_enrolled || "") : ""}
          </td>
          <td rowSpan={2} className="border-r border-black px-1 bg-white">
            {!showBlank ? (row.total_absent || "") : ""}
          </td>
          <td rowSpan={2} className="border-r border-black px-1 bg-white">
            {!showBlank ? (row.total_assessed || "") : ""}
          </td>
          <td className="border-r border-black px-0.5 bg-slate-50 font-black">NUM-</td>

          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L1?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L2?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L3?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L4?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-800">{!showBlank ? (row.hindi?.L5?.num ?? "") : ""}</td>

          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L1?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L2?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L3?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L4?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-800">{!showBlank ? (row.maths?.L5?.num ?? "") : ""}</td>

          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L1?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L2?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L3?.num ?? "") : ""}</td>
          <td className="border-r border-black px-0.5 text-red-800">{!showBlank ? (row.english?.L4?.num ?? "") : ""}</td>
          <td className="px-0.5 text-red-800">{!showBlank ? (row.english?.L5?.num ?? "") : ""}</td>
        </tr>

        <tr className="border-b border-black h-[24px] text-[10px] sm:text-[11px] font-bold text-center bg-slate-50/20">
          <td className="border-r border-black px-0.5 bg-slate-100 font-black">%-</td>

          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L1?.pct !== "" && row.hindi?.L1?.pct !== undefined ? `${row.hindi.L1.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L2?.pct !== "" && row.hindi?.L2?.pct !== undefined ? `${row.hindi.L2.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L3?.pct !== "" && row.hindi?.L3?.pct !== undefined ? `${row.hindi.L3.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L4?.pct !== "" && row.hindi?.L4?.pct !== undefined ? `${row.hindi.L4.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-emerald-700">{!showBlank && row.hindi?.L5?.pct !== "" && row.hindi?.L5?.pct !== undefined ? `${row.hindi.L5.pct}%` : ""}</td>

          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L1?.pct !== "" && row.maths?.L1?.pct !== undefined ? `${row.maths.L1.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L2?.pct !== "" && row.maths?.L2?.pct !== undefined ? `${row.maths.L2.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L3?.pct !== "" && row.maths?.L3?.pct !== undefined ? `${row.maths.L3.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L4?.pct !== "" && row.maths?.L4?.pct !== undefined ? `${row.maths.L4.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-blue-700">{!showBlank && row.maths?.L5?.pct !== "" && row.maths?.L5?.pct !== undefined ? `${row.maths.L5.pct}%` : ""}</td>

          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L1?.pct !== "" && row.english?.L1?.pct !== undefined ? `${row.english.L1.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L2?.pct !== "" && row.english?.L2?.pct !== undefined ? `${row.english.L2.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L3?.pct !== "" && row.english?.L3?.pct !== undefined ? `${row.english.L3.pct}%` : ""}</td>
          <td className="border-r border-black px-0.5 text-red-700">{!showBlank && row.english?.L4?.pct !== "" && row.english?.L4?.pct !== undefined ? `${row.english.L4.pct}%` : ""}</td>
          <td className="px-0.5 text-red-700">{!showBlank && row.english?.L5?.pct !== "" && row.english?.L5?.pct !== undefined ? `${row.english.L5.pct}%` : ""}</td>
        </tr>
      </React.Fragment>
    ));
  };

  return (
    <div className="annexure-root max-w-[940px] mx-auto space-y-6 text-black font-sans select-text">
      
      {/* View Options Toolbar (Screen Only) */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Display Mode:</span>
          <button
            onClick={() => setShowBlank(false)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              !showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Filled School Progress ({filledRows.length} Assessments)
          </button>
          <button
            onClick={() => setShowBlank(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Blank Register Card
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Annexure {annexureNum}</span>
        </button>
      </div>

      {/* ======================= SINGLE UNIFIED CARD ======================= */}
      <div className="annexure-sheet relative bg-white border-[2px] border-black p-4 sm:p-6 w-full min-h-[1050px] flex flex-col justify-between shadow-2xl print:shadow-none print:m-0 print:p-4 print:border-[2px] print:border-black">
        <MCDLogo isWatermark />

        <div className="relative z-10">
          {/* Header Box */}
          <table className="w-full border-collapse border border-black mb-1 bg-white">
            <tbody>
              <tr>
                <td className="w-24 p-1 border-r border-black text-center align-middle">
                  <MCDLogo className="w-20 h-20 mx-auto" />
                </td>
                <td className="text-center p-2 align-middle">
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase leading-tight">
                    MUNICIPAL CORPORATION OF DELHI
                  </h1>
                  <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider mt-0.5">
                    EDUCATION DEPARTMENT
                  </h2>
                  <h3 className="text-base sm:text-lg font-black uppercase tracking-tight mt-1">
                    SCHOOLWISE FLN/EXCELLENCE RECORD
                  </h3>
                  <h4 className="text-sm sm:text-base font-black tracking-tight">
                    (ANNEXURE – {annexureNum})
                  </h4>
                  <p className="text-xs sm:text-sm font-bold uppercase mt-0.5">
                    SESSION: {school.session ? `20${school.session.replace('20', '')}` : "20__-__"}
                  </p>
                </td>
                <td className="w-24 p-1 border-l border-black text-center align-middle">
                  <MCDLogo className="w-20 h-20 mx-auto" />
                </td>
              </tr>
            </tbody>
          </table>

          {/* School Details Table */}
          <table className="w-full border-collapse border border-black mb-1 text-xs sm:text-sm font-bold bg-white/95">
            <tbody>
              <tr className="border-b border-black">
                <td className="w-44 p-1 border-r border-black uppercase text-slate-800">NAME OF SCHOOL:</td>
                <td colSpan={5} className="p-1 uppercase text-slate-950 font-black">
                  {!showBlank ? school.name : ""}
                </td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-32 p-1 border-r border-black uppercase text-slate-800">SCHOOL ID:</td>
                <td className="p-1 border-r border-black font-black">{!showBlank ? school.code : ""}</td>
                <td className="w-28 p-1 border-r border-black uppercase text-slate-800">WARD NO.:</td>
                <td className="p-1 border-r border-black font-black">{!showBlank ? school.ward_number : ""}</td>
                <td className="w-20 p-1 border-r border-black uppercase text-slate-800">ZONE:</td>
                <td className="p-1 font-black uppercase">{!showBlank ? school.zone : ""}</td>
              </tr>
              <tr className="border-b border-black">
                <td className="w-44 p-1 border-r border-black uppercase text-slate-800">NAME OF HOS:</td>
                <td className="p-1 border-r border-black uppercase font-black">{!showBlank ? school.hos_name : ""}</td>
                <td colSpan={2} className="w-32 p-1 border-r border-black uppercase text-slate-800">CONTACT NO.:</td>
                <td colSpan={2} className="p-1 font-black">{!showBlank ? school.hos_phone : ""}</td>
              </tr>
              <tr>
                <td className="w-48 p-1 border-r border-black uppercase text-slate-800">NAME OF ACADEMIC CO. :</td>
                <td className="p-1 border-r border-black uppercase font-black">{!showBlank ? school.academic_co_name : ""}</td>
                <td colSpan={2} className="w-32 p-1 border-r border-black uppercase text-slate-800">CONTACT NO.:</td>
                <td colSpan={2} className="p-1 font-black">{!showBlank ? school.academic_co_phone : ""}</td>
              </tr>
            </tbody>
          </table>

          {/* Main Grid Table */}
          <table className="w-full border-collapse border border-black text-center text-[10px] sm:text-[11px] bg-white/90">
            <thead>
              {/* Yellow Banner */}
              <tr>
                <th
                  colSpan={20}
                  className="bg-[#FFFF00] text-black font-black text-xs sm:text-sm py-1 border-b border-black text-center tracking-wide uppercase"
                >
                  FLN / EXCELLENCE School Wise Progress Report ({title_suffix})
                </th>
              </tr>
              {/* Column Groups Header */}
              <tr className="border-b border-black font-bold text-[9px] sm:text-[10px]">
                <th rowSpan={2} className="w-20 border-r border-black py-1 px-1 uppercase leading-tight">
                  ASSESSMENT<br />DATE
                </th>
                <th rowSpan={2} className="w-16 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  TOTAL<br />ENROLLED<br />STUDENTS
                </th>
                <th rowSpan={2} className="w-16 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  TOTAL<br />ABSENT<br />STUDENTS
                </th>
                <th rowSpan={2} className="w-16 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  TOTAL<br />STUDENTS<br />ASSESSED
                </th>
                <th rowSpan={2} className="w-12 border-r border-black py-1 px-0.5 uppercase leading-tight">
                  SUB-<br />LEV-
                </th>
                <th colSpan={5} className="border-r border-black py-1 px-1 uppercase font-black">HINDI</th>
                <th colSpan={5} className="border-r border-black py-1 px-1 uppercase font-black">MATHEMATICS</th>
                <th colSpan={5} className="py-1 px-1 uppercase font-black">ENGLISH</th>
              </tr>
              {/* Sub-Levels L1-L5 Header */}
              <tr className="border-b border-black font-bold text-[9px]">
                <th className="w-7 border-r border-black py-0.5">L1</th>
                <th className="w-7 border-r border-black py-0.5">L2</th>
                <th className="w-7 border-r border-black py-0.5">L3</th>
                <th className="w-7 border-r border-black py-0.5">L4</th>
                <th className="w-7 border-r border-black py-0.5">L5</th>

                <th className="w-7 border-r border-black py-0.5">L1</th>
                <th className="w-7 border-r border-black py-0.5">L2</th>
                <th className="w-7 border-r border-black py-0.5">L3</th>
                <th className="w-7 border-r border-black py-0.5">L4</th>
                <th className="w-7 border-r border-black py-0.5">L5</th>

                <th className="w-7 border-r border-black py-0.5">L1</th>
                <th className="w-7 border-r border-black py-0.5">L2</th>
                <th className="w-7 border-r border-black py-0.5">L3</th>
                <th className="w-7 border-r border-black py-0.5">L4</th>
                <th className="w-7 py-0.5">L5</th>
              </tr>
            </thead>
            <tbody>
              {renderGridRows(displayRows)}
            </tbody>
          </table>
        </div>

        {/* Bottom Signatures Block */}
        <div className="relative z-10 pt-10 pb-2 px-6 flex items-end justify-between font-black uppercase text-xs sm:text-sm">
          <div className="text-center">
            <div className="w-56 border-b border-black mb-1"></div>
            <span className="underline underline-offset-4 tracking-tight">ACADEMIC COORDINATOR SIGNATURE</span>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5 normal-case">{school.academic_co_name}</p>
          </div>
          <div className="text-center">
            <div className="w-56 border-b border-black mb-1"></div>
            <span className="underline underline-offset-4 tracking-tight">H.O.S. SIGNATURE WITH STAMP</span>
            <p className="text-[11px] text-slate-600 font-semibold mt-0.5 normal-case">{school.hos_name}</p>
          </div>
        </div>
      </div>

    </div>
  );
}

// =========================================================================
// OFFICIAL 3D BLUE RIBBON BANNER COMPONENT
// =========================================================================
function OfficialBlueRibbon({ text = "Case Study" }) {
  return (
    <div className="relative inline-block my-1.5 drop-shadow-sm select-none">
      {/* 3D Ribbon Graphic */}
      <div className="relative flex items-center justify-center">
        {/* Left Ribbon Tail / Fold */}
        <div className="relative -mr-3 z-0">
          <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M28 0L0 19L28 38V0Z" fill="#1d4ed8" />
            <path d="M28 0L14 19L28 30V0Z" fill="#1e40af" />
          </svg>
        </div>

        {/* Central Ribbon Banner */}
        <div className="relative z-10 bg-gradient-to-r from-[#1e40af] via-[#2563eb] to-[#1e40af] text-white font-black text-base sm:text-xl px-10 sm:px-14 py-1.5 shadow-md uppercase tracking-wider border-y border-[#60a5fa]/40">
          {text}
        </div>

        {/* Right Ribbon Tail / Fold */}
        <div className="relative -ml-3 z-0">
          <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L28 19L0 38V0Z" fill="#1d4ed8" />
            <path d="M0 0L14 19L0 30V0Z" fill="#1e40af" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// OFFICIAL HEADER CORNER WAVES & CIRCLES DECORATION
// =========================================================================
function OfficialHeaderGraphics({ showTargetCircles = false }) {
  return (
    <div className="absolute top-0 left-0 right-0 h-28 pointer-events-none overflow-hidden select-none z-0">
      {/* Top Flowing Cyan Waves */}
      <svg className="w-full h-full" viewBox="0 0 900 120" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M 0,0 L 900,0 L 900,20 C 700,55 500,10 300,50 C 150,75 50,45 0,85 Z"
          fill="#38bdf8"
          fillOpacity="0.45"
        />
        <path
          d="M 0,0 L 900,0 L 900,10 C 650,40 450,5 250,35 C 100,55 30,30 0,60 Z"
          fill="#0284c7"
          fillOpacity="0.6"
        />
      </svg>

      {/* Target Concentric Circles on Top Right (Present on Annexure - SS) */}
      {showTargetCircles && (
        <div className="absolute top-2 right-12 opacity-70">
          <svg width="100" height="40" viewBox="0 0 100 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="20" cy="20" r="14" stroke="#0284c7" strokeWidth="2.5" fill="none" />
            <circle cx="20" cy="20" r="6" fill="#0284c7" />
            <circle cx="56" cy="18" r="16" stroke="#0284c7" strokeWidth="2.5" fill="none" />
            <circle cx="56" cy="18" r="7" fill="#0284c7" />
            <circle cx="86" cy="12" r="10" stroke="#0284c7" strokeWidth="2" fill="none" />
            <circle cx="86" cy="12" r="4" fill="#0284c7" />
          </svg>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// ANNEXURE - CS: CASE STUDY (EXACT SCAN REPLICA)
// =========================================================================
export function AnnexureCS({ data }) {
  const [showBlank, setShowBlank] = useState(false);
  const student = data?.student || {};
  const school = data?.school || {};

  // Form states (editable in UI, saved or printable)
  const [formData, setFormData] = useState({
    area_of_concern: "",
    prev_education: "Same School",
    social_linguistic: "",
    physical_health: "",
    learning_disability: "",
    observation_teacher: "",
    observation_counsellor: "",
    area_of_strength: "",
    parents_feedback: "",
    efforts_counselling: true,
    efforts_pedagogical: true,
    efforts_subject_teacher: false,
    efforts_counsellor: false,
    efforts_other: "",
    result_outcomes: ""
  });

  const handleChange = (field, val) => {
    setFormData(prev => ({ ...prev, [field]: val }));
  };

  return (
    <div className="annexure-root max-w-[920px] mx-auto space-y-6 text-black font-sans select-text">
      
      {/* View Options Toolbar (Screen Only) */}
      <div className="bg-white border border-slate-300 rounded-xl p-3 shadow-xs flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700">Display Mode:</span>
          <button
            onClick={() => setShowBlank(false)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              !showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Pre-Filled Case Study
          </button>
          <button
            onClick={() => setShowBlank(true)}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              showBlank ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Blank Official Form
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-xs transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Case Study (Annexure - CS)</span>
        </button>
      </div>

      {/* ======================= CASE STUDY SHEET ======================= */}
      <div className="annexure-sheet relative bg-white border-[6px] border-[#0284c7] p-5 sm:p-7 w-full min-h-[1180px] flex flex-col justify-between shadow-2xl print:shadow-none print:m-0 print:p-4 print:border-[4px] print:border-[#0284c7]">
        
        {/* Background Waves */}
        <OfficialHeaderGraphics />

        <div className="relative z-10 space-y-2.5">
          
          {/* Top Tag: ANNEXURE - CS */}
          <div className="flex justify-end -mt-1 mb-1">
            <span className="border-2 border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
              ANNEXURE - CS
            </span>
          </div>

          {/* Header (MCD Logo | Titles | 3D Blue Ribbon) */}
          <div className="flex items-start justify-between">
            <div className="w-24 pt-1">
              <MCDLogo className="w-20 h-20" />
            </div>

            <div className="flex-1 text-center pr-12">
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#dc2626] tracking-tight leading-tight">
                Municipal Corporation of Delhi
              </h1>
              <h2 className="text-base sm:text-lg font-bold text-[#1e3a8a] mt-0.5 tracking-wide">
                Education Department
              </h2>

              {/* 3D Blue Ribbon */}
              <OfficialBlueRibbon text="Case Study" />

              {/* Session text in bold Red */}
              <p className="text-sm font-black text-[#dc2626] mt-0.5">
                Session : 20<span className="underline underline-offset-4">__</span> - <span className="underline underline-offset-4">__</span>
              </p>
            </div>
          </div>

          {/* Personal Information Box */}
          <div className="border border-black rounded-xl p-3 text-xs sm:text-sm font-bold bg-white space-y-2">
            <span className="font-black block text-slate-950 text-sm">Personal Information:</span>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
              <div className="md:col-span-4 flex items-center gap-1">
                <span className="whitespace-nowrap">Name :</span>
                <span className="font-black flex-1 border-b border-dotted border-black pb-0.5 uppercase">
                  {!showBlank ? (student.name || "") : ""}
                </span>
              </div>
              <div className="md:col-span-5 flex items-center gap-1">
                <span className="whitespace-nowrap">Father’s/Mother’s Name :</span>
                <span className="font-black flex-1 border-b border-dotted border-black pb-0.5 uppercase">
                  {!showBlank ? (student.father_name || student.mother_name || "") : ""}
                </span>
              </div>
              <div className="md:col-span-3 flex items-center gap-1">
                <span className="whitespace-nowrap">Class &amp; Sec. :</span>
                <span className="font-black flex-1 border-b border-dotted border-black pb-0.5 uppercase">
                  {!showBlank ? (student.class_section || "") : ""}
                </span>
              </div>

              <div className="md:col-span-3 flex items-center gap-1">
                <span className="whitespace-nowrap">Admn. No.</span>
                <span className="font-black flex-1 border-b border-dotted border-black pb-0.5">
                  {!showBlank ? (student.admission_no || "") : ""}
                </span>
              </div>
              <div className="md:col-span-6 flex items-center gap-1">
                <span className="whitespace-nowrap">School :</span>
                <span className="font-black flex-1 border-b border-dotted border-black pb-0.5 uppercase">
                  {!showBlank ? (school.name || "") : ""}
                </span>
              </div>
              <div className="md:col-span-3 flex items-center gap-1">
                <span className="whitespace-nowrap">Roll No. :</span>
                <span className="font-black flex-1 border-b border-dotted border-black pb-0.5">
                  {!showBlank ? (student.roll_no || "") : ""}
                </span>
              </div>
            </div>
          </div>

          {/* 1. Area of concern */}
          <div className="border border-black rounded-xl p-2.5 text-xs sm:text-sm font-bold bg-white">
            <label className="font-black block mb-1 text-slate-950">1. Area of concern :</label>
            <input
              type="text"
              value={!showBlank ? (formData.area_of_concern || "Needs targeted reinforcement in foundational Hindi word vocabulary and Maths single-digit subtraction.") : ""}
              onChange={(e) => handleChange("area_of_concern", e.target.value)}
              className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent py-1"
              placeholder="Describe specific learning gaps or challenges..."
            />
          </div>

          {/* 2. Academic Status (3 Sub-tables: Previous Education | Current FLN | Attendance) */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white space-y-2">
            <span className="font-black block text-sm text-slate-950">2. Academic Status :</span>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
              
              {/* Previous Education Table */}
              <div className="md:col-span-4 border border-black rounded-md overflow-hidden bg-white">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black font-black">
                      <th colSpan={2} className="py-1">Previous Education:</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black">
                    <tr>
                      <td className="p-1 text-left pl-2 font-semibold">Same School</td>
                      <td className="p-1 w-10 text-center font-black border-l border-black">
                        {!showBlank && formData.prev_education === "Same School" ? "✓" : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 text-left pl-2 font-semibold">No School</td>
                      <td className="p-1 w-10 text-center font-black border-l border-black">
                        {!showBlank && formData.prev_education === "No School" ? "✓" : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 text-left pl-2 font-semibold">Other School</td>
                      <td className="p-1 w-10 text-center font-black border-l border-black">
                        {!showBlank && formData.prev_education === "Other School" ? "✓" : ""}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Current FLN Status Table */}
              <div className="md:col-span-4 border border-black rounded-md overflow-hidden bg-white">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black font-black">
                      <th colSpan={3} className="py-1">Current FLN Status:</th>
                    </tr>
                    <tr className="border-b border-black bg-slate-50 text-[10px] font-bold">
                      <th className="py-0.5 border-r border-black">Subject</th>
                      <th className="py-0.5 border-r border-black w-14">Level 1</th>
                      <th className="py-0.5 w-14">Level 2</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-xs font-semibold">
                    <tr>
                      <td className="p-1 text-left pl-2 border-r border-black">Hindi</td>
                      <td className="p-1 border-r border-black font-black">{!showBlank ? "✓" : ""}</td>
                      <td className="p-1 font-black"></td>
                    </tr>
                    <tr>
                      <td className="p-1 text-left pl-2 border-r border-black">Maths</td>
                      <td className="p-1 border-r border-black font-black"></td>
                      <td className="p-1 font-black">{!showBlank ? "✓" : ""}</td>
                    </tr>
                    <tr>
                      <td className="p-1 text-left pl-2 border-r border-black">English</td>
                      <td className="p-1 border-r border-black font-black">{!showBlank ? "✓" : ""}</td>
                      <td className="p-1 font-black"></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Attendance Matrix Table */}
              <div className="md:col-span-4 border border-black rounded-md overflow-hidden bg-white">
                <table className="w-full text-center text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-black font-black">
                      <th colSpan={6} className="py-1 text-xs">Attendance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black text-[10px] font-semibold">
                    <tr className="divide-x divide-black">
                      <td className="p-0.5 bg-slate-50 font-bold">April</td><td className="p-0.5">{!showBlank ? "21" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">Aug</td><td className="p-0.5">{!showBlank ? "22" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">Dec</td><td className="p-0.5">{!showBlank ? "19" : ""}</td>
                    </tr>
                    <tr className="divide-x divide-black">
                      <td className="p-0.5 bg-slate-50 font-bold">May</td><td className="p-0.5">{!showBlank ? "18" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">Sept</td><td className="p-0.5">{!showBlank ? "20" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">Jan</td><td className="p-0.5">{!showBlank ? "16" : ""}</td>
                    </tr>
                    <tr className="divide-x divide-black">
                      <td className="p-0.5 bg-slate-50 font-bold">June</td><td className="p-0.5">{!showBlank ? "Vac" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">Oct</td><td className="p-0.5">{!showBlank ? "18" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">Feb</td><td className="p-0.5">{!showBlank ? "22" : ""}</td>
                    </tr>
                    <tr className="divide-x divide-black">
                      <td className="p-0.5 bg-slate-50 font-bold">July</td><td className="p-0.5">{!showBlank ? "23" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">Nov</td><td className="p-0.5">{!showBlank ? "21" : ""}</td>
                      <td className="p-0.5 bg-slate-50 font-bold">March</td><td className="p-0.5">{!showBlank ? "20" : ""}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

            </div>
          </div>

          {/* 3. Social & Linguistic & 4. Physical Health */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
              <label className="font-black block mb-1 text-slate-950">3. Social &amp; Linguistic background :</label>
              <textarea
                rows={2}
                value={!showBlank ? (formData.social_linguistic || "First-generation learner. Primary language spoken at home is Hindi. Highly supportive parents.") : ""}
                onChange={(e) => handleChange("social_linguistic", e.target.value)}
                className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent resize-none"
              />
            </div>
            <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
              <label className="font-black block mb-1 text-slate-950">4. Physical Health :</label>
              <textarea
                rows={2}
                value={!showBlank ? (formData.physical_health || "Good general health. Normal eyesight and hearing milestones verified in school health checkup.") : ""}
                onChange={(e) => handleChange("physical_health", e.target.value)}
                className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent resize-none"
              />
            </div>
          </div>

          {/* 5. Learning disability */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
            <label className="font-black block mb-1 text-slate-950">5. Learning disability (if any) :</label>
            <input
              type="text"
              value={!showBlank ? (formData.learning_disability || "None detected. Mild phonological hesitation in secondary language (English).") : ""}
              onChange={(e) => handleChange("learning_disability", e.target.value)}
              className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent"
            />
          </div>

          {/* 6. Observation by teacher */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
            <label className="font-black block mb-1 text-slate-950">6. Observation by teacher :</label>
            <input
              type="text"
              value={!showBlank ? (formData.observation_teacher || "Attentive in classroom activities. Shows high enthusiasm during peer-led math learning corners.") : ""}
              onChange={(e) => handleChange("observation_teacher", e.target.value)}
              className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent"
            />
          </div>

          {/* 7. Observation and feedback by Spl. Educator / Counsellor */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
            <label className="font-black block mb-1 text-slate-950">7. Observation and feedback by Spl. Educator / Counsellor :</label>
            <input
              type="text"
              value={!showBlank ? (formData.observation_counsellor || "Recommend multi-sensory flashcard method and 15 minutes daily guided storybook reading.") : ""}
              onChange={(e) => handleChange("observation_counsellor", e.target.value)}
              className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent"
            />
          </div>

          {/* 8. Area of strength */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
            <label className="font-black block mb-1 text-slate-950">8. Area of strength :</label>
            <input
              type="text"
              value={!showBlank ? (formData.area_of_strength || "Quick mental counting, good drawing skills, punctual attendance.") : ""}
              onChange={(e) => handleChange("area_of_strength", e.target.value)}
              className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent"
            />
          </div>

          {/* 9. Parents Feedback */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
            <label className="font-black block mb-1 text-slate-950">9. Parents Feedback :</label>
            <input
              type="text"
              value={!showBlank ? (formData.parents_feedback || "Child practices counting at home regularly. Parents appreciative of teacher guidance.") : ""}
              onChange={(e) => handleChange("parents_feedback", e.target.value)}
              className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent"
            />
          </div>

          {/* 10. Efforts done */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
            <span className="font-black block mb-2 text-sm text-slate-950">10. Efforts done :</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">Counselling of child &amp; Parents</span>
                  <span className="w-14 h-5 border border-black flex items-center justify-center font-black bg-white">
                    {!showBlank && formData.efforts_counselling ? "✓" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">Pedagogical intervention by teacher</span>
                  <span className="w-14 h-5 border border-black flex items-center justify-center font-black bg-white">
                    {!showBlank && formData.efforts_pedagogical ? "✓" : ""}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">Discuss with the subject teacher</span>
                  <span className="w-14 h-5 border border-black flex items-center justify-center font-black bg-white">
                    {!showBlank && formData.efforts_subject_teacher ? "✓" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 border-b border-dotted border-black pb-1">
                  <span className="font-bold">Discuss with counsellor, special educator</span>
                  <span className="w-14 h-5 border border-black flex items-center justify-center font-black bg-white">
                    {!showBlank && formData.efforts_counsellor ? "✓" : ""}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mt-2.5 flex items-center gap-2 text-xs">
              <span className="font-black text-slate-950">Any other :</span>
              <input
                type="text"
                value={!showBlank ? (formData.efforts_other || "Assigned peer buddy for cooperative learning.") : ""}
                onChange={(e) => handleChange("efforts_other", e.target.value)}
                className="flex-1 border-b border-dotted border-black outline-none bg-transparent"
              />
            </div>
          </div>

          {/* 11. Result / Outcomes */}
          <div className="border border-black rounded-xl p-2.5 text-xs font-bold bg-white">
            <label className="font-black block mb-1 text-slate-950">11. Result / Outcomes :</label>
            <input
              type="text"
              value={!showBlank ? (formData.result_outcomes || "Successfully advanced from Level 1 to Level 2 in Hindi reading fluency and Mathematics single-digit calculations.") : ""}
              onChange={(e) => handleChange("result_outcomes", e.target.value)}
              className="w-full text-xs font-normal border-b border-dotted border-black outline-none bg-transparent"
            />
          </div>

        </div>

        {/* Footer Signatures */}
        <div className="relative z-10 pt-8 px-6 flex items-end justify-between font-black uppercase text-xs sm:text-sm">
          <div className="text-center">
            <span>Signature of Class Teacher</span>
          </div>
          <div className="text-center">
            <span>Signature of HoS</span>
          </div>
        </div>

      </div>

    </div>
  );
}

// =========================================================================
// ANNEXURE - SS: SUCCESS STORY (EXACT SCAN REPLICA - FULLY EDITABLE BY TEACHER)
// =========================================================================
export function AnnexureSS({ data }) {
  const [showBlank, setShowBlank] = useState(false);
  const student = data?.student || {};
  const school = data?.school || {};

  // Story Templates
  const STORY_PRESETS = [
    {
      title: "Mission Buniyad FLN Mastery",
      field: "Foundational Literacy & Numeracy (Mission Buniyad)",
      text: "Demonstrated exceptional dedication in mastering foundational reading and numerical problem-solving skills. Started the session at Beginner level and through consistent classroom participation and peer group activities, accelerated to Story Level in Hindi and Division level in Mathematics. Serves as an inspiring role model for classmates."
    },
    {
      title: "Hindi Reading & Fluency Mastery",
      field: "Foundational Hindi Reading & Story Comprehension",
      text: "Showed remarkable progress in Hindi reading fluency, advancing rapidly from basic letter recognition to fluently reading full paragraphs and moral stories with expressive comprehension, rich vocabulary, and enthusiastic classroom participation."
    },
    {
      title: "Mathematics & Operations Champion",
      field: "Foundational Mathematics & Arithmetic Operations",
      text: "Achieved outstanding milestones in fundamental mathematical operations, confidently solving 2-digit and 3-digit addition, subtraction, multiplication, and division problems with conceptual clarity, mental agility, and structured problem-solving."
    },
    {
      title: "Active Leadership & Classroom Regularity",
      field: "Holistic Academic Engagement & Leadership",
      text: "Transformed into an active classroom leader with 100% attendance and regularity. Actively collaborates in group activities, assists peers in foundational workbook assignments, and exhibits exemplary enthusiasm in all FLN learning corners."
    }
  ];

  // Editable Form Fields
  const [sessionYear1, setSessionYear1] = useState("24");
  const [sessionYear2, setSessionYear2] = useState("25");
  const [fieldOfSuccess, setFieldOfSuccess] = useState(STORY_PRESETS[0].field);
  const [studentName, setStudentName] = useState("");
  const [fatherName, setFatherName] = useState("");
  const [classSection, setClassSection] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [hosName, setHosName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [mentorName, setMentorName] = useState("");
  const [storyText, setStoryText] = useState(STORY_PRESETS[0].text);

  const [saveStatus, setSaveStatus] = useState("");

  // Sync / Load Initial Values and LocalStorage Saved Story
  useEffect(() => {
    if (!student?.id) return;
    const storageKey = `fln_ss_${student.id}`;
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSessionYear1(parsed.sessionYear1 || "24");
        setSessionYear2(parsed.sessionYear2 || "25");
        setFieldOfSuccess(parsed.fieldOfSuccess || STORY_PRESETS[0].field);
        setStudentName(parsed.studentName || student.name || "");
        setFatherName(parsed.fatherName || student.father_name || "");
        setClassSection(parsed.classSection || student.class_section || "");
        setSchoolName(parsed.schoolName || school.name || "");
        setHosName(parsed.hosName || school.principal_name || school.hos_name || "SHAMBHU DAYAL MEENA");
        setTeacherName(parsed.teacherName || school.teacher_name || "Indrajeet");
        setMentorName(parsed.mentorName || school.mentor_name || "DEVENDER SINGH");
        setStoryText(parsed.storyText || STORY_PRESETS[0].text);
        return;
      } catch (e) {
        console.error("Failed to parse saved story:", e);
      }
    }

    // Default Fallbacks from Props
    setSessionYear1("24");
    setSessionYear2("25");
    setFieldOfSuccess(STORY_PRESETS[0].field);
    setStudentName(student.name || "");
    setFatherName(student.father_name || "");
    setClassSection(student.class_section || "");
    setSchoolName(school.name || "");
    setHosName(school.principal_name || school.hos_name || "SHAMBHU DAYAL MEENA");
    setTeacherName(school.teacher_name || "Indrajeet");
    setMentorName(school.mentor_name || "DEVENDER SINGH");
    setStoryText(STORY_PRESETS[0].text);
  }, [student?.id, school?.name]);

  // Save story to LocalStorage
  const handleSaveStory = () => {
    if (!student?.id) return;
    const storageKey = `fln_ss_${student.id}`;
    const payload = {
      sessionYear1,
      sessionYear2,
      fieldOfSuccess,
      studentName,
      fatherName,
      classSection,
      schoolName,
      hosName,
      teacherName,
      mentorName,
      storyText
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    setSaveStatus("Saved to student record!");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  // Reset to default values
  const handleResetStory = () => {
    if (student?.id) {
      localStorage.removeItem(`fln_ss_${student.id}`);
    }
    setSessionYear1("24");
    setSessionYear2("25");
    setFieldOfSuccess(STORY_PRESETS[0].field);
    setStudentName(student.name || "");
    setFatherName(student.father_name || "");
    setClassSection(student.class_section || "");
    setSchoolName(school.name || "");
    setHosName(school.principal_name || school.hos_name || "SHAMBHU DAYAL MEENA");
    setTeacherName(school.teacher_name || "Indrajeet");
    setMentorName(school.mentor_name || "DEVENDER SINGH");
    setStoryText(STORY_PRESETS[0].text);
    setSaveStatus("Reset to default.");
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const applyPreset = (preset) => {
    setFieldOfSuccess(preset.field);
    setStoryText(preset.text);
  };

  return (
    <div className="annexure-root max-w-[920px] mx-auto space-y-4 text-black font-sans select-text">
      
      {/* Teacher Editing Toolbar (Screen Only) */}
      <div className="bg-white border border-slate-300 rounded-2xl p-4 shadow-xs space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Display Mode:</span>
            <button
              onClick={() => setShowBlank(false)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                !showBlank ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Editable Success Story
            </button>
            <button
              onClick={() => setShowBlank(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                showBlank ? "bg-emerald-600 text-white shadow-2xs" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Blank Official Form
            </button>
          </div>

          <div className="flex items-center gap-2">
            {saveStatus && (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" />
                {saveStatus}
              </span>
            )}

            <button
              onClick={handleSaveStory}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition"
            >
              <span>Save Teacher Story</span>
            </button>

            <button
              onClick={handleResetStory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-black hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print (Annexure - SS)</span>
            </button>
          </div>
        </div>

        {/* Story Preset Templates */}
        {!showBlank && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Story Templates:
            </span>
            {STORY_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => applyPreset(p)}
                className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-semibold border border-slate-200 transition"
              >
                + {p.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ======================= SUCCESS STORY SHEET ======================= */}
      <div className="annexure-sheet relative bg-white border-[6px] border-[#0284c7] p-5 sm:p-7 w-full min-h-[1180px] flex flex-col justify-between shadow-2xl print:shadow-none print:m-0 print:p-4 print:border-[4px] print:border-[#0284c7]">
        
        {/* Background Waves with Target Concentric Circles */}
        <OfficialHeaderGraphics showTargetCircles />

        <div className="relative z-10 space-y-3.5">
          
          {/* Top Tag: ANNEXURE - SS */}
          <div className="flex justify-end -mt-1 mb-1">
            <span className="border-2 border-black bg-white px-2 py-0.5 text-[11px] font-black uppercase tracking-wider">
              ANNEXURE - SS
            </span>
          </div>

          {/* Header (MCD Logo | Titles | 3D Blue Ribbon) */}
          <div className="flex items-start justify-between">
            <div className="w-24 pt-1">
              <MCDLogo className="w-20 h-20" />
            </div>

            <div className="flex-1 text-center pr-12">
              <h1 className="text-2xl sm:text-3xl font-serif font-black text-[#dc2626] tracking-tight leading-tight">
                Municipal Corporation of Delhi
              </h1>
              <h2 className="text-base sm:text-lg font-bold text-[#1e3a8a] mt-0.5 tracking-wide">
                Education Department
              </h2>

              {/* 3D Blue Ribbon */}
              <OfficialBlueRibbon text="Success Story" />

              {/* Session text in bold Red with editable years */}
              <div className="text-sm font-black text-[#dc2626] mt-0.5 flex items-center justify-center gap-1">
                <span>Session : 20</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={sessionYear1}
                    onChange={(e) => setSessionYear1(e.target.value)}
                    maxLength={2}
                    className="w-7 text-center font-black text-[#dc2626] underline underline-offset-4 bg-transparent outline-none border-b border-transparent focus:border-red-500 print:border-none"
                  />
                ) : (
                  <span className="underline underline-offset-4">__</span>
                )}
                <span>-</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={sessionYear2}
                    onChange={(e) => setSessionYear2(e.target.value)}
                    maxLength={2}
                    className="w-7 text-center font-black text-[#dc2626] underline underline-offset-4 bg-transparent outline-none border-b border-transparent focus:border-red-500 print:border-none"
                  />
                ) : (
                  <span className="underline underline-offset-4">__</span>
                )}
              </div>
            </div>
          </div>

          {/* Form Fields & Photo Box Layout */}
          <div className="flex items-start gap-4 pt-1">
            
            {/* Left Lines with Solid Underlines (All Editable) */}
            <div className="flex-1 space-y-2.5 text-xs sm:text-sm font-bold text-slate-950">
              
              {/* Field of Success */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Success in the field of :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={fieldOfSuccess}
                    onChange={(e) => setFieldOfSuccess(e.target.value)}
                    placeholder="e.g. Foundational Literacy & Numeracy (Mission Buniyad)"
                    className="flex-1 outline-none bg-transparent font-bold text-slate-900 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>

              {/* Student Name */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Name of the Student :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Student full name"
                    className="flex-1 outline-none bg-transparent font-black uppercase text-slate-950 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>

              {/* Father Name */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Father’s Name :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={fatherName}
                    onChange={(e) => setFatherName(e.target.value)}
                    placeholder="Father's name"
                    className="flex-1 outline-none bg-transparent font-bold uppercase text-slate-950 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>

              {/* Class & Section */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Class &amp; Section :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={classSection}
                    onChange={(e) => setClassSection(e.target.value)}
                    placeholder="e.g. Class III - A"
                    className="flex-1 outline-none bg-transparent font-bold uppercase text-slate-950 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>

              {/* Name of School */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Name of School :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Official school name"
                    className="flex-1 outline-none bg-transparent font-bold uppercase text-slate-950 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>

              {/* Name of HoS */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Name of HoS :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={hosName}
                    onChange={(e) => setHosName(e.target.value)}
                    placeholder="Head of School / Principal name"
                    className="flex-1 outline-none bg-transparent font-bold uppercase text-slate-950 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>

              {/* Name of Class Teacher / Subject Teacher */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Name of Class Teacher / Subject Teacher :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Teacher name"
                    className="flex-1 outline-none bg-transparent font-bold uppercase text-slate-950 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>

              {/* Name of Mentor Teacher */}
              <div className="flex items-center gap-1.5 border-b border-black pb-0.5">
                <span className="whitespace-nowrap">Name of Mentor Teacher :</span>
                {!showBlank ? (
                  <input
                    type="text"
                    value={mentorName}
                    onChange={(e) => setMentorName(e.target.value)}
                    placeholder="Mentor teacher name"
                    className="flex-1 outline-none bg-transparent font-bold uppercase text-slate-950 focus:bg-emerald-50/40 px-1 rounded transition print:focus:bg-transparent"
                  />
                ) : null}
              </div>
            </div>

            {/* Right Photo Box with exact caption */}
            <div className="w-32 flex flex-col items-center justify-center text-center shrink-0 self-start mt-1">
              <StudentPassportPhoto
                student={student}
                showBlank={showBlank}
                className="w-28 h-36"
                captionLines={["Paste recent", "photo of the", "student"]}
              />
            </div>

          </div>

          {/* Story Box (Lined Ruled Paper Box with ~11 lines) */}
          <div className="border border-black rounded-xs p-3 bg-white space-y-2 mt-2">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm text-slate-950 uppercase">Her / His Story of Success :</h3>
              <span className="text-[10px] font-bold text-slate-400 print:hidden">Editable by Teacher</span>
            </div>
            
            <div className="relative">
              <textarea
                rows={11}
                value={!showBlank ? storyText : ""}
                onChange={(e) => setStoryText(e.target.value)}
                placeholder="Write the inspiring journey of learning milestones and success achieved by the student..."
                className="w-full text-xs sm:text-sm font-sans font-medium text-slate-900 leading-[28px] border-none outline-none bg-transparent resize-none overflow-hidden focus:bg-emerald-50/20 rounded p-1 transition print:focus:bg-transparent"
                style={{
                  backgroundImage: "repeating-linear-gradient(transparent, transparent 27px, #94a3b8 28px)",
                  lineHeight: "28px"
                }}
              />
            </div>
          </div>

          {/* Bottom Heartfelt Appreciation Quote */}
          <div className="text-center pt-2 px-6">
            <p className="text-xs sm:text-sm font-black font-serif text-[#1e3a8a] leading-relaxed">
              We acknowledge your remarkable journey of success and extend our heartfelt appreciation for your significant contribution to MCD. Wishing you a bright future.
            </p>
          </div>

        </div>

        {/* Footer Signatures */}
        <div className="relative z-10 pt-8 px-6 flex items-end justify-between font-black uppercase text-xs sm:text-sm">
          <div className="text-center">
            <span>Signature of Class Teacher</span>
          </div>
          <div className="text-center">
            <span>Signature of HoS</span>
          </div>
        </div>

      </div>

    </div>
  );
}


