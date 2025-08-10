const express = require('express');
const router = express.Router();
const speakingController = require('../controllers/speakingController');
const { authenticateToken } = require('../middleware/auth');
const { adminAuth } = require('../middleware/roleAuth');
const multer = require('multer');

// Configure multer for audio uploads
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    // Accept audio files only
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  }
});

// Speaking levels and words routes
router.get('/levels', authenticateToken, speakingController.getSpeakingLevels);
router.get('/words', authenticateToken, speakingController.getWordsForSpeaking);
// Speaking session routes
router.post('/start', authenticateToken, speakingController.startSpeakingSession);
router.post('/submit-result', authenticateToken, speakingController.submitSpeakingResult);
router.post('/complete-session', authenticateToken, speakingController.completeSpeakingSession);

// Pronunciation comparison route
router.post('/compare-pronunciation', authenticateToken, upload.single('audio'), speakingController.comparePronunciation);

// History and stats routes
router.get('/history', authenticateToken, speakingController.getSpeakingHistory);
router.get('/stats', authenticateToken, speakingController.getSpeakingStats);

// ADMIN: Lấy tất cả speaking sessions
router.get('/admin/sessions', adminAuth, speakingController.getAllSpeakingSessions);
// ADMIN: Xóa speaking session
router.delete('/admin/session/:id', adminAuth, speakingController.deleteSpeakingSession);
// ADMIN: Thêm từ mới
router.post('/admin/word', adminAuth, speakingController.createWord);
// ADMIN: Sửa từ
router.put('/admin/word/:id', adminAuth, speakingController.updateWord);
// ADMIN: Xóa từ
router.delete('/admin/word/:id', adminAuth, speakingController.deleteWord);

module.exports = router;
