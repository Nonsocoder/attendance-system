// ============================================================
// FILE: backend/controllers/sessionController.js
// PURPOSE: This is the HEART of the QR attendance system.
// A "session" = one lecture class meeting.
// The lecturer creates a session → system generates a QR code →
// students scan it → attendance is recorded.
// ============================================================

const { db } = require("../config/firebase");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

const QR_EXPIRY_MINUTES = parseInt(process.env.QR_EXPIRY_MINUTES) || 10;

// -------------------------------------------------------
// CREATE A SESSION + GENERATE QR CODE (Lecturer only)
// POST /api/sessions
// Body: { courseId, topic, venue, scheduledAt }
// -------------------------------------------------------
const createSession = async (req, res) => {
  try {
    const { courseId, topic, venue } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "courseId is required.",
      });
    }

    // Verify the course exists and belongs to this lecturer
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    const courseData = courseDoc.data();
    if (courseData.lecturerId !== req.user.uid && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only create sessions for your own courses.",
      });
    }

    // Generate a unique session ID
    const sessionId = uuidv4();

    // QR expiry time: current time + QR_EXPIRY_MINUTES
    const now = new Date();
    const expiresAt = new Date(now.getTime() + QR_EXPIRY_MINUTES * 60 * 1000);

    // The QR code will encode this payload
    // When students scan it, their app reads this data
    const qrPayload = JSON.stringify({
      sessionId,
      courseId,
      courseCode: courseData.code,
      expiresAt: expiresAt.toISOString(),
      // Secret token to prevent manual fake attendance
      token: uuidv4(),
    });

    // Generate the actual QR code image as a base64 data URL
    // This means we can display it directly in an <img> tag
    const qrCodeDataURL = await QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
      color: {
        dark: "#1a1a2e",   // Dark blue dots
        light: "#ffffff",   // White background
      },
    });

    // Save session to database
    const sessionData = {
      id: sessionId,
      courseId,
      courseCode: courseData.code,
      courseName: courseData.name,
      lecturerId: req.user.uid,
      lecturerName: req.user.name,
      topic: topic || "Lecture",
      venue: venue || "",
      qrCode: qrCodeDataURL,       // The actual QR image (base64)
      qrPayload,                    // The raw data encoded in QR
      expiresAt: expiresAt.toISOString(),
      createdAt: now.toISOString(),
      isActive: true,               // QR is active (not yet expired)
      attendanceCount: 0,
      totalEnrolled: courseData.enrollmentCount,
    };

    await db.collection("sessions").doc(sessionId).set(sessionData);

    console.log(`✅ Session created for ${courseData.code} - expires at ${expiresAt}`);

    res.status(201).json({
      success: true,
      message: `Session created! QR code expires in ${QR_EXPIRY_MINUTES} minutes.`,
      session: {
        id: sessionId,
        courseCode: courseData.code,
        courseName: courseData.name,
        topic: sessionData.topic,
        venue: sessionData.venue,
        qrCode: qrCodeDataURL,
        expiresAt: expiresAt.toISOString(),
        expiresInMinutes: QR_EXPIRY_MINUTES,
      },
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create session.",
    });
  }
};

// -------------------------------------------------------
// GET ALL SESSIONS FOR A COURSE
// GET /api/sessions/course/:courseId
// -------------------------------------------------------
const getSessionsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;

    const snapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .orderBy("createdAt", "desc")
      .get();

    const sessions = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Don't send the QR code image in list view (too much data)
      const { qrCode, qrPayload, ...sessionWithoutQR } = data;
      return {
        ...sessionWithoutQR,
        hasExpired: new Date() > new Date(data.expiresAt),
      };
    });

    res.json({
      success: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Get sessions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch sessions.",
    });
  }
};

// -------------------------------------------------------
// GET A SINGLE SESSION (WITH QR CODE)
// GET /api/sessions/:sessionId
// -------------------------------------------------------
const getSessionById = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    const session = sessionDoc.data();
    const now = new Date();
    const expiresAt = new Date(session.expiresAt);
    const hasExpired = now > expiresAt;

    res.json({
      success: true,
      session: {
        ...session,
        hasExpired,
        minutesRemaining: hasExpired
          ? 0
          : Math.round((expiresAt - now) / 60000),
      },
    });
  } catch (error) {
    console.error("Get session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session.",
    });
  }
};

// -------------------------------------------------------
// REFRESH QR CODE (Reset the timer)
// PATCH /api/sessions/:sessionId/refresh-qr
// -------------------------------------------------------
const refreshQRCode = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const sessionDoc = await db.collection("sessions").doc(sessionId).get();

    if (!sessionDoc.exists) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    const session = sessionDoc.data();

    // Only the lecturer who owns this session can refresh it
    if (session.lecturerId !== req.user.uid && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You can only refresh QR codes for your own sessions.",
      });
    }

    // Generate new expiry time
    const now = new Date();
    const expiresAt = new Date(now.getTime() + QR_EXPIRY_MINUTES * 60 * 1000);

    // New QR payload with fresh token
    const qrPayload = JSON.stringify({
      sessionId,
      courseId: session.courseId,
      courseCode: session.courseCode,
      expiresAt: expiresAt.toISOString(),
      token: uuidv4(),
    });

    const qrCodeDataURL = await QRCode.toDataURL(qrPayload, {
      width: 300,
      margin: 2,
      color: { dark: "#1a1a2e", light: "#ffffff" },
    });

    await db.collection("sessions").doc(sessionId).update({
      qrCode: qrCodeDataURL,
      qrPayload,
      expiresAt: expiresAt.toISOString(),
      isActive: true,
      refreshedAt: now.toISOString(),
    });

    res.json({
      success: true,
      message: `QR code refreshed! New expiry: ${QR_EXPIRY_MINUTES} minutes.`,
      qrCode: qrCodeDataURL,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Refresh QR error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh QR code.",
    });
  }
};

// -------------------------------------------------------
// CLOSE/END A SESSION
// PATCH /api/sessions/:sessionId/close
// -------------------------------------------------------
const closeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    await db.collection("sessions").doc(sessionId).update({
      isActive: false,
      closedAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: "Session closed. No more attendance can be marked.",
    });
  } catch (error) {
    console.error("Close session error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to close session.",
    });
  }
};

module.exports = {
  createSession,
  getSessionsByCourse,
  getSessionById,
  refreshQRCode,
  closeSession,
};
