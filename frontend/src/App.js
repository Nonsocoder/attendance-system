// ============================================================
// App.js - The Root Component & Router
// ------------------------------------------------------------
// This is the entry point of the React app.
// It decides WHAT to show based on:
//   - Is the user logged in?
//   - What role are they? (student / lecturer / admin)
// ============================================================

import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./components/Auth/Login";
import Register from "./components/Auth/Register";
import LecturerDashboard from "./components/Dashboard/LecturerDashboard";
import StudentDashboard from "./components/Dashboard/StudentDashboard";
import "./App.css";

// Inner component (needs to be inside AuthProvider to use useAuth)
const AppContent = () => {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p>Loading...</p>
      </div>
    );
  }

  // If not logged in, show auth pages
  if (!user) {
    return (
      <div className="auth-page">
        <div className="auth-bg" />
        {showRegister ? (
          <Register onSwitch={() => setShowRegister(false)} />
        ) : (
          <Login onSwitch={() => setShowRegister(true)} />
        )}
      </div>
    );
  }

  // If logged in, show appropriate dashboard based on role
  if (user.role === "student") return <StudentDashboard />;
  if (user.role === "lecturer") return <LecturerDashboard />;
  if (user.role === "admin") return <LecturerDashboard />; // Admin gets lecturer view for now

  return <div>Unknown role. Contact admin.</div>;
};

// Wrap everything in AuthProvider so all components can access auth state
const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
