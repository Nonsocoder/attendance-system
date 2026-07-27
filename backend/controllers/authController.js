// ============================================================
// authController.js - Handles Registration & Login
// ------------------------------------------------------------
// Controllers contain the actual LOGIC for each route.
// This file handles everything related to user accounts:
//   - register()  → create a new account
//   - login()     → log in and get a token
//   - getProfile() → get logged-in user's info
// ============================================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { db } = require("../config/firebase");

// ─────────────────────────────────────────
// REGISTER a new user
// POST /api/auth/register
// ─────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role, studentId, department } = req.body;

    // 1. Check all required fields are present
    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide name, email, password and role.",
      });
    }

    // 2. Validate role — only these 3 roles are allowed
    const allowedRoles = ["student", "lecturer", "admin"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be: student, lecturer, or admin",
      });
    }

    // 3. Check if email already exists in Firestore
    const existingUser = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (!existingUser.empty) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
      });
    }

    // 4. Hash the password before saving (NEVER save plain text passwords!)
    // bcrypt adds a "salt" (random data) and hashes. The 12 means 2^12 rounds — very secure.
    const hashedPassword = await bcrypt.hash(password, 12);

    // 5. Build the user object to save
    const newUser = {
      name,
      email,
      password: hashedPassword,
      role,
      studentId: studentId || null,   // Only for students
      department: department || null,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // 6. Save user to Firestore's "users" collection
    const userRef = await db.collection("users").add(newUser);

    // 7. Create a JWT token so they're logged in immediately after registering
    const token = jwt.sign(
      { id: userRef.id, email, role, name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" } // Token valid for 7 days
    );

    // 8. Return success — don't send the password back!
    res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: {
        id: userRef.id,
        name,
        email,
        role,
        studentId,
        department,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};

// ─────────────────────────────────────────
// LOGIN an existing user
// POST /api/auth/login
// ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    // 1. Find the user by email in Firestore
    const userSnapshot = await db
      .collection("users")
      .where("email", "==", email)
      .get();

    if (userSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 2. Get the first (and should be only) matching user
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();

    // 3. Compare the provided password with the stored hashed password
    const isPasswordValid = await bcrypt.compare(password, userData.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password.",
      });
    }

    // 4. Check account is active
    if (!userData.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact admin.",
      });
    }

    // 5. Create JWT token
    const token = jwt.sign(
      { id: userDoc.id, email: userData.email, role: userData.role, name: userData.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // 6. Return token and safe user info
    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: {
        id: userDoc.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        studentId: userData.studentId,
        department: userData.department,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};

// ─────────────────────────────────────────
// GET PROFILE of logged-in user
// GET /api/auth/profile
// ─────────────────────────────────────────
const getProfile = async (req, res) => {
  try {
    // req.user is set by our verifyToken middleware
    const userDoc = await db.collection("users").doc(req.user.id).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const userData = userDoc.data();

    // Return everything except the password
    const { password, ...safeUser } = userData;

    res.status(200).json({
      success: true,
      user: { id: userDoc.id, ...safeUser },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = { register, login, getProfile };
