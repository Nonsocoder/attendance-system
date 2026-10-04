import React, { useState, useEffect, useCallback } from "react";
import { attendanceAPI } from "../../utils/api";

const CourseSummary = ({ course }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!course || !course.id) return;
    setLoading(true);
    setError("");
    try {
      const data = await attendanceAPI.getCourseSummary(course.id);
      setSummary(data);
    } catch (err) {
      console.error("Failed to load course summary:", err);
      setError(err.message || "Could not load report.");
    } finally {
      setLoading(false);
    }
  }, [course]);

  useEffect(() => {
    load();
  }, [load]);

  const statusColor = {
    good: "badge-success",
    warning: "badge-warning",
    poor: "badge-error",
    neutral: "badge-secondary",
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="alert alert-error">
          <span>{error}</span>
          <button className="btn btn-sm btn-secondary" onClick={load} style={{ marginLeft: "12px" }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="card">
        <div className="alert alert-error">Could not load report.</div>
      </div>
    );
  }

  const studentList = summary.summary || [];

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>
          📊 Course Attendance & Registered Students — {summary.courseCode || course.code}: {summary.courseTitle || course.title}
        </h2>
        <button className="btn btn-sm btn-secondary" onClick={load}>
          🔄 Refresh
        </button>
      </div>

      <div className="stats-row">
        <span>Registered Students: <strong>{studentList.length}</strong></span>
        <span>Sessions Had: <strong>{summary.totalSessions}</strong></span>
      </div>

      {studentList.length === 0 ? (
        <div className="empty-state">
          <span>👨‍🎓</span>
          <p>No students enrolled yet.</p>
        </div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Sessions Attended</th>
              <th>Attendance %</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {studentList.map((s) => (
              <tr key={s.studentId}>
                <td><strong>{s.studentName}</strong></td>
                <td>{s.attended} / {s.totalSessions}</td>
                <td>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${s.totalSessions > 0 ? s.percentage : 0}%`,
                        background:
                          s.totalSessions === 0
                            ? "#94a3b8"
                            : s.percentage >= 75
                            ? "#22c55e"
                            : s.percentage >= 50
                            ? "#f59e0b"
                            : "#ef4444",
                      }}
                    />
                    <span>{s.totalSessions > 0 ? `${s.percentage}%` : "N/A"}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${statusColor[s.status] || "badge-secondary"}`}>
                    {s.status === "good"
                      ? "Good"
                      : s.status === "warning"
                      ? "At Risk"
                      : s.status === "neutral"
                      ? "No Sessions Yet"
                      : "Poor"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CourseSummary;

