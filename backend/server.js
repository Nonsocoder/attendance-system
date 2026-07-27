// ============================================================
// server.js - The Entry Point of our Backend
// ------------------------------------------------------------
// This file:
//   1. Sets up the Express web server
//   2. Configures middleware (CORS, JSON parsing, etc.)
//   3. Connects all our routes
//   4. Starts listening for requests
//
// Run this with:  npm run dev
// ============================================================

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

// ─── MIDDLEWARE ───────────────────────────────────────────
// These run on EVERY request before hitting any route

// CORS: Allow requests from our React frontend
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Parse incoming JSON request bodies
app.use(express.json());

// Parse URL-encoded form data
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────
// Mount each router at its base path
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/courses", require("./routes/courseRoutes"));
app.use("/api/attendance", require("./routes/attendanceRoutes"));

// ─── HEALTH CHECK ─────────────────────────────────────────
// Visit http://localhost:5000/api/health to verify server is running
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Attendance Management System API is running!",
    timestamp: new Date().toISOString(),
  });
});

// ─── 404 HANDLER ──────────────────────────────────────────
// If no route matched, return a 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.path} not found.` });
});

// ─── GLOBAL ERROR HANDLER ─────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "An unexpected error occurred." });
});

// ─── START SERVER ─────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════╗
  ║  🎓 Attendance System Backend          ║
  ║  Running at http://localhost:${PORT}     ║
  ║  Environment: ${process.env.NODE_ENV || "development"}         ║
  ╚════════════════════════════════════════╝
  `);
});

module.exports = app;
