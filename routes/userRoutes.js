const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/auth");

// Public routes
router.post("/register", userController.register);
router.post("/verify-registration", userController.verifyRegistration);
router.post("/login", userController.login);
router.get("/avatars", userController.getAvatars);

// Forgot password routes (public)
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);

// OTP verification route (public)
router.post("/verify-otp", userController.verifyOTP);

// Protected routes
router.get("/profile", authenticateToken, userController.getProfile);
router.put("/profile", authenticateToken, userController.updateProfile);
router.post("/change-password", authenticateToken, userController.changePassword);

module.exports = router;
