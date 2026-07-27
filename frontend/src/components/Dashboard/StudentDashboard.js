// ============================================================
// StudentDashboard.js — FIXED VERSION
// Key changes:
//  1. "My Courses" tab now shows each enrolled course with a
//     direct "Scan QR" button — no need to hunt for the button
//  2. Enroll tab correctly shows only truly unenrolled courses
//  3. After marking attendance, dashboard stats refresh live
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { courseAPI, attendanceAPI } from "../../utils/api";
import QRScanner from "../Attendance/QRScanner";

const StudentDashboard = () => {
  const { user, logout } = useAuth();
  const [myCourses, setMyCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [scanningFor, setScanningFor] = useState(null); // { courseId, courseTitle }
  const [message, setMessage] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(true);

  // ── Load all data ──────────────────────────────────────────
  // Using Promise.allSettled so that a failure in one endpoint
  // does NOT blank out the rest of the dashboard.
  const loadData = useCallback(async () => {
    try {
      const [coursesResult, myCoursesResult, attendanceResult] = await Promise.allSettled([
        courseAPI.getAll(),
        courseAPI.getMyCourses(),
        attendanceAPI.getMyAttendance(),
      ]);

      if (coursesResult.status === "fulfilled") {
        setAllCourses(coursesResult.value.courses || []);
      } else {
        console.error("Failed to load all courses:", coursesResult.reason);
      }

      if (myCoursesResult.status === "fulfilled") {
        setMyCourses(myCoursesResult.value.courses || []);
      } else {
        console.error("Failed to load my courses:", myCoursesResult.reason);
      }

      if (attendanceResult.status === "fulfilled") {
        setAttendance(attendanceResult.value.records || []);
      } else {
        console.error("Failed to load attendance:", attendanceResult.reason);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Enroll in a course ─────────────────────────────────────
  const handleEnroll = async (courseId, courseTitle) => {
    try {
      await courseAPI.enroll(courseId);
      setMessage({
        text: `✅ Enrolled in ${courseTitle} successfully!`,
        type: "success",
      });
      loadData();
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    }
  };

  // ── Attendance marked successfully ─────────────────────────
  const handleAttendanceMarked = (record) => {
    setMessage({
      text: `✅ Attendance marked for ${record.courseTitle || record.courseCode}!`,
      type: "success",
    });
    setScanningFor(null);
    loadData(); // refresh stats immediately
  };

  // ── Derived data ───────────────────────────────────────────
  const enrolledCourseIds = (myCourses || []).map((c) => c.courseId || c.id);
  const unenrolledCourses = (allCourses || []).filter(
    (c) => !enrolledCourseIds.includes(c.id || c.courseId),
  );

  // Per-course attendance count for each enrolled course
  const coursesWithStats = (myCourses || []).map((course) => ({
    ...course,
    attended: (attendance || []).filter((a) => a.courseId === (course.courseId || course.id)).length,
  }));

  return (
    <div className="dashboard">
      {/* ── SIDEBAR ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>🎓</span>
          <span>AttendanceMS</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{user.name.charAt(0)}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.studentId || "Student"}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "courses", icon: "📚", label: "My Courses" },
            { id: "enroll", icon: "➕", label: "Enroll" },
            { id: "attendance", icon: "✅", label: "Attendance History" },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => setActiveTab(item.id)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <button className="btn-logout" onClick={logout}>
          🚪 Logout
        </button>
      </aside>

      {/* ── MAIN ── */}
      <main className="main-content">
        <header className="page-header">
          <h1>
            {activeTab === "dashboard" &&
              `Welcome, ${user.name.split(" ")[0]}!`}
            {activeTab === "courses" && "My Courses"}
            {activeTab === "enroll" && "Enroll in Courses"}
            {activeTab === "attendance" && "Attendance History"}
          </h1>
          {/* Global scan button — always visible */}
          <button
            className="btn btn-primary scan-btn"
            onClick={() => setScanningFor({ global: true })}
          >
            📷 Scan QR Code
          </button>
        </header>

        {/* Alert */}
        {message.text && (
          <div className={`alert alert-${message.type}`}>
            {message.text}
            <button onClick={() => setMessage({ text: "", type: "" })}>
              ✕
            </button>
          </div>
        )}

        {/* ── QR SCANNER MODAL ── */}
        {scanningFor && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h2>
                  {scanningFor.global
                    ? "Scan Attendance QR Code"
                    : `Scan QR — ${scanningFor.courseTitle}`}
                </h2>
                <button onClick={() => setScanningFor(null)}>✕</button>
              </div>
              <QRScanner
                onSuccess={handleAttendanceMarked}
                onClose={() => setScanningFor(null)}
              />
            </div>
          </div>
        )}

        {/* ══ DASHBOARD TAB ══ */}
        {activeTab === "dashboard" && (
          <div>
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">📚</div>
                <div className="stat-number">{myCourses.length}</div>
                <div className="stat-label">Enrolled Courses</div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">✅</div>
                <div className="stat-number">{attendance.length}</div>
                <div className="stat-label">Classes Attended</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-icon">📋</div>
                <div className="stat-number">{unenrolledCourses.length}</div>
                <div className="stat-label">Courses Available to Enroll</div>
              </div>
            </div>

            {/* Quick scan prompt */}
            <div
              className="card"
              style={{ textAlign: "center", padding: "32px" }}
            >
              <div style={{ fontSize: "48px", marginBottom: "12px" }}>📷</div>
              <h2 style={{ marginBottom: "8px" }}>Ready to mark attendance?</h2>
              <p style={{ color: "var(--text-light)", marginBottom: "20px" }}>
                Your lecturer will display a QR code. Tap the button below to
                scan it.
              </p>
              <button
                className="btn btn-primary"
                style={{ fontSize: "16px", padding: "14px 32px" }}
                onClick={() => setScanningFor({ global: true })}
              >
                📷 Scan QR Code Now
              </button>
            </div>

            {/* Per-course attendance overview */}
            {coursesWithStats.length > 0 && (
              <div className="card">
                <h2>Course Attendance Overview</h2>
                <div className="attendance-list">
                  {coursesWithStats.map((course) => (
                    <div key={course.courseId} className="attendance-row">
                      <div>
                        <strong>{course.courseCode}</strong> —{" "}
                        {course.courseTitle}
                      </div>
                      <div className="attendance-bar-wrap">
                        <div className="attendance-bar">
                          <div
                            className={`attendance-fill ${course.attended > 0 ? "good" : "none"}`}
                            style={{
                              width: `${Math.min(course.attended * 10, 100)}%`,
                            }}
                          />
                        </div>
                        <span>
                          {course.attended} class
                          {course.attended !== 1 ? "es" : ""}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ MY COURSES TAB ══ */}
        {activeTab === "courses" && (
          <div>
            {loading ? (
              <div className="loading">Loading courses...</div>
            ) : myCourses.length === 0 ? (
              <div className="empty-state">
                <span>📚</span>
                <p>Not enrolled in any courses yet.</p>
                <button
                  className="btn btn-primary mt-2"
                  onClick={() => setActiveTab("enroll")}
                >
                  Go to Enroll →
                </button>
              </div>
            ) : (
              <div className="courses-grid">
                {coursesWithStats.map((course) => (
                  <div key={course.enrollmentId} className="course-card">
                    <div className="course-code">{course.courseCode}</div>
                    <h3>{course.courseTitle}</h3>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-light)",
                        marginBottom: "6px",
                      }}
                    >
                      Enrolled{" "}
                      {new Date(course.enrolledAt).toLocaleDateString()}
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-light)",
                        marginBottom: "14px",
                      }}
                    >
                      ✅ {course.attended} class
                      {course.attended !== 1 ? "es" : ""} attended
                    </p>

                    {/* ── THE KEY FIX: direct Scan QR button per course ── */}
                    <button
                      className="btn btn-primary btn-full"
                      onClick={() =>
                        setScanningFor({
                          courseId: course.courseId,
                          courseTitle: course.courseTitle,
                        })
                      }
                    >
                      📷 Mark Attendance (Scan QR)
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ENROLL TAB ══ */}
        {activeTab === "enroll" && (
          <div>
            {loading ? (
              <div className="loading">Loading available courses...</div>
            ) : allCourses.length === 0 ? (
              <div className="empty-state">
                <span>📭</span>
                <p>No courses have been created yet.</p>
                <p style={{ fontSize: "13px", color: "var(--text-light)" }}>
                  Ask your lecturer to create a course first.
                </p>
              </div>
            ) : unenrolledCourses.length === 0 ? (
              <div className="empty-state">
                <span>🎉</span>
                <p>You are enrolled in all available courses!</p>
                <button
                  className="btn btn-secondary mt-2"
                  onClick={() => setActiveTab("courses")}
                >
                  View My Courses →
                </button>
              </div>
            ) : (
              <div>
                <p className="hint">
                  {unenrolledCourses.length} course(s) available to enroll in:
                </p>
                <div className="courses-grid">
                  {unenrolledCourses.map((course) => (
                    <div key={course.id} className="course-card">
                      <div className="course-code">{course.code}</div>
                      <h3>{course.title || course.name}</h3>
                      <p>{course.department}</p>
                      <p className="lecturer">👨‍🏫 {course.lecturerName}</p>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleEnroll(course.id, course.title || course.name)}
                      >
                        Enroll
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ ATTENDANCE HISTORY TAB ══ */}
        {activeTab === "attendance" && (
          <div className="card">
            <h2>Your Attendance Records</h2>
            {attendance.length === 0 ? (
              <div className="empty-state">
                <span>📋</span>
                <p>No attendance records yet. Scan QR codes in class!</p>
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Topic</th>
                    <th>Date &amp; Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.courseCode}</strong> —{" "}
                        {record.courseTitle}
                      </td>
                      <td>{record.topic}</td>
                      <td>{new Date(record.markedAt).toLocaleString()}</td>
                      <td>
                        <span className="badge badge-success">Present</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default StudentDashboard;
