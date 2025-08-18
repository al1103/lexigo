const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { authenticateToken } = require("../middleware/auth");

// Public routes
router.post("/register", userController.register);
router.post("/verify-registration", userController.verifyRegistration);
router.post("/login", userController.login);
router.get("/avatars", userController.getAvatars);

// Protected routes
router.get("/profile", authenticateToken, userController.getProfile);
router.put("/profile", authenticateToken, userController.updateProfile);
router.post("/change-password", authenticateToken, userController.changePassword);

module.exports = router;
