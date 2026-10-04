// ============================================================
// CreateSession.js - Lecturer creates a session & QR code
// ============================================================
import React, { useState, useEffect } from "react";
import { attendanceAPI } from "../../utils/api";
import SessionAttendance from "./SessionAttendance";

const CreateSession = ({ course, onSessionCreated, onViewAttendance }) => {
  const [form, setForm] = useState({ topic: "", durationMinutes: 15 });
  const [session, setSession] = useState(null);
  const [qrCode, setQrCode] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeLeft, setTimeLeft] = useState(null);
  const [selectedSessionId, setSelectedSessionId] = useState(null);

  useEffect(() => {
    loadSessions();
  }, [course.id]);

  // Countdown timer for the QR code
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, new Date(session.expiresAt) - new Date());
      const mins = Math.floor(remaining / 60000);
      const secs = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(remaining > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : "Expired");
      if (remaining === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [session]);

  const loadSessions = async () => {
    try {
      const data = await attendanceAPI.getCourseSessions(course.id);
      setSessions(data.sessions);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await attendanceAPI.createSession({
        courseId: course.id,
        topic: form.topic,
        durationMinutes: parseInt(form.durationMinutes),
      });
      setSession(data.session);
      setQrCode(data.qrCode);
      loadSessions();
      if (onSessionCreated) {
        onSessionCreated(data.session);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewAttendance = (sessionId) => {
    if (onViewAttendance) {
      onViewAttendance(sessionId);
    } else {
      setSelectedSessionId(sessionId);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>📋 Create New Session — {course.code}: {course.title}</h2>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleCreateSession}>
          <div className="form-row">
            <div className="form-group">
              <label>Topic / Lecture Title</label>
              <input
                type="text" placeholder="e.g. Introduction to Arrays"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>QR Code Duration (minutes)</label>
              <select
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? "Generating..." : "🎯 Generate QR Code"}
          </button>
        </form>
      </div>

      {/* Display QR Code */}
      {qrCode && session && (
        <div className="card qr-card">
          <h2>📱 QR Code — Show to Students</h2>
          <div className="qr-container">
            <img src={qrCode} alt="Attendance QR Code" className="qr-image" />
            <div className="qr-info">
              <h3>{course.code}: {course.title}</h3>
              <p>📖 Topic: <strong>{session.topic}</strong></p>
              <p>📅 {new Date(session.createdAt).toLocaleString()}</p>
              <div className={`qr-timer ${timeLeft === "Expired" ? "expired" : ""}`}>
                ⏱ {timeLeft === "Expired" ? "QR Code Expired" : `Expires in: ${timeLeft}`}
              </div>
              <p className="qr-hint">Students scan this with their phone to mark attendance</p>
              <button className="btn btn-secondary" onClick={() => window.print()}>
                🖨️ Print QR Code
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Past Sessions */}
      <div className="card">
        <h2>Past Sessions</h2>
        {sessions.length === 0 ? (
          <div className="empty-state"><span>📋</span><p>No sessions yet.</p></div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Topic</th><th>Date</th><th>Duration</th><th>Action</th></tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.topic}</td>
                  <td>{new Date(s.createdAt).toLocaleString()}</td>
                  <td>{s.durationMinutes} min</td>
                  <td>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleViewAttendance(s.id)}>
                      View Attendance
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Attendance Modal */}
      {selectedSessionId && (
        <div className="modal-overlay" onClick={() => setSelectedSessionId(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Session Attendance</h2>
              <button onClick={() => setSelectedSessionId(null)}>✕</button>
            </div>
            <div style={{ padding: "20px" }}>
              <SessionAttendance sessionId={selectedSessionId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSession;
