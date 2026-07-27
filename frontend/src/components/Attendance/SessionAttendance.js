import React, { useState, useEffect } from "react";
import { attendanceAPI } from "../../utils/api";

const SessionAttendance = ({ sessionId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await attendanceAPI.getSessionAttendance(sessionId);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sessionId]);

  if (loading) return <div className="loading">Loading...</div>;
  if (!data) return <div className="alert alert-error">Could not load data.</div>;

  return (
    <div className="card">
      <h2>Session: {data.session.topic}</h2>
      <div className="stats-row">
        <span>Present: <strong>{data.summary.present}</strong></span>
        <span>Enrolled: <strong>{data.summary.totalEnrolled}</strong></span>
        <span>Attendance: <strong>{data.summary.percentage}%</strong></span>
      </div>
      <table className="data-table">
        <thead><tr><th>Student Name</th><th>Time Marked</th><th>Status</th></tr></thead>
        <tbody>
          {data.attendance.map((a) => (
            <tr key={a.id}>
              <td>{a.studentName}</td>
              <td>{new Date(a.markedAt).toLocaleTimeString()}</td>
              <td><span className="badge badge-success">Present</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SessionAttendance;
