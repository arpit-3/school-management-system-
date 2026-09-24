import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-slate-500 text-xs font-medium">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white border border-rose-200 shadow-xl rounded-2xl p-6 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-3">
            ⚠️
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-1">Access Restricted</h2>
          <p className="text-xs text-slate-600 mb-4">
            Your role (<strong className="text-amber-600">{user?.role}</strong>) does not have authorization to view this resource.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition border border-slate-200"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}
