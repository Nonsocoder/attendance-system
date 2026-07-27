// ============================================================
// attendanceController.js - The Heart of the System
// ------------------------------------------------------------
// This handles everything attendance-related:
//   1. createSession()  → Lecturer creates a class session + QR code
//   2. markAttendance() → Student scans QR to mark present
//   3. getSessionAttendance() → View who attended a session
//   4. getStudentAttendance() → View a student's attendance history
//   5. getAttendanceSummary() → Stats (% attendance per student)
// ============================================================

const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/firebase");

// ─────────────────────────────────────────
// CREATE a session + generate QR code
// POST /api/attendance/session
// (Lecturer only)
// ─────────────────────────────────────────
const createSession = async (req, res) => {
  try {
    const { courseId, topic, durationMinutes } = req.body;
    const lecturerId = req.user.id;

    if (!courseId) {
      return res.status(400).json({ success: false, message: "courseId is required." });
    }

    // Verify the lecturer owns this course
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists || courseDoc.data().lecturerId !== lecturerId) {
      return res.status(403).json({
        success: false,
        message: "You can only create sessions for your own courses.",
      });
    }

    // Generate a unique token for this session
    // This is what gets embedded in the QR code
    const sessionToken = uuidv4();

    // Session expires after durationMinutes (default 15 mins)
    const duration = durationMinutes || 15;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000).toISOString();

    const session = {
      courseId,
      courseTitle: courseDoc.data().title,
      courseCode: courseDoc.data().code,
      lecturerId,
      lecturerName: req.user.name,
      topic: topic || "Lecture",
      sessionToken,
      expiresAt,
      durationMinutes: duration,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // Save session to Firestore
    const sessionRef = await db.collection("sessions").add(session);
    const sessionId = sessionRef.id;

    // Create QR code data — this is what the QR code encodes
    // It contains all info needed to mark attendance
    const qrData = JSON.stringify({
      sessionId,
      sessionToken,
      courseId,
      expiresAt,
    });

    // Generate QR code as a base64 PNG image
    // This can be displayed directly in the browser as <img src="...">
    const qrCodeImage = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",  // High error correction — scannable even if partially damaged
      margin: 2,
      width: 400,
      color: {
        dark: "#1a1a2e",   // QR code color
        light: "#ffffff",  // Background color
      },
    });

    res.status(201).json({
      success: true,
      message: "Session created! QR code is ready.",
      session: { id: sessionId, ...session },
      qrCode: qrCodeImage,  // base64 image string
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────
// MARK ATTENDANCE by scanning QR code
// POST /api/attendance/mark
// (Student only)
// ─────────────────────────────────────────
const markAttendance = async (req, res) => {
  try {
    const { sessionId, sessionToken } = req.body;
    const studentId = req.user.id;
    const studentName = req.user.name;

    if (!sessionId || !sessionToken) {
      return res.status(400).json({
        success: false,
        message: "sessionId and sessionToken are required.",
      });
    }

    // 1. Find the session in Firestore
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    const sessionData = sessionDoc.data();

    // 2. Verify the session token matches (prevents fake QR codes)
    if (sessionData.sessionToken !== sessionToken) {
      return res.status(403).json({ success: false, message: "Invalid QR code." });
    }

    // 3. Check if session has expired
    const now = new Date();
    const expiresAt = new Date(sessionData.expiresAt);

    if (now > expiresAt) {
      return res.status(410).json({
        success: false,
        message: `QR code expired at ${expiresAt.toLocaleTimeString()}. Contact your lecturer.`,
      });
    }

    // 4. Check if student is enrolled in this course
    const enrollment = await db
      .collection("enrollments")
      .where("courseId", "==", sessionData.courseId)
      .where("studentId", "==", studentId)
      .get();

    if (enrollment.empty) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course.",
      });
    }

    // 5. Check if student already marked attendance for this session
    const existingRecord = await db
      .collection("attendance")
      .where("sessionId", "==", sessionId)
      .where("studentId", "==", studentId)
      .get();

    if (!existingRecord.empty) {
      return res.status(409).json({
        success: false,
        message: "You have already marked attendance for this session.",
      });
    }

    // 6. Mark attendance — all checks passed!
    const attendanceRecord = {
      sessionId,
      courseId: sessionData.courseId,
      courseTitle: sessionData.courseTitle,
      courseCode: sessionData.courseCode,
      studentId,
      studentName,
      topic: sessionData.topic,
      markedAt: new Date().toISOString(),
      status: "present",
    };

    const attendanceRef = await db.collection("attendance").add(attendanceRecord);

    res.status(201).json({
      success: true,
      message: `✅ Attendance marked for ${sessionData.courseTitle}!`,
      record: { id: attendanceRef.id, ...attendanceRecord },
    });
  } catch (error) {
    console.error("Mark attendance error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────
// GET attendance for a specific session
// GET /api/attendance/session/:sessionId
// (Lecturer only)
// ─────────────────────────────────────────
const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const sessionDoc = await db.collection("sessions").doc(sessionId).get();
    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    // Get all attendance records for this session
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("sessionId", "==", sessionId)
      .get();

    const records = attendanceSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Also get total enrolled students for context
    const enrolledSnapshot = await db
      .collection("enrollments")
      .where("courseId", "==", sessionDoc.data().courseId)
      .get();

    res.status(200).json({
      success: true,
      session: { id: sessionId, ...sessionDoc.data() },
      attendance: records,
      summary: {
        present: records.length,
        totalEnrolled: enrolledSnapshot.size,
        percentage: enrolledSnapshot.size
          ? Math.round((records.length / enrolledSnapshot.size) * 100)
          : 0,
      },
    });
  } catch (error) {
    console.error("Get session attendance error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────
// GET a student's attendance history
// GET /api/attendance/my-attendance
// (Student only)
// ─────────────────────────────────────────
const getMyAttendance = async (req, res) => {
  try {
    const studentId = req.user.id || req.user.uid;

    const snapshot = await db
      .collection("attendance")
      .where("studentId", "==", studentId)
      .get();

    const records = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.markedAt || 0) - new Date(a.markedAt || 0));

    res.status(200).json({ success: true, records });
  } catch (error) {
    console.error("Get my attendance error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────
// GET attendance summary/stats for a course
// GET /api/attendance/summary/:courseId
// ─────────────────────────────────────────
const getCourseSummary = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get all sessions for this course
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();

    const totalSessions = sessionsSnapshot.size;

    // Get all enrolled students
    const enrollmentsSnapshot = await db
      .collection("enrollments")
      .where("courseId", "==", courseId)
      .get();

    // For each student, count how many sessions they attended
    const summary = [];

    for (const enrollment of enrollmentsSnapshot.docs) {
      const { studentId, studentName } = enrollment.data();

      const attendanceSnapshot = await db
        .collection("attendance")
        .where("courseId", "==", courseId)
        .where("studentId", "==", studentId)
        .get();

      const attended = attendanceSnapshot.size;
      const percentage = totalSessions
        ? Math.round((attended / totalSessions) * 100)
        : 0;

      summary.push({
        studentId,
        studentName,
        attended,
        totalSessions,
        percentage,
        status: percentage >= 75 ? "good" : percentage >= 50 ? "warning" : "poor",
      });
    }

    // Sort by percentage descending
    summary.sort((a, b) => b.percentage - a.percentage);

    res.status(200).json({ success: true, courseId, totalSessions, summary });
  } catch (error) {
    console.error("Get course summary error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// GET all sessions for a course
const getCourseSessions = async (req, res) => {
  try {
    const { courseId } = req.params;

    const snapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();

    const sessions = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    res.status(200).json({ success: true, sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  createSession,
  markAttendance,
  getSessionAttendance,
  getMyAttendance,
  getCourseSummary,
  getCourseSessions,
};
