// ============================================================
// courseController.js - Manage Courses
// ------------------------------------------------------------
// Handles creating, listing, and enrolling in courses.
// Only lecturers/admins can create courses.
// Students can enroll in courses.
// ============================================================

const { db, admin } = require("../config/firebase");

// ─────────────────────────────────────────
// CREATE a new course (Lecturer/Admin only)
// POST /api/courses
// ─────────────────────────────────────────
const createCourse = async (req, res) => {
  try {
    const { title, code, department, description } = req.body;
    const lecturerId = req.user.id || req.user.uid;
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
      name: title,
      code: code.toUpperCase(),
      department: department || "",
      description: description || "",
      lecturerId,
      lecturerName,
      enrolledStudents: [],
      enrollmentCount: 0,
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
    const { role, id, uid } = req.user;
    const userId = id || uid;
    let query = db.collection("courses");

    // Lecturers only see their own courses
    if (role && role.toLowerCase() === "lecturer") {
      query = query.where("lecturerId", "==", userId);
    }
    const snapshot = await query.get();
    const courses = snapshot.docs
      .map((doc) => ({ id: doc.id, ...doc.data() }))
      .filter((course) => course.isActive !== false);

    console.log(`[getAllCourses] role=${role} userId=${userId} total docs=${snapshot.size} after filter=${courses.length}`);

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
    const studentId = req.user.id || req.user.uid;
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
    const courseTitle = courseDoc.data().title || courseDoc.data().name || "";
    const enrollment = {
      courseId,
      courseTitle,
      courseCode: courseDoc.data().code,
      studentId,
      studentName,
      enrolledAt: new Date().toISOString(),
    };

    const enrollRef = await db.collection("enrollments").add(enrollment);

    // Sync enrolledStudents array and enrollmentCount on the course document
    await db.collection("courses").doc(courseId).update({
      enrolledStudents: admin.firestore.FieldValue.arrayUnion(studentId),
      enrollmentCount: admin.firestore.FieldValue.increment(1),
    }).catch((err) => console.warn("Could not update course enrollment arrays:", err.message));

    res.status(201).json({
      success: true,
      message: `Successfully enrolled in ${courseTitle}!`,
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
    const studentId = req.user.id || req.user.uid;

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

