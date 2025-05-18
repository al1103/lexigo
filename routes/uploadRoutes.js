const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const { authenticateToken } = require("../middleware/auth");

// Upload a single file
router.post(
  "/file",
  authenticateToken,
  uploadController.handleSingleUpload,
  uploadController.uploadSingleFile
);

// Upload multiple files
router.post(
  "/files",
  authenticateToken,
  uploadController.handleMultipleUploads,
  uploadController.uploadMultipleFiles
);

// Delete a file
router.delete(
  "/file",
  authenticateToken,
    uploadController.deleteFile
);

module.exports = router;
