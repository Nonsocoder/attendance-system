const express = require("express");
const router = express.Router();
const {
  createSession,
  markAttendance,
  getSessionAttendance,
  getMyAttendance,
  getCourseSummary,
  getCourseSessions,
  getLecturerSessions,
} = require("../controllers/attendanceController");
const { verifyToken, requireRole } = require("../middleware/auth");

router.use(verifyToken);

// Lecturer routes
router.get("/sessions", requireRole("lecturer", "admin"), getLecturerSessions);
router.get("/my-sessions", requireRole("lecturer", "admin"), getLecturerSessions);
router.post("/session", requireRole("lecturer", "admin"), createSession);
router.get("/session/:sessionId", requireRole("lecturer", "admin"), getSessionAttendance);
router.get("/sessions/:courseId", requireRole("lecturer", "admin"), getCourseSessions);
router.get("/summary/:courseId", requireRole("lecturer", "admin"), getCourseSummary);

// Student routes
router.post("/mark", requireRole("student"), markAttendance);
router.get("/my-attendance", requireRole("student"), getMyAttendance);

module.exports = router;
