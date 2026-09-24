import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { 
  GraduationCap, 
  School, 
  LayoutDashboard, 
  LogOut, 
  User as UserIcon,
  Sparkles,
  Users,
  Calendar,
  Award,
  CalendarCheck,
  Calculator,
  Brain,
  FileText,
  Pencil,
  Check,
  X,
  RotateCcw
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();

  // Branding State (persisted in localStorage)
  const [title, setTitle] = useState(() => {
    return localStorage.getItem("fln_brand_title") || "School Assessment System";
  });
  const [subtitle, setSubtitle] = useState(() => {
    return localStorage.getItem("fln_brand_subtitle") || "FLN Mission Buniyad • MCD Delhi";
  });

  const [isEditingBrand, setIsEditingBrand] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [tempSubtitle, setTempSubtitle] = useState(subtitle);

  useEffect(() => {
    const handleStorage = () => {
      setTitle(localStorage.getItem("fln_brand_title") || "School Assessment System");
      setSubtitle(localStorage.getItem("fln_brand_subtitle") || "FLN Mission Buniyad • MCD Delhi");
    };
    window.addEventListener("storage", handleStorage);
    window.addEventListener("fln_brand_update", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("fln_brand_update", handleStorage);
    };
  }, []);

  const handleSaveBrand = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newTitle = tempTitle.trim() || "School Assessment System";
    const newSubtitle = tempSubtitle.trim() || "FLN Mission Buniyad • MCD Delhi";
    setTitle(newTitle);
    setSubtitle(newSubtitle);
    localStorage.setItem("fln_brand_title", newTitle);
    localStorage.setItem("fln_brand_subtitle", newSubtitle);
    window.dispatchEvent(new Event("fln_brand_update"));
    setIsEditingBrand(false);
  };

  const handleResetBrand = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const defaultTitle = "School Assessment System";
    const defaultSubtitle = "FLN Mission Buniyad • MCD Delhi";
    setTitle(defaultTitle);
    setSubtitle(defaultSubtitle);
    setTempTitle(defaultTitle);
    setTempSubtitle(defaultSubtitle);
    localStorage.removeItem("fln_brand_title");
    localStorage.removeItem("fln_brand_subtitle");
    window.dispatchEvent(new Event("fln_brand_update"));
    setIsEditingBrand(false);
  };

  const openBrandEditor = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTempTitle(title);
    setTempSubtitle(subtitle);
    setIsEditingBrand(true);
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "SUPER_ADMIN":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">SUPER ADMIN</span>;
      case "SCHOOL_ADMIN":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">PRINCIPAL / HOS</span>;
      case "TEACHER":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">CLASS TEACHER</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">VIEWER</span>;
    }
  };

  const navLinks = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "School", path: "/school", icon: School },
    { name: "Classes & Subjects", path: "/classes", icon: GraduationCap },
    { name: "Students", path: "/students", icon: Users },
    { name: "Assessments", path: "/assessments", icon: Calendar },
    { name: "FLN Entry", path: "/fln", icon: Sparkles },
    { name: "Marks Entry", path: "/marks", icon: Award },
    { name: "Attendance", path: "/attendance", icon: CalendarCheck },
    { name: "Calculations & Ranks", path: "/calculations", icon: Calculator },
    { name: "AI Analytics", path: "/ai-analytics", icon: Brain },
    { name: "Reports & Cards", path: "/reports", icon: FileText },
  ];

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-30 px-4 sm:px-8 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 group/brand relative">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm hover:scale-105 transition flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight flex items-center gap-1.5 leading-tight">
                {title}
              </h1>
              <p className="text-[11px] text-slate-500 flex items-center gap-1 font-medium leading-tight mt-0.5">
                <Sparkles className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                {subtitle}
              </p>
            </div>
          </Link>
          
          <button
            onClick={openBrandEditor}
            title="Edit Header Title & Subtitle"
            className="opacity-60 group-hover/brand:opacity-100 p-1 rounded-md text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition ml-1"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Navigation tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200/80 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex flex-col items-end">
          <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
            <UserIcon className="w-3 h-3 text-slate-400" />
            {user?.full_name}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            {getRoleBadge(user?.role)}
            {user?.employee_id && (
              <span className="text-[10px] text-slate-500 font-medium">BMID: {user.employee_id}</span>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          title="Sign out"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-medium border border-slate-200 transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>

    {/* Brand Customization Modal */}
    {isEditingBrand && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
        <div 
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 relative animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Pencil className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Customize Header Title</h2>
                <p className="text-xs text-slate-500">Edit the application title and subtitle shown on top</p>
              </div>
            </div>
            <button
              onClick={() => setIsEditingBrand(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveBrand} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Main System / School Title
              </label>
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                placeholder="e.g. School Assessment System or School Name"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Subtitle / Department / Tagline
              </label>
              <input
                type="text"
                value={tempSubtitle}
                onChange={(e) => setTempSubtitle(e.target.value)}
                placeholder="e.g. FLN Mission Buniyad • MCD Delhi"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
              />
            </div>

            {/* Live Preview */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Live Preview</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white flex-shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 leading-tight">
                    {tempTitle.trim() || "School Assessment System"}
                  </p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 font-medium mt-0.5">
                    <Sparkles className="w-2.5 h-2.5 text-emerald-600 flex-shrink-0" />
                    {tempSubtitle.trim() || "FLN Mission Buniyad • MCD Delhi"}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleResetBrand}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingBrand(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
