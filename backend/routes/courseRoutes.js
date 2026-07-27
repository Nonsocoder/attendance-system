const express = require("express");
const router = express.Router();
const {
  createCourse,
  getAllCourses,
  enrollStudent,
  getMyCourses,
} = require("../controllers/courseController");
const { verifyToken, requireRole } = require("../middleware/auth");

// All course routes require login
router.use(verifyToken);

router.get("/", getAllCourses);
router.post("/", requireRole("lecturer", "admin"), createCourse);
router.get("/my-courses", requireRole("student"), getMyCourses);
router.post("/:courseId/enroll", requireRole("student"), enrollStudent);

module.exports = router;
