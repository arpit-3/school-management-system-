import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Lock, User, LogIn, Eye, EyeOff, GraduationCap, ShieldCheck, School, Sparkles } from "lucide-react";

export default function Login() {
  const [identifier, setIdentifier] = useState("teacher_indrajeet");
  const [password, setPassword] = useState("Teacher@12345");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || "/dashboard";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(identifier, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Failed to log in.");
    } finally {
      setSubmitting(false);
    }
  };

  const quickFill = (u, p) => {
    setIdentifier(u);
    setPassword(p);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 relative">
      {/* Subtle background decoration */}
      <div className="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-emerald-50/80 to-transparent pointer-events-none"></div>

      <div className="relative w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 shadow-md shadow-emerald-600/20 mb-3.5 text-white">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            School Assessment System
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 flex items-center justify-center gap-1.5 font-medium">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            AI Analytics & Excel Reporting • FLN Mission Buniyad
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-slate-200 shadow-xl shadow-slate-200/50 rounded-2xl p-6 sm:p-8">
          <h2 className="text-base font-bold text-slate-800 mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-start gap-2.5">
              <span className="text-sm leading-none">⚠️</span>
              <span className="flex-1">{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. teacher_indrajeet or email"
                  className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 placeholder-slate-400 text-sm transition outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-white border border-slate-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/10 rounded-xl py-2.5 pl-10 pr-10 text-slate-900 placeholder-slate-400 text-sm transition outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5">
              Quick Fill Demo Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => quickFill("teacher_indrajeet", "Teacher@12345")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-emerald-200 text-left transition flex flex-col group"
              >
                <span className="font-bold text-emerald-700">Class Teacher</span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5">teacher_indrajeet</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill("hos_shambhu", "Hos@12345")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-200/80 hover:border-blue-200 text-left transition flex flex-col group"
              >
                <span className="font-bold text-blue-700">Principal (HOS)</span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5">hos_shambhu</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill("superadmin", "SuperAdmin@123")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/80 hover:border-purple-200 text-left transition flex flex-col group"
              >
                <span className="font-bold text-purple-700">Super Admin</span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5">superadmin</span>
              </button>

              <button
                type="button"
                onClick={() => quickFill("evaluator_viewer", "Viewer@12345")}
                className="p-2.5 rounded-xl bg-slate-50 hover:bg-amber-50/60 border border-slate-200/80 hover:border-amber-200 text-left transition flex flex-col group"
              >
                <span className="font-bold text-amber-700">Inspection Officer</span>
                <span className="text-[11px] text-slate-500 font-mono mt-0.5">evaluator_viewer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-500 mt-6 font-medium">
          Municipal Corporation of Delhi • Education Department • Mission Buniyad 2026-27
        </p>
      </div>
    </div>
  );
}
