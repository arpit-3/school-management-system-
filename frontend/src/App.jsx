import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SchoolManagement from "./pages/SchoolManagement";
import ClassManagement from "./pages/ClassManagement";
import StudentManagement from "./pages/StudentManagement";
import AssessmentManagement from "./pages/AssessmentManagement";
import FLNAssessmentEntry from "./pages/FLNAssessmentEntry";
import MarksManagement from "./pages/MarksManagement";
import AttendanceManagement from "./pages/AttendanceManagement";
import CalculationEngine from "./pages/CalculationEngine";
import AIAnalytics from "./pages/AIAnalytics";
import ReportingSystem from "./pages/ReportingSystem";
import AIChatDrawer from "./components/AIChatDrawer";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/school"
            element={
              <ProtectedRoute>
                <SchoolManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <ClassManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <StudentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/assessments"
            element={
              <ProtectedRoute>
                <AssessmentManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/fln"
            element={
              <ProtectedRoute>
                <FLNAssessmentEntry />
              </ProtectedRoute>
            }
          />
          <Route
            path="/marks"
            element={
              <ProtectedRoute>
                <MarksManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/attendance"
            element={
              <ProtectedRoute>
                <AttendanceManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/calculations"
            element={
              <ProtectedRoute>
                <CalculationEngine />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-analytics"
            element={
              <ProtectedRoute>
                <AIAnalytics />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportingSystem />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <AIChatDrawer />
      </BrowserRouter>
    </AuthProvider>
  );
}
