// ============================================================
// courseController.js - Manage Courses
// ------------------------------------------------------------
// Handles creating, listing, and enrolling in courses.
// Only lecturers/admins can create courses.
// Students can enroll in courses.
// ============================================================

const { db } = require("../config/firebase");

// ─────────────────────────────────────────
// CREATE a new course (Lecturer/Admin only)
// POST /api/courses
// ─────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const { title, code, department, description } = req.body;
    const lecturerId = req.user.id;
    const lecturerName = req.user.name;

    if (!title || !code) {
      return res.status(400).json({
        success: false,
        message: "Course title and code are required.",
      });
    }

    // Check if course code already exists
    const existing = await db.collection("courses").where("code", "==", code).get();
    if (!existing.empty) {
      return res.status(409).json({
        success: false,
        message: `Course code "${code}" already exists.`,
      });
    }

    const newCourse = {
      title,
      code: code.toUpperCase(),
      department: department || "",
      description: description || "",
      lecturerId,
      lecturerName,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const courseRef = await db.collection("courses").add(newCourse);

    res.status(201).json({
      success: true,
      message: "Course created successfully!",
      course: { id: courseRef.id, ...newCourse },
    });
  } catch (error) {
    console.error("Create course error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────
// GET ALL COURSES
// GET /api/courses
// ─────────────────────────────────────────
const getAllCourses = async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = db.collection("courses").where("isActive", "==", true);

    // Lecturers only see their own courses
    if (role === "lecturer") {
      query = query.where("lecturerId", "==", id);
    }
    const snapshot = await query.get();
    const courses = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error("Get courses error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────
// ENROLL a student in a course
// POST /api/courses/:courseId/enroll
// ─────────────────────────────────────────
const enrollStudent = async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    const studentName = req.user.name;

    // Check course exists
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }

    // Check if already enrolled
    const existing = await db
      .collection("enrollments")
      .where("courseId", "==", courseId)
      .where("studentId", "==", studentId)
      .get();

    if (!existing.empty) {
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course.",
      });
    }

    // Create enrollment
    const enrollment = {
      courseId,
      courseTitle: courseDoc.data().title,
      courseCode: courseDoc.data().code,
      studentId,
      studentName,
      enrolledAt: new Date().toISOString(),
    };

    const enrollRef = await db.collection("enrollments").add(enrollment);

    res.status(201).json({
      success: true,
      message: `Successfully enrolled in ${courseDoc.data().title}!`,
      enrollment: { id: enrollRef.id, ...enrollment },
    });
  } catch (error) {
    console.error("Enroll error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

// ─────────────────────────────────────────
// GET courses a student is enrolled in
// GET /api/courses/my-courses
// ─────────────────────────────────────────
const getMyCourses = async (req, res) => {
  try {
    const studentId = req.user.id;

    const enrollmentSnapshot = await db
      .collection("enrollments")
      .where("studentId", "==", studentId)
      .get();

    const courses = enrollmentSnapshot.docs.map((doc) => ({
      enrollmentId: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({ success: true, courses });
  } catch (error) {
    console.error("Get my courses error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { createCourse, getAllCourses, enrollStudent, getMyCourses };
