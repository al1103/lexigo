const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { auth, adminAuth } = require("../middleware/roleAuth");
const upload = require("../middleware/multer");

// Public routes
router.post("/register", userController.register);
router.post("/verify-registration", userController.verifyRegistration);
router.post("/login", userController.login);
router.post("/forgot-password", userController.forgotPassword);
router.post("/reset-password", userController.resetPassword);
router.post("/token", userController.token);

// Protected routes
router.get("/me", auth, userController.getUserProfile);
router.put("/me", auth, userController.updateUserProfile);

// Referral and wallet routes
router.get("/referrals", auth, userController.getReferralInfo);
router.get("/referrals/share", auth, userController.getReferralShareContent);
router.get("/referrals/network", auth, userController.getReferralNetwork);
router.get("/wallet/transactions", auth, userController.getWalletTransactions);
router.post("/wallet/withdraw", auth, userController.withdrawFromWallet);

// Upload routes
router.post(
  "/upload/avatar",
  auth,
  upload.single("avatar"),
  userController.uploadAvatar
);

// Admin routes
router.put(
  "/admin/referrals/rates",
  adminAuth,
  userController.updateCommissionRates
);

module.exports = router;
