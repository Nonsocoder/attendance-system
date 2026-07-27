// ============================================================
// FILE: backend/controllers/userController.js
// PURPOSE: Admin functions for managing all users
// ============================================================

const { db } = require("../config/firebase");

// GET ALL USERS (Admin only)
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query; // Optional filter: ?role=student

    let query = db.collection("users");
    if (role) {
      query = query.where("role", "==", role);
    }

    const snapshot = await query.orderBy("createdAt", "desc").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data();
      // Never send passwords (Firebase handles this, but just in case)
      const { password, ...safeData } = data;
      return safeData;
    });

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users." });
  }
};

// GET A SINGLE USER BY ID
const getUserById = async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.json({ success: true, user: userDoc.data() });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch user." });
  }
};

// TOGGLE USER ACTIVE STATUS (Admin only)
const toggleUserStatus = async (req, res) => {
  try {
    const { uid } = req.params;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const currentStatus = userDoc.data().isActive;
    await db.collection("users").doc(uid).update({ isActive: !currentStatus });

    res.json({
      success: true,
      message: `User ${!currentStatus ? "activated" : "deactivated"} successfully.`,
      isActive: !currentStatus,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update user status." });
  }
};

module.exports = { getAllUsers, getUserById, toggleUserStatus };
