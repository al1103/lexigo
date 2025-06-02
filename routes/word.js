const express = require("express");
const router = express.Router();
const wordController = require("../controllers/wordController");

// Lấy danh sách từ vựng với pagination
router.get("/", wordController.wordlearn);

// Lấy danh sách quiz
router.get("/quizzes", wordController.getQuizzes);

// Lấy chi tiết quiz theo ID
router.get("/quizzes/:id", wordController.getQuizById);

// Lấy câu hỏi ngẫu nhiên cho practice
router.get("/questions/random", wordController.getRandomQuestions);

module.exports = router;
