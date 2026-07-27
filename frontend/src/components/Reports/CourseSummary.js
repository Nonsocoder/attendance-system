import React, { useState, useEffect } from "react";
import { attendanceAPI } from "../../utils/api";

const CourseSummary = ({ course }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await attendanceAPI.getCourseSummary(course.id);
        setSummary(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [course.id]);

  if (loading) return <div className="loading">Loading report...</div>;
  if (!summary) return <div className="alert alert-error">Could not load report.</div>;

  const statusColor = { good: "badge-success", warning: "badge-warning", poor: "badge-error" };

  return (
    <div className="card">
      <h2>📊 Attendance Report — {course.code}: {course.title}</h2>
      <p>Total Sessions: <strong>{summary.totalSessions}</strong></p>
      {summary.summary.length === 0 ? (
        <div className="empty-state"><span>👨‍🎓</span><p>No students enrolled yet.</p></div>
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
            {summary.summary.map((s) => (
              <tr key={s.studentId}>
                <td>{s.studentName}</td>
                <td>{s.attended} / {s.totalSessions}</td>
                <td>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${s.percentage}%`, background: s.percentage >= 75 ? "#22c55e" : s.percentage >= 50 ? "#f59e0b" : "#ef4444" }} />
                    <span>{s.percentage}%</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${statusColor[s.status]}`}>
                    {s.status === "good" ? "Good" : s.status === "warning" ? "At Risk" : "Poor"}
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
