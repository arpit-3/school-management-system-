import React from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import { 
  School, 
  GraduationCap, 
  Users, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  FileSpreadsheet, 
  BarChart3,
  BadgeCheck,
  ArrowRight
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  const getRoleBadge = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">SUPER ADMIN</span>;
      case "SCHOOL_ADMIN":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">PRINCIPAL / HOS</span>;
      case "TEACHER":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">CLASS TEACHER</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">VIEWER</span>;
    }
  };

  const modules = [
    { id: 1, name: "Excel Analysis & Mapping", desc: "Parsed all 35 sheets & mapped 11.3MB workbook", status: "completed" },
    { id: 2, name: "Project Setup & Authentication", desc: "Modular Flask API, MySQL models, JWT, bcrypt & React", status: "completed" },
    { id: 3, name: "School Management", desc: "MCD school metadata, zones, UDISE ID, HOS profiles", status: "completed" },
    { id: 4, name: "Class, Section & Subjects", desc: "Class III-A, subject masters, teacher mappings", status: "completed" },
    { id: 5, name: "Student Management", desc: "Student records from STUDENT sheet, bulk upload & profiles", status: "completed" },
    { id: 6, name: "Assessment Management", desc: "FLN, Periodic Assessments (PA1-4), Mid-Term & Final", status: "completed" },
    { id: 7, name: "FLN Level Entry", desc: "1-Click levels (Beginner, Alphabets, Words, Para, Story)", status: "completed" },
    { id: 8, name: "Marks Management", desc: "PASHEET & MARKS grid entry with auto calculations", status: "completed" },
    { id: 9, name: "Attendance Tracking", desc: "Daily & monthly attendance matching ATTENDANCEINFO", status: "completed" },
    { id: 10, name: "Python Calculation Engine", desc: "Calculations, grades, averages, FLN transition matrix", status: "completed" },
    { id: 11, name: "AI Analytics Engine", desc: "Student insights, weak subject detection, class analysis", status: "completed" },
    { id: 12, name: "Official Reporting System", desc: "Annexure F1, F2, F3.1, Result Registers, Report Cards", status: "completed" },
    { id: 13, name: "Excel Export Engine", desc: "Dynamic filling into original Excel workbook template", status: "completed" },
    { id: 14, name: "AI Natural Language Chat", desc: "Real-time AI query assistant over live database records", status: "completed" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <Navbar />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Active Context Card */}
        <div className="bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/80 border border-emerald-200/90 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <School className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  MCP NITHARI NO 1 BOYS
                </h2>
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-xs sm:text-sm text-slate-600">
                Municipal Corporation of Delhi • Education Dept • Rohini Zone • Ward No: 40 • School No: 20
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
              <div className="bg-white border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-slate-600">Session: <strong className="text-slate-900">2026-27</strong></span>
              </div>
              <Link
                to="/classes"
                className="bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-2 transition group shadow-2xs"
              >
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-slate-600">Class: <strong className="text-slate-900 group-hover:text-emerald-700 transition">III-A</strong> (39 Students)</span>
              </Link>
              <Link
                to="/school"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs shadow-xs"
              >
                <span>Manage School</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Authentication & Session Info Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Authenticated Role</div>
              <div className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                {user?.role}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">Workbook Template</div>
              <div className="text-sm font-semibold text-slate-800">
                FLN III-A 2026-27 (1).xlsx (35 sheets)
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center font-bold">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-500 font-medium">REST API Status</div>
              <div className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                Online (Port 5000)
              </div>
            </div>
          </div>
        </div>

        {/* Module Implementation Roadmap */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                System Modules & Features
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full-featured FLN Mission Buniyad & MCD Continuous Assessment Portal
              </p>
            </div>
            <div className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              All 14 Modules Active
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modules.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50 bg-white transition flex items-start gap-3 shadow-2xs"
              >
                <div className="mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      Module {m.id}: {m.name}
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2 py-0.5 rounded">
                      Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
