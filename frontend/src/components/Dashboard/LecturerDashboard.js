// ============================================================
// LecturerDashboard.js — UPDATED
// Real-time reflections for registered students and sessions had
// ============================================================
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { courseAPI, attendanceAPI } from "../../utils/api";
import CreateSession from "../Attendance/CreateSession";
import SessionAttendance from "../Attendance/SessionAttendance";
import CourseSummary from "../Reports/CourseSummary";

const LecturerDashboard = () => {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [viewingSessionId, setViewingSessionId] = useState(null);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({
    title: "",
    code: "",
    department: "",
    description: "",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  // ── Load All Data (Courses and Sessions) ────────────────────────
  const loadData = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [coursesResult, sessionsResult] = await Promise.allSettled([
        courseAPI.getAll(),
        attendanceAPI.getAllSessions(),
      ]);

      if (coursesResult.status === "fulfilled") {
        setCourses(coursesResult.value.courses || []);
      } else {
        console.error("Failed to load courses:", coursesResult.reason);
      }

      if (sessionsResult.status === "fulfilled") {
        setSessions(sessionsResult.value.sessions || []);
      } else {
        console.error("Failed to load sessions:", sessionsResult.reason);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading lecturer dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling every 25 seconds for live sync when students register or sessions update
  useEffect(() => {
    const timer = setInterval(() => {
      loadData(true);
    }, 25000);
    return () => clearInterval(timer);
  }, [loadData]);

  // Reload data when switching tabs to ensure freshest state
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    if (tabId === "dashboard" || tabId === "courses") {
      loadData(true);
    }
  };

  // ── Derived Metrics ──────────────────────────────────────────
  const stats = useMemo(() => {
    // Unique registered students across all courses taught by the lecturer
    const uniqueStudentSet = new Set();
    let totalEnrollmentCount = 0;

    courses.forEach((c) => {
      const enrolled = Array.isArray(c.enrolledStudents) ? c.enrolledStudents : [];
      enrolled.forEach((studentId) => uniqueStudentSet.add(studentId));
      totalEnrollmentCount += Math.max(enrolled.length, c.enrollmentCount || 0);
    });

    const totalUniqueStudents = uniqueStudentSet.size;

    // Total sessions the lecturer has had
    const totalSessions = sessions.length;

    // Sessions conducted today
    const todayStr = new Date().toDateString();
    const sessionsToday = sessions.filter((s) => {
      if (!s.createdAt) return false;
      return new Date(s.createdAt).toDateString() === todayStr;
    }).length;

    return {
      totalCourses: courses.length,
      totalStudents: totalUniqueStudents > 0 ? totalUniqueStudents : totalEnrollmentCount,
      totalEnrollments: totalEnrollmentCount,
      hasMultiEnrollment: totalEnrollmentCount > totalUniqueStudents && totalUniqueStudents > 0,
      totalSessions,
      sessionsToday,
    };
  }, [courses, sessions]);

  // Helper: Get student and session count for a course
  const getCourseDetails = useCallback(
    (course) => {
      const enrolled = Array.isArray(course.enrolledStudents) ? course.enrolledStudents : [];
      const studentCount = Math.max(enrolled.length, course.enrollmentCount || 0);
      const courseSessions = sessions.filter(
        (s) => s.courseId === course.id || (s.courseCode && s.courseCode === course.code)
      );
      return {
        studentCount,
        sessionCount: courseSessions.length,
        sessions: courseSessions,
      };
    },
    [sessions]
  );

  // ── Handlers ─────────────────────────────────────────────────
  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await courseAPI.create(newCourse);
      setMessage("Course created successfully!");
      setShowCreateCourse(false);
      setNewCourse({ title: "", code: "", department: "", description: "" });
      loadData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleDeleteCourse = async (course) => {
    const courseToDelete = course || selectedCourse;
    if (!courseToDelete) return;

    if (!window.confirm(`Are you sure you want to delete "${courseToDelete.title}"?`)) {
      return;
    }

    try {
      await courseAPI.deleteCourse(courseToDelete.id);
      setMessage(`Course "${courseToDelete.title}" deleted successfully!`);
      if (selectedCourse && selectedCourse.id === courseToDelete.id) {
        setSelectedCourse(null);
      }
      loadData();
    } catch (err) {
      setMessage(err.message);
    }
  };

  const handleSessionCreated = (newSession) => {
    setMessage(`Session "${newSession.topic}" created successfully!`);
    loadData(true);
  };

  return (
    <div className="dashboard">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>🎓</span>
          <span>AttendanceMS</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{user.name.charAt(0)}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role === "admin" ? "Administrator" : "Lecturer"}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "courses", icon: "📚", label: user.role === "admin" ? "All Courses" : "My Courses" },
            { id: "sessions", icon: "📋", label: user.role === "admin" ? "All Sessions" : "Sessions" },
          ].map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? "active" : ""}`}
              onClick={() => handleTabChange(item.id)}
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

      {/* ── Main Content ── */}
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>
              {activeTab === "dashboard" && "Dashboard Overview"}
              {activeTab === "courses" && (user.role === "admin" ? "All Courses" : "My Courses")}
              {activeTab === "sessions" && (selectedCourse ? `Sessions — ${selectedCourse.code}` : (user.role === "admin" ? "All Sessions" : "Manage Sessions"))}
              {activeTab === "reports" && `Report — ${selectedCourse?.code || ""}`}
            </h1>
          </div>
          <div className="header-actions">
            <button
              className="btn-refresh"
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              title="Refresh course enrollments and sessions"
            >
              <span>{refreshing ? "⏳" : "🔄"}</span>
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
            <span className="date">
              {lastUpdated
                ? `Updated: ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : new Date().toDateString()}
            </span>
          </div>
        </header>

        {message && (
          <div className="alert alert-success">
            {message} <button onClick={() => setMessage("")}>✕</button>
          </div>
        )}

        {/* ══ DASHBOARD TAB ══ */}
        {activeTab === "dashboard" && (
          <div>
            {/* Live Stats Grid */}
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">📚</div>
                <div className="stat-number">{stats.totalCourses}</div>
                <div className="stat-label">Total Courses</div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-number">{stats.totalStudents}</div>
                <div className="stat-label">Registered Students</div>
                {stats.hasMultiEnrollment && (
                  <div className="stat-subtext">({stats.totalEnrollments} total enrollments)</div>
                )}
              </div>
              <div className="stat-card purple">
                <div className="stat-icon">📋</div>
                <div className="stat-number">{stats.totalSessions}</div>
                <div className="stat-label">Sessions Held</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-icon">⏱️</div>
                <div className="stat-number">{stats.sessionsToday}</div>
                <div className="stat-label">Sessions Today</div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="card">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <button className="action-btn" onClick={() => setActiveTab("courses")}>
                  <span>📚</span> Manage Courses
                </button>
                <button
                  className="action-btn"
                  onClick={() => {
                    setSelectedCourse(null);
                    setActiveTab("sessions");
                  }}
                >
                  <span>➕</span> Start New Session
                </button>
                <button className="action-btn" onClick={() => loadData(true)}>
                  <span>🔄</span> Sync Attendance Data
                </button>
              </div>
            </div>

            {/* Courses Overview & Enrollment Counts */}
            <div className="card">
              <h2>Course Enrollments & Sessions Overview</h2>
              {loading ? (
                <div className="loading">Loading courses...</div>
              ) : courses.length === 0 ? (
                <div className="empty-state">
                  <span>📚</span>
                  <p>No courses created yet. Create a course to start registering students!</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course Code</th>
                      <th>Course Title</th>
                      {user.role === "admin" && <th>Lecturer</th>}
                      <th>Department</th>
                      <th>Registered Students</th>
                      <th>Sessions Had</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course) => {
                      const { studentCount, sessionCount } = getCourseDetails(course);
                      return (
                        <tr key={course.id}>
                          <td>
                            <span className="course-code" style={{ marginBottom: 0 }}>
                              {course.code}
                            </span>
                          </td>
                          <td>
                            <strong>{course.title}</strong>
                          </td>
                          {user.role === "admin" && <td>{course.lecturerName || "—"}</td>}
                          <td>{course.department || "—"}</td>
                          <td>
                            <span className="course-meta-badge students">
                              👨‍🎓 {studentCount} {studentCount === 1 ? "student" : "students"}
                            </span>
                          </td>
                          <td>
                            <span className="course-meta-badge sessions">
                              📋 {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setActiveTab("sessions");
                                }}
                              >
                                Sessions
                              </button>
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setActiveTab("reports");
                                }}
                              >
                                Students / Report
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Recent Sessions List */}
            <div className="card">
              <h2>Recent Sessions Had</h2>
              {sessions.length === 0 ? (
                <div className="empty-state">
                  <span>📋</span>
                  <p>No sessions recorded yet. Start a session from the Sessions tab!</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Course</th>
                      {user.role === "admin" && <th>Lecturer</th>}
                      <th>Topic</th>
                      <th>Date & Time</th>
                      <th>Duration</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.slice(0, 8).map((s) => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.courseCode || "Course"}</strong>
                          {s.courseTitle && (
                            <span style={{ color: "var(--text-light)", fontSize: "12px", display: "block" }}>
                              {s.courseTitle}
                            </span>
                          )}
                        </td>
                        {user.role === "admin" && <td>{s.lecturerName || "—"}</td>}
                        <td>{s.topic || "Lecture"}</td>
                        <td>{new Date(s.createdAt).toLocaleString()}</td>
                        <td>{s.durationMinutes || 15} mins</td>
                        <td>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setViewingSessionId(s.id)}
                          >
                            View Attendance
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ══ COURSES TAB ══ */}
        {activeTab === "courses" && (
          <div>
            <div className="tab-actions">
              <button className="btn btn-primary" onClick={() => setShowCreateCourse(true)}>
                + New Course
              </button>
            </div>

            {showCreateCourse && (
              <div className="card">
                <h2>Create New Course</h2>
                <form onSubmit={handleCreateCourse}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Course Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Introduction to Programming"
                        value={newCourse.title}
                        onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Course Code</label>
                      <input
                        type="text"
                        placeholder="e.g. CSC101"
                        value={newCourse.code}
                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Computer Science"
                      value={newCourse.department}
                      onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">
                      Create Course
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowCreateCourse(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div className="loading">Loading courses...</div>
            ) : courses.length === 0 ? (
              <div className="empty-state">
                <span>📚</span>
                <p>No courses yet. Create your first course!</p>
              </div>
            ) : (
              <div className="courses-grid">
                {courses.map((course) => {
                  const { studentCount, sessionCount } = getCourseDetails(course);
                  return (
                    <div key={course.id} className="course-card">
                      <div className="course-code">{course.code}</div>
                      <h3>{course.title}</h3>
                      <p>{course.department || "No department specified"}</p>
                      {user.role === "admin" && course.lecturerName && (
                        <p style={{ fontSize: "12px", color: "var(--primary)", margin: "4px 0 8px" }}>
                          👤 Lecturer: <strong>{course.lecturerName}</strong>
                        </p>
                      )}

                      {/* Course Meta Badges */}
                      <div className="course-meta">
                        <span className="course-meta-badge students">
                          👨‍🎓 {studentCount} {studentCount === 1 ? "Student" : "Students"}
                        </span>
                        <span className="course-meta-badge sessions">
                          📋 {sessionCount} {sessionCount === 1 ? "Session Had" : "Sessions Had"}
                        </span>
                      </div>

                      <div className="course-actions">
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => {
                            setSelectedCourse(course);
                            setActiveTab("sessions");
                          }}
                        >
                          Manage Sessions
                        </button>
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => {
                            setSelectedCourse(course);
                            setActiveTab("reports");
                          }}
                        >
                          View Reports
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-danger"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCourse(course);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══ SESSIONS TAB ══ */}
        {activeTab === "sessions" && (
          <div>
            {!selectedCourse ? (
              <div>
                <p className="hint">Select a course to create and manage its sessions:</p>
                <div className="courses-grid">
                  {courses.map((course) => {
                    const { studentCount, sessionCount } = getCourseDetails(course);
                    return (
                      <div
                        key={course.id}
                        className="course-card clickable"
                        onClick={() => setSelectedCourse(course)}
                      >
                        <div className="course-code">{course.code}</div>
                        <h3>{course.title}</h3>
                        <div className="course-meta">
                          <span className="course-meta-badge students">
                            👨‍🎓 {studentCount} {studentCount === 1 ? "Student" : "Students"}
                          </span>
                          <span className="course-meta-badge sessions">
                            📋 {sessionCount} {sessionCount === 1 ? "Session Had" : "Sessions Had"}
                          </span>
                        </div>
                        <p style={{ marginTop: "8px", fontSize: "12px", color: "var(--primary)" }}>
                          Click to manage sessions →
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <button
                  className="btn btn-secondary mb-3"
                  onClick={() => setSelectedCourse(null)}
                >
                  ← Back to Course Selection
                </button>
                <CreateSession
                  course={selectedCourse}
                  onSessionCreated={handleSessionCreated}
                  onViewAttendance={(sessionId) => setViewingSessionId(sessionId)}
                />
              </div>
            )}
          </div>
        )}

        {/* ══ REPORTS TAB ══ */}
        {activeTab === "reports" && selectedCourse && (
          <div>
            <button
              className="btn btn-secondary mb-3"
              onClick={() => {
                setActiveTab("courses");
                setSelectedCourse(null);
              }}
            >
              ← Back to Courses
            </button>
            <CourseSummary course={selectedCourse} />
          </div>
        )}

        {/* ══ SESSION ATTENDANCE MODAL ══ */}
        {viewingSessionId && (
          <div className="modal-overlay" onClick={() => setViewingSessionId(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Session Attendance Details</h2>
                <button onClick={() => setViewingSessionId(null)}>✕</button>
              </div>
              <div style={{ padding: "20px" }}>
                <SessionAttendance sessionId={viewingSessionId} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default LecturerDashboard;
