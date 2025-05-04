const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  handleNewMessage,
  handleImageAndPrompt,
  promptAnswer,
  speechToText,
} = require("../controllers/googleGenerativeAI");

// Set up multer for file upload
const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

router.post("/chat", handleNewMessage);
router.post("/image-prompt", upload.single("image"), handleImageAndPrompt);
router.post("/promptAnswer", promptAnswer);
router.post("/speech-to-text", upload.single("audio"), speechToText);

module.exports = router;
