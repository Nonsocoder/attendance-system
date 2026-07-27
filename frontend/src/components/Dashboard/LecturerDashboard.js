import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { courseAPI, attendanceAPI } from "../../utils/api";
import CreateSession from "../Attendance/CreateSession";
import SessionAttendance from "../Attendance/SessionAttendance";
import CourseSummary from "../Reports/CourseSummary";

const LecturerDashboard = () => {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", code: "", department: "", description: "" });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const data = await courseAPI.getAll();
      setCourses(data.courses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await courseAPI.create(newCourse);
      setMessage("Course created successfully!");
      setShowCreateCourse(false);
      setNewCourse({ title: "", code: "", department: "", description: "" });
      loadCourses();
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span>🎓</span>
          <span>AttendanceMS</span>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar">{user.name.charAt(0)}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">Lecturer</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          {[
            { id: "dashboard", icon: "📊", label: "Dashboard" },
            { id: "courses", icon: "📚", label: "My Courses" },
            { id: "sessions", icon: "📋", label: "Sessions" },
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
        <button className="btn-logout" onClick={logout}>🚪 Logout</button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="page-header">
          <h1>
            {activeTab === "dashboard" && "Dashboard Overview"}
            {activeTab === "courses" && "My Courses"}
            {activeTab === "sessions" && "Manage Sessions"}
          </h1>
          <span className="date">{new Date().toDateString()}</span>
        </header>

        {message && (
          <div className="alert alert-success">
            {message} <button onClick={() => setMessage("")}>✕</button>
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === "dashboard" && (
          <div>
            <div className="stats-grid">
              <div className="stat-card blue">
                <div className="stat-icon">📚</div>
                <div className="stat-number">{courses.length}</div>
                <div className="stat-label">Total Courses</div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon">👨‍🎓</div>
                <div className="stat-number">-</div>
                <div className="stat-label">Total Students</div>
              </div>
              <div className="stat-card orange">
                <div className="stat-icon">📋</div>
                <div className="stat-number">-</div>
                <div className="stat-label">Sessions Today</div>
              </div>
            </div>
            <div className="card">
              <h2>Quick Actions</h2>
              <div className="quick-actions">
                <button className="action-btn" onClick={() => setActiveTab("courses")}>
                  <span>📚</span> Manage Courses
                </button>
                <button className="action-btn" onClick={() => setActiveTab("sessions")}>
                  <span>➕</span> Start New Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Courses Tab */}
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
                        type="text" placeholder="e.g. Introduction to Programming"
                        value={newCourse.title}
                        onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Course Code</label>
                      <input
                        type="text" placeholder="e.g. CSC101"
                        value={newCourse.code}
                        onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Department</label>
                    <input
                      type="text" placeholder="e.g. Computer Science"
                      value={newCourse.department}
                      onChange={(e) => setNewCourse({ ...newCourse, department: e.target.value })}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn btn-primary">Create Course</button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateCourse(false)}>Cancel</button>
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
                {courses.map((course) => (
                  <div key={course.id} className="course-card">
                    <div className="course-code">{course.code}</div>
                    <h3>{course.title}</h3>
                    <p>{course.department}</p>
                    <div className="course-actions">
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => { setSelectedCourse(course); setActiveTab("sessions"); }}
                      >
                        Manage Sessions
                      </button>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => { setSelectedCourse(course); setActiveTab("reports"); }}
                      >
                        View Reports
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Sessions Tab */}
        {activeTab === "sessions" && (
          <div>
            {!selectedCourse ? (
              <div>
                <p className="hint">Select a course to manage sessions:</p>
                <div className="courses-grid">
                  {courses.map((course) => (
                    <div
                      key={course.id}
                      className="course-card clickable"
                      onClick={() => setSelectedCourse(course)}
                    >
                      <div className="course-code">{course.code}</div>
                      <h3>{course.title}</h3>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <button className="btn btn-secondary mb-3" onClick={() => setSelectedCourse(null)}>
                  ← Back to Courses
                </button>
                <CreateSession course={selectedCourse} />
              </div>
            )}
          </div>
        )}

        {activeTab === "reports" && selectedCourse && (
          <div>
            <button className="btn btn-secondary mb-3" onClick={() => { setActiveTab("courses"); setSelectedCourse(null); }}>
              ← Back
            </button>
            <CourseSummary course={selectedCourse} />
          </div>
        )}
      </main>
    </div>
  );
};

export default LecturerDashboard;
