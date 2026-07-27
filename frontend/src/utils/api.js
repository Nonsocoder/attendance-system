// ============================================================
// api.js - Centralized API Communication
// ------------------------------------------------------------
// All HTTP requests to our backend go through this file.
// It automatically attaches the auth token to every request.
// ============================================================

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

// Helper: get token from localStorage
const getToken = () => localStorage.getItem("token");

// Generic request function
const request = async (endpoint, options = {}) => {
  const token = getToken();

  const config = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
};

// ─── AUTH ───────────────────────────────────────────────
export const authAPI = {
  register: (userData) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(userData) }),
  login: (credentials) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(credentials) }),
  getProfile: () => request("/auth/profile"),
};

// ─── COURSES ───────────────────────────────────────────
export const courseAPI = {
  getAll: () => request("/courses"),
  create: (courseData) =>
    request("/courses", { method: "POST", body: JSON.stringify(courseData) }),
  getMyCourses: () => request("/courses/my-courses"),
  enroll: (courseId) =>
    request(`/courses/${courseId}/enroll`, { method: "POST" }),
};

// ─── ATTENDANCE ────────────────────────────────────────
export const attendanceAPI = {
  createSession: (sessionData) =>
    request("/attendance/session", { method: "POST", body: JSON.stringify(sessionData) }),
  markAttendance: (data) =>
    request("/attendance/mark", { method: "POST", body: JSON.stringify(data) }),
  getSessionAttendance: (sessionId) =>
    request(`/attendance/session/${sessionId}`),
  getCourseSessions: (courseId) =>
    request(`/attendance/sessions/${courseId}`),
  getMyAttendance: () => request("/attendance/my-attendance"),
  getCourseSummary: (courseId) => request(`/attendance/summary/${courseId}`),
};
