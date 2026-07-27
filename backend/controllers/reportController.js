// ============================================================
// FILE: backend/controllers/reportController.js
// PURPOSE: Generates attendance reports and statistics.
// Reports can be viewed in the dashboard or exported as CSV.
// ============================================================

const { db } = require("../config/firebase");

// -------------------------------------------------------
// GET FULL COURSE ATTENDANCE REPORT (Lecturer/Admin)
// GET /api/reports/course/:courseId
// Returns attendance stats for every student in a course
// -------------------------------------------------------
const getCourseReport = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Get course info
    const courseDoc = await db.collection("courses").doc(courseId).get();
    if (!courseDoc.exists) {
      return res.status(404).json({ success: false, message: "Course not found." });
    }
    const course = courseDoc.data();

    // Get all sessions for this course
    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();
    const sessions = sessionsSnapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    const totalSessions = sessions.length;

    if (totalSessions === 0) {
      return res.json({
        success: true,
        report: { course, totalSessions: 0, students: [] },
      });
    }

    // Get all attendance records for this course
    const attendanceSnapshot = await db
      .collection("attendance")
      .where("courseId", "==", courseId)
      .get();
    const allAttendance = attendanceSnapshot.docs.map((doc) => doc.data());

    // Get all enrolled students' details
    const studentReports = await Promise.all(
      course.enrolledStudents.map(async (studentId) => {
        const studentDoc = await db.collection("users").doc(studentId).get();
        const student = studentDoc.data();

        // Count how many sessions this student attended
        const studentAttendance = allAttendance.filter(
          (a) => a.studentId === studentId && a.status === "present"
        );
        const totalPresent = studentAttendance.length;
        const percentage = Math.round((totalPresent / totalSessions) * 100);

        return {
          studentId,
          name: student?.name || "Unknown",
          matricNumber: student?.matricNumber || "N/A",
          email: student?.email || "N/A",
          totalPresent,
          totalAbsent: totalSessions - totalPresent,
          totalSessions,
          attendancePercentage: percentage,
          // 75% is the typical minimum in Nigerian universities
          isEligible: percentage >= 75,
          riskLevel:
            percentage >= 75 ? "good" : percentage >= 50 ? "warning" : "danger",
        };
      })
    );

    // Sort by attendance percentage (lowest first, so at-risk students appear first)
    studentReports.sort((a, b) => a.attendancePercentage - b.attendancePercentage);

    res.json({
      success: true,
      report: {
        course: {
          id: courseId,
          name: course.name,
          code: course.code,
          lecturerName: course.lecturerName,
          semester: course.semester,
        },
        totalSessions,
        totalEnrolled: course.enrollmentCount,
        sessions: sessions.map((s) => ({
          id: s.id,
          topic: s.topic,
          date: s.createdAt,
          attendanceCount: s.attendanceCount,
        })),
        students: studentReports,
        summary: {
          averageAttendance:
            studentReports.length > 0
              ? Math.round(
                  studentReports.reduce(
                    (sum, s) => sum + s.attendancePercentage,
                    0
                  ) / studentReports.length
                )
              : 0,
          eligibleCount: studentReports.filter((s) => s.isEligible).length,
          atRiskCount: studentReports.filter((s) => !s.isEligible).length,
        },
      },
    });
  } catch (error) {
    console.error("Get course report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate course report.",
    });
  }
};

// -------------------------------------------------------
// GET STUDENT'S FULL REPORT ACROSS ALL COURSES
// GET /api/reports/student/:studentId
// -------------------------------------------------------
const getStudentReport = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Students can only view their own reports
    if (req.user.role === "student" && (req.user.id || req.user.uid) !== studentId) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own reports.",
      });
    }

    const studentDoc = await db.collection("users").doc(studentId).get();
    const student = studentDoc.data();

    // Get all courses the student is enrolled in
    const coursesSnapshot = await db
      .collection("courses")
      .where("enrolledStudents", "array-contains", studentId)
      .where("isActive", "==", true)
      .get();
    const courses = coursesSnapshot.docs.map((doc) => doc.data());

    // Build report for each course
    const courseReports = await Promise.all(
      courses.map(async (course) => {
        const sessionsSnapshot = await db
          .collection("sessions")
          .where("courseId", "==", course.id)
          .get();
        const totalSessions = sessionsSnapshot.size;

        const attendanceSnapshot = await db
          .collection("attendance")
          .where("studentId", "==", studentId)
          .where("courseId", "==", course.id)
          .where("status", "==", "present")
          .get();
        const totalPresent = attendanceSnapshot.size;

        const percentage =
          totalSessions > 0
            ? Math.round((totalPresent / totalSessions) * 100)
            : 0;

        return {
          courseId: course.id,
          courseName: course.name,
          courseCode: course.code,
          lecturerName: course.lecturerName,
          totalSessions,
          totalPresent,
          totalAbsent: totalSessions - totalPresent,
          attendancePercentage: percentage,
          isEligible: percentage >= 75,
        };
      })
    );

    res.json({
      success: true,
      report: {
        student: {
          id: studentId,
          name: student?.name,
          email: student?.email,
          matricNumber: student?.matricNumber,
          department: student?.department,
        },
        courses: courseReports,
        overallSummary: {
          totalCourses: courseReports.length,
          eligibleCourses: courseReports.filter((c) => c.isEligible).length,
          atRiskCourses: courseReports.filter((c) => !c.isEligible).length,
        },
      },
    });
  } catch (error) {
    console.error("Get student report error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate student report.",
    });
  }
};

// -------------------------------------------------------
// EXPORT COURSE ATTENDANCE AS CSV
// GET /api/reports/course/:courseId/export
// -------------------------------------------------------
const exportCourseCSV = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Reuse the getCourseReport logic
    const courseDoc = await db.collection("courses").doc(courseId).get();
    const course = courseDoc.data();

    const sessionsSnapshot = await db
      .collection("sessions")
      .where("courseId", "==", courseId)
      .get();
    const sessions = sessionsSnapshot.docs
      .map((doc) => doc.data())
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));

    const attendanceSnapshot = await db
      .collection("attendance")
      .where("courseId", "==", courseId)
      .get();
    const allAttendance = attendanceSnapshot.docs.map((doc) => doc.data());

    // Build CSV header
    const sessionHeaders = sessions
      .map((s) => `"${new Date(s.createdAt).toLocaleDateString()} - ${s.topic}"`)
      .join(",");
    let csv = `Name,Matric Number,Email,${sessionHeaders},Total Present,Total Sessions,Percentage,Eligible\n`;

    // Build each student's row
    for (const studentId of course.enrolledStudents) {
      const studentDoc = await db.collection("users").doc(studentId).get();
      const student = studentDoc.data();

      const sessionStatuses = sessions.map((session) => {
        const attended = allAttendance.some(
          (a) =>
            a.sessionId === session.id &&
            a.studentId === studentId &&
            a.status === "present"
        );
        return attended ? "P" : "A"; // P = Present, A = Absent
      });

      const totalPresent = sessionStatuses.filter((s) => s === "P").length;
      const percentage =
        sessions.length > 0
          ? Math.round((totalPresent / sessions.length) * 100)
          : 0;

      csv += `"${student?.name || ""}","${student?.matricNumber || ""}","${
        student?.email || ""
      }",${sessionStatuses.join(",")},${totalPresent},${sessions.length},${percentage}%,${
        percentage >= 75 ? "YES" : "NO"
      }\n`;
    }

    // Send as downloadable CSV file
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${course.code}_attendance_report.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error("Export CSV error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export CSV.",
    });
  }
};

// -------------------------------------------------------
// GET ADMIN DASHBOARD STATS
// GET /api/reports/admin/stats
// -------------------------------------------------------
const getAdminStats = async (req, res) => {
  try {
    const [usersSnap, coursesSnap, sessionsSnap, attendanceSnap] =
      await Promise.all([
        db.collection("users").get(),
        db.collection("courses").where("isActive", "==", true).get(),
        db.collection("sessions").get(),
        db.collection("attendance").get(),
      ]);

    const users = usersSnap.docs.map((d) => d.data());

    res.json({
      success: true,
      stats: {
        totalStudents: users.filter((u) => u.role === "student").length,
        totalLecturers: users.filter((u) => u.role === "lecturer").length,
        totalCourses: coursesSnap.size,
        totalSessions: sessionsSnap.size,
        totalAttendanceRecords: attendanceSnap.size,
      },
    });
  } catch (error) {
    console.error("Get admin stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics.",
    });
  }
};

module.exports = {
  getCourseReport,
  getStudentReport,
  exportCourseCSV,
  getAdminStats,
};
