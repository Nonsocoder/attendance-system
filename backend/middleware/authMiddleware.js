// ============================================================
// FILE: backend/middleware/authMiddleware.js
// PURPOSE: Protects routes so only logged-in users can access them.
// When a user logs in via Firebase, they get a "token" (like a 
// temporary key). This middleware checks that token on every
// protected request to verify the user is who they say they are.
// ============================================================

const { auth, db } = require("../config/firebase");

// -------------------------------------------------------
// MIDDLEWARE: verifyToken
// Checks if the user has a valid Firebase ID token
// Usage: Add "verifyToken" to any route you want to protect
// -------------------------------------------------------
const verifyToken = async (req, res, next) => {
  try {
    // The token is sent in the request header like:
    // Authorization: "Bearer eyJhbGci..."
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    // Extract just the token part (remove "Bearer ")
    const token = authHeader.split(" ")[1];

    // Ask Firebase to verify the token is valid and not expired
    const decodedToken = await auth.verifyIdToken(token);

    // Fetch the user's full profile from our Firestore database
    const userDoc = await db.collection("users").doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "User profile not found in database.",
      });
    }

    // Attach user info to the request object
    // Now any route after this can access req.user
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      ...userDoc.data(),
    };

    // Move to the next middleware or route handler
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

// -------------------------------------------------------
// MIDDLEWARE: requireRole
// Checks that the logged-in user has a specific role
// Usage: requireRole("admin") or requireRole("lecturer")
// Always use AFTER verifyToken
// -------------------------------------------------------
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires one of these roles: ${roles.join(", ")}`,
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };
