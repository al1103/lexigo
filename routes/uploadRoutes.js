const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const upload = require("../middleware/multer");
const { auth } = require("../middleware/roleAuth"); // Optional: authentication

// Public upload route - không yêu cầu đăng nhập
router.post("/image", upload.single("image"), uploadController.uploadImage);

// Protected upload route - yêu cầu đăng nhập
// router.post("/image", auth, upload.single("image"), uploadController.uploadImage);

module.exports = router;
