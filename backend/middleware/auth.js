// ============================================================
// auth.js - Authentication Middleware
// ------------------------------------------------------------
// Middleware runs BEFORE your route handler.
// This one checks: "Does this request have a valid login token?"
// If yes → allow the request through
// If no  → block it and return an error
//
// Every protected route (like marking attendance, viewing
// reports) will use this middleware.
// ============================================================

const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  // Get the token from the request header
  // Frontend sends it as: Authorization: Bearer <token>
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Extract just the token part

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided. Please log in.",
    });
  }

  try {
    const JWT_SECRET = process.env.JWT_SECRET || "default_jwt_secret_key_12345";
    const decoded = jwt.verify(token, JWT_SECRET);

    // Attach the decoded user info to the request
    // Now any route handler can access req.user to know who is making the request
    req.user = decoded;

    next(); // Move on to the actual route handler
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

// Role-based middleware factory
// Usage: requireRole("lecturer") or requireRole("admin")
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Not authenticated." });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const normalizedRoles = roles.map((r) => r.toLowerCase());

    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}`,
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };
