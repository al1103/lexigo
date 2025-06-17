require("dotenv").config();
const jwt = require("jsonwebtoken");
const { pool } = require("../config/database");
const { getPaginationParamsSimple } = require("../utils/pagination");

exports.wordlearn = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const { offset, limit: paginationLimit } = getPaginationParamsSimple(page, limit);

    // Đếm tổng số từ để có pagination chính xác
    const countQuery = `SELECT COUNT(*) as total FROM words WHERE is_active = TRUE`;
    const countResult = await pool.query(countQuery);
    const totalWords = parseInt(countResult.rows[0].total);

    const query = `
      SELECT w.id, w.word, w.pronunciation, w.meaning, w.definition,
             w.example_sentence, w.difficulty_level, w.audio_url, w.image_url,
             c.name as category_name, c.color as category_color
      FROM words w
      LEFT JOIN categories c ON w.category_id = c.id
      WHERE w.is_active = TRUE
      ORDER BY w.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [paginationLimit, offset]);

    res.status(200).json({
      status: "success",
      data: {
        words: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalWords,
          totalPages: Math.ceil(totalWords / paginationLimit),
          hasNext: (offset + paginationLimit) < totalWords,
          hasPrev: offset > 0
        },
      },
    });
  } catch (error) {
    console.error("Error fetching words:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch words",
    });
  }
};

// Lấy danh sách quiz
exports.getQuizzes = async (req, res) => {
  try {
    const { page = 1, limit = 10, lesson_id, quiz_type, difficulty } = req.query;
    const { offset, limit: paginationLimit } = getPaginationParamsSimple(page, limit);

    let whereConditions = ['q.is_active = TRUE'];
    let queryParams = [];
    let paramIndex = 1;

    if (lesson_id) {
      whereConditions.push(`q.lesson_id = $${paramIndex}`);
      queryParams.push(lesson_id);
      paramIndex++;
    }

    if (quiz_type) {
      whereConditions.push(`q.quiz_type = $${paramIndex}`);
      queryParams.push(quiz_type);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Đếm tổng số quiz
    const countQuery = `
      SELECT COUNT(*) as total
      FROM quizzes q
      LEFT JOIN lessons l ON q.lesson_id = l.id
      ${whereClause}
    `;
    const countResult = await pool.query(countQuery, queryParams);
    const totalQuizzes = parseInt(countResult.rows[0].total);

    const query = `
      SELECT q.id, q.title, q.description, q.quiz_type, q.time_limit,
             q.total_questions, q.passing_score,
             l.title as lesson_title, l.difficulty_level as lesson_difficulty
      FROM quizzes q
      LEFT JOIN lessons l ON q.lesson_id = l.id
      ${whereClause}
      ORDER BY q.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(paginationLimit, offset);
    const result = await pool.query(query, queryParams);

    res.status(200).json({
      status: "success",
      data: {
        quizzes: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalQuizzes,
          totalPages: Math.ceil(totalQuizzes / paginationLimit),
          hasNext: (offset + paginationLimit) < totalQuizzes,
          hasPrev: offset > 0
        },
      },
    });
  } catch (error) {
    console.error("Error fetching quizzes:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch quizzes",
    });
  }
};

// Lấy chi tiết quiz với câu hỏi
exports.getQuizById = async (req, res) => {
  try {
    const { id } = req.params;

    // Lấy thông tin quiz
    const quizQuery = `
      SELECT q.id, q.title, q.description, q.quiz_type, q.time_limit,
             q.total_questions, q.passing_score,
             l.title as lesson_title, l.difficulty_level
      FROM quizzes q
      LEFT JOIN lessons l ON q.lesson_id = l.id
      WHERE q.id = $1 AND q.is_active = TRUE
    `;
    const quizResult = await pool.query(quizQuery, [id]);

    if (quizResult.rows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Quiz not found",
      });
    }

    // Lấy câu hỏi và lựa chọn
    const questionsQuery = `
      SELECT qq.id, qq.question_text, qq.question_type, qq.correct_answer,
             qq.explanation, qq.points, qq.question_order,
             w.word, w.pronunciation, w.meaning
      FROM quiz_questions qq
      LEFT JOIN words w ON qq.word_id = w.id
      WHERE qq.quiz_id = $1
      ORDER BY qq.question_order, qq.id
    `;
    const questionsResult = await pool.query(questionsQuery, [id]);

    // Lấy options cho từng câu hỏi
    const questionIds = questionsResult.rows.map(q => q.id);
    let optionsResult = { rows: [] };

    if (questionIds.length > 0) {
      const optionsQuery = `
        SELECT qo.id, qo.question_id, qo.option_text, qo.is_correct, qo.option_order
        FROM quiz_options qo
        WHERE qo.question_id = ANY($1)
        ORDER BY qo.question_id, qo.option_order, qo.id
      `;
      optionsResult = await pool.query(optionsQuery, [questionIds]);
    }

    // Tổ chức dữ liệu
    const questions = questionsResult.rows.map(question => ({
      ...question,
      options: optionsResult.rows.filter(option => option.question_id === question.id)
    }));

    res.status(200).json({
      status: "success",
      data: {
        quiz: {
          ...quizResult.rows[0],
          questions: questions
        }
      },
    });
  } catch (error) {
    console.error("Error fetching quiz:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch quiz",
    });
  }
};

// Lấy câu hỏi ngẫu nhiên cho practice
exports.getRandomQuestions = async (req, res) => {
  try {
    const {
      limit = 10,
      difficulty_level,
      category_id,
      question_type = 'multiple_choice'
    } = req.query;

    let whereConditions = ['w.is_active = TRUE', 'qq.question_type = $1'];
    let queryParams = [question_type];
    let paramIndex = 2;

    if (difficulty_level) {
      whereConditions.push(`w.difficulty_level = $${paramIndex}`);
      queryParams.push(difficulty_level);
      paramIndex++;
    }

    if (category_id) {
      whereConditions.push(`w.category_id = $${paramIndex}`);
      queryParams.push(category_id);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const query = `
      SELECT qq.id, qq.question_text, qq.question_type, qq.correct_answer,
             qq.explanation, qq.points,
             w.word, w.pronunciation, w.meaning, w.difficulty_level,
             c.name as category_name
      FROM quiz_questions qq
      JOIN words w ON qq.word_id = w.id
      LEFT JOIN categories c ON w.category_id = c.id
      WHERE ${whereClause}
      ORDER BY RANDOM()
      LIMIT $${paramIndex}
    `;

    queryParams.push(parseInt(limit));
    const questionsResult = await pool.query(query, queryParams);

    // Lấy options cho các câu hỏi
    const questionIds = questionsResult.rows.map(q => q.id);
    let optionsResult = { rows: [] };

    if (questionIds.length > 0) {
      const optionsQuery = `
        SELECT qo.id, qo.question_id, qo.option_text, qo.is_correct, qo.option_order
        FROM quiz_options qo
        WHERE qo.question_id = ANY($1)
        ORDER BY qo.question_id, qo.option_order
      `;
      optionsResult = await pool.query(optionsQuery, [questionIds]);
    }

    // Tổ chức dữ liệu
    const questions = questionsResult.rows.map(question => ({
      ...question,
      options: optionsResult.rows.filter(option => option.question_id === question.id)
    }));

    res.status(200).json({
      status: "success",
      data: {
        questions: questions,
        total: questions.length
      },
    });
  } catch (error) {
    console.error("Error fetching random questions:", error);
    res.status(500).json({
      status: "error",
      message: "Failed to fetch random questions",
    });
  }
};
