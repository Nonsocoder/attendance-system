// Routes define the URL paths and which controller handles them
const express = require("express");
const router = express.Router();
const { register, login, getProfile } = require("../controllers/authController");
const { verifyToken } = require("../middleware/auth");

router.post("/register", register);
router.post("/login", login);
router.get("/profile", verifyToken, getProfile); // Protected: must be logged in

module.exports = router;
