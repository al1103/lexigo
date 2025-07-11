const express = require('express');
const QuoteController = require('../controllers/quoteController');
const { adminAuth } = require('../middleware/roleAuth');

const router = express.Router();

// Public route - lấy quote of the day
router.get('/daily', QuoteController.getDailyQuote);

// ADMIN: Lấy tất cả quotes
router.get('/admin', adminAuth, QuoteController.getAllQuotes);
// ADMIN: Thêm quote mới
router.post('/admin', adminAuth, QuoteController.createQuote);
// ADMIN: Sửa quote
router.put('/admin/:id', adminAuth, QuoteController.updateQuote);
// ADMIN: Xóa quote
router.delete('/admin/:id', adminAuth, QuoteController.deleteQuote);

module.exports = router;
