const express = require('express');
const router = express.Router();
const speakingController = require('../controllers/speakingController');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');

// Configure multer for audio uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

// Speaking session routes
router.get('/words', authenticateToken, speakingController.getWordsForSpeaking);
router.post('/start-session', authenticateToken, speakingController.startSpeakingSession);
router.post('/compare-pronunciation', authenticateToken, upload.single('audio'), speakingController.comparePronunciation);
// router.post('/complete-session', authenticateToken, speakingController.completeSpeakingSession);
router.get('/levels', authenticateToken, speakingController.getSpeakingLevels);

// Lấy chi tiết level với words
router.get('/levels/:level_code', authenticateToken, speakingController.getSpeakingLevelDetail);

// Bắt đầu speaking session
router.post('/start-session', authenticateToken, speakingController.startSpeakingSession);

// History and stats routes
router.get('/history', authenticateToken, speakingController.getSpeakingHistory);
router.get('/stats', authenticateToken, speakingController.getSpeakingStats);

module.exports = router;
