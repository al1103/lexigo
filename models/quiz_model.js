const { pool } = require('../config/database');

const quizModel = {
  // Lấy câu hỏi theo level - SỬA LẠI BOOKMARK QUERY
  getQuestionsByLevel: async (levelCode, limit = 10, userId = null) => {
    try {
      console.log('🔍 Getting questions for level:', levelCode, 'limit:', limit, 'userId:', userId);

      const query = `
        SELECT
          qq.id as question_id,
          qq.question_text,
          qq.question_type,
          qq.difficulty_level,
          qq.explanation,
          qq.points,
          w.id as word_id,
          w.word,
          w.meaning,
          w.pronunciation,
          w.definition,
          w.example_sentence,
          w.audio_url,
          w.image_url,
          CASE WHEN ub.id IS NOT NULL THEN TRUE ELSE FALSE END as is_bookmarked,
          ub.notes as bookmark_notes
        FROM quiz_questions qq
        JOIN words w ON qq.word_id = w.id
        LEFT JOIN user_bookmarks ub ON w.id = ub.word_id AND ub.user_id = $3
        WHERE qq.difficulty_level = $1
          AND (qq.is_active IS NULL OR qq.is_active = TRUE)
          AND (w.is_active IS NULL OR w.is_active = TRUE)
        ORDER BY RANDOM()
        LIMIT $2
      `;

      const questionsResult = await pool.query(query, [levelCode, limit, userId]);

      if (questionsResult.rows.length === 0) {
        return [];
      }

      // Lấy options cho các câu hỏi
      const questionIds = questionsResult.rows.map(q => q.question_id);
      const optionsQuery = `
        SELECT qo.*
        FROM quiz_options qo
        WHERE qo.question_id = ANY($1)
        ORDER BY qo.question_id, qo.option_order, qo.id
      `;

      const optionsResult = await pool.query(optionsQuery, [questionIds]);

      // Nhóm options theo question_id
      const optionsByQuestion = {};
      optionsResult.rows.forEach(option => {
        if (!optionsByQuestion[option.question_id]) {
          optionsByQuestion[option.question_id] = [];
        }
        optionsByQuestion[option.question_id].push({
          id: option.id,
          option_text: option.option_text,
          is_correct: option.is_correct,
          option_order: option.option_order
        });
      });

      // Kết hợp questions và options với bookmark info
      const questionsWithOptions = questionsResult.rows.map(question => ({
        question_id: question.question_id,
        question_text: question.question_text,
        question_type: question.question_type,
        difficulty_level: question.difficulty_level,
        explanation: question.explanation,
        points: question.points,
        word_id: question.word_id,
        word: question.word,
        meaning: question.meaning,
        pronunciation: question.pronunciation,
        definition: question.definition,
        example_sentence: question.example_sentence,
        audio_url: question.audio_url,
        image_url: question.image_url,
        is_bookmarked: question.is_bookmarked,
        bookmark_notes: question.bookmark_notes,
        bookmarked_at: null, // Set to null since column doesn't exist
        options: optionsByQuestion[question.question_id] || []
      }));

      console.log('📊 Found questions:', questionsWithOptions.length);
      return questionsWithOptions;
    } catch (error) {
      console.error('❌ Error getting questions by level:', error);
      throw error;
    }
  },

  // Kiểm tra có questions không
  checkQuestionsExist: async (levelCode) => {
    try {
      const query = `
        SELECT COUNT(*) as total
        FROM quiz_questions qq
        JOIN words w ON qq.word_id = w.id
        WHERE qq.difficulty_level = $1
          AND (qq.is_active IS NULL OR qq.is_active = TRUE)
          AND (w.is_active IS NULL OR w.is_active = TRUE)
      `;

      const result = await pool.query(query, [levelCode]);
      const total = parseInt(result.rows[0].total);
      console.log(`📊 Total ${levelCode} questions available:`, total);

      return total;
    } catch (error) {
      console.error('❌ Error checking questions:', error);
      throw error;
    }
  },

  // Tạo quiz session mới
  createQuizSession: async (userId, levelId, levelCode) => {
    try {
      console.log('🎯 Creating quiz session for user:', userId, 'level ID:', levelId, 'level code:', levelCode);

      // Kiểm tra xem cột level_id có tồn tại không
      const checkColumnQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'user_quiz_sessions' AND column_name = 'level_id'
      `;

      const columnCheck = await pool.query(checkColumnQuery);
      const hasLevelIdColumn = columnCheck.rows.length > 0;

      let query, values;

      if (hasLevelIdColumn) {
        query = `
          INSERT INTO user_quiz_sessions (user_id, level_id, difficulty_level)
          VALUES ($1, $2, $3)
          RETURNING id
        `;
        values = [userId, levelId, levelCode];
      } else {
        query = `
          INSERT INTO user_quiz_sessions (user_id, difficulty_level)
          VALUES ($1, $2)
          RETURNING id
        `;
        values = [userId, levelCode];
        console.log('⚠️ level_id column not found, using difficulty_level only');
      }

      const result = await pool.query(query, values);
      console.log('✅ Quiz session created:', result.rows[0].id);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error creating quiz session:', error);
      throw error;
    }
  },

  // Submit answer
  submitAnswer: async (sessionId, questionId, selectedOptionId, responseTime = 0) => {
    try {
      const optionQuery = `
        SELECT is_correct FROM quiz_options
        WHERE id = $1 AND question_id = $2
      `;

      const optionResult = await pool.query(optionQuery, [selectedOptionId, questionId]);

      if (optionResult.rows.length === 0) {
        throw new Error('Invalid option selected');
      }

      const isCorrect = optionResult.rows[0].is_correct;

      const insertQuery = `
        INSERT INTO user_quiz_responses
        (session_id, question_id, selected_option_id, is_correct, response_time, answered_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        RETURNING id, is_correct
      `;

      const values = [sessionId, questionId, selectedOptionId, isCorrect, responseTime];
      const result = await pool.query(insertQuery, values);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error submitting answer:', error);
      throw error;
    }
  },

  // Complete quiz session
  completeQuizSession: async (sessionId) => {
    try {
      const statsQuery = `
        SELECT
          COUNT(*) as total_questions,
          SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct_answers
        FROM user_quiz_responses
        WHERE session_id = $1
      `;

      const statsResult = await pool.query(statsQuery, [sessionId]);
      const { total_questions, correct_answers } = statsResult.rows[0];

      const score = total_questions > 0 ? (correct_answers / total_questions) * 100 : 0;

      const updateQuery = `
        UPDATE user_quiz_sessions
        SET
          total_questions = $2,
          correct_answers = $3,
          score = $4,
          completed_at = CURRENT_TIMESTAMP,
          is_completed = TRUE
        WHERE id = $1
        RETURNING id, total_questions, correct_answers, score, completed_at
      `;

      const result = await pool.query(updateQuery, [sessionId, total_questions, correct_answers, score]);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Error completing quiz session:', error);
      throw error;
    }
  },

  // Get quiz history - LOẠI BỎ CATEGORY
  getQuizHistory: async (userId, page = 1, limit = 20) => {
    try {
      const offset = (page - 1) * limit;

      const query = `
        SELECT
          qs.id,
          qs.difficulty_level,
          qs.total_questions,
          qs.correct_answers,
          qs.score,
          qs.started_at,
          qs.completed_at,
          qs.is_completed,
          l.level_name,
          l.level_name_vi,
          l.color,
          l.icon
        FROM user_quiz_sessions qs
        LEFT JOIN levels l ON qs.level_id = l.id
        WHERE qs.user_id = $1
        ORDER BY qs.started_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, limit, offset]);

      const countQuery = `SELECT COUNT(*) as total FROM user_quiz_sessions WHERE user_id = $1`;
      const countResult = await pool.query(countQuery, [userId]);

      return {
        sessions: result.rows,
        pagination: {
          page: page,
          limit: limit,
          total: parseInt(countResult.rows[0].total),
          total_pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting quiz history:', error);
      throw error;
    }
  },

  // Bookmark word - LOẠI BỎ CATEGORY
  bookmarkWord: async (userId, wordId, notes = null) => {
    try {
      const query = `
        INSERT INTO user_bookmarks (user_id, word_id, notes)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, word_id)
        DO UPDATE SET notes = $3, bookmarked_at = CURRENT_TIMESTAMP
        RETURNING id, word_id, notes, bookmarked_at
      `;

      const result = await pool.query(query, [userId, wordId, notes]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error bookmarking word:', error);
      throw error;
    }
  },

  // Get user bookmarks - LOẠI BỎ CATEGORY
  getUserBookmarks: async (userId, page = 1, limit = 20) => {
    try {
      const offset = (page - 1) * limit;

      const query = `
        SELECT
          ub.id,
          ub.notes,
          ub.bookmarked_at,
          w.id as word_id,
          w.word,
          w.meaning,
          w.pronunciation,
          w.example_sentence,
          w.difficulty_level
        FROM user_bookmarks ub
        JOIN words w ON ub.word_id = w.id
        WHERE ub.user_id = $1
        ORDER BY ub.bookmarked_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [userId, limit, offset]);

      const countQuery = `SELECT COUNT(*) as total FROM user_bookmarks WHERE user_id = $1`;
      const countResult = await pool.query(countQuery, [userId]);

      return {
        contents: result.rows,
        pagination: {
          page: page,
          limit: limit,
          total: parseInt(countResult.rows[0].total),
          total_pages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      console.error('❌ Error getting user bookmarks:', error);
      throw error;
    }
  },

  // Debug - Lấy tất cả questions - LOẠI BỎ CATEGORY
  getAllQuestions: async () => {
    try {
      const query = `
        SELECT
          qq.id, qq.question_text, qq.difficulty_level,
          w.word, w.meaning,
          COUNT(qo.id) as option_count
        FROM quiz_questions qq
        JOIN words w ON qq.word_id = w.id
        LEFT JOIN quiz_options qo ON qq.id = qo.question_id
        GROUP BY qq.id, w.word, w.meaning
        ORDER BY qq.difficulty_level, qq.id
      `;

      const result = await pool.query(query);
      console.log('📋 All questions in database:', result.rows);

      return result.rows;
    } catch (error) {
      console.error('❌ Error getting all questions:', error);
      throw error;
    }
  },

  // Tìm session chưa hoàn thành của user cho level cụ thể
  getActiveSession: async (userId, levelId) => {
    try {
      const query = `
        SELECT
          qs.id,
          qs.difficulty_level,
          qs.started_at,
          qs.total_questions,
          COUNT(qr.id) as answered_questions
        FROM user_quiz_sessions qs
        LEFT JOIN user_quiz_responses qr ON qs.id = qr.session_id
        WHERE qs.user_id = $1
          AND qs.level_id = $2
          AND (qs.is_completed = FALSE OR qs.is_completed IS NULL)
          AND qs.started_at > NOW() - INTERVAL '24 hours'
        GROUP BY qs.id, qs.difficulty_level, qs.started_at, qs.total_questions
        HAVING (qs.total_questions IS NULL OR COUNT(qr.id) < qs.total_questions)
        ORDER BY qs.started_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [userId, levelId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting active session:', error);
      throw error;
    }
  },

  // Lấy câu hỏi chưa trả lời cho session - SỬA LẠI BOOKMARK QUERY
  getRemainingQuestions: async (sessionId, levelCode, totalNeeded, userId = null) => {
    try {
      // Lấy danh sách câu hỏi đã trả lời
      const answeredQuery = `
        SELECT DISTINCT question_id
        FROM user_quiz_responses
        WHERE session_id = $1
      `;

      const answeredResult = await pool.query(answeredQuery, [sessionId]);
      const answeredQuestionIds = answeredResult.rows.map(row => row.question_id);

      let whereClause = `
        WHERE qq.difficulty_level = $1
          AND (qq.is_active IS NULL OR qq.is_active = TRUE)
          AND (w.is_active IS NULL OR w.is_active = TRUE)
      `;

      let queryParams = [levelCode];

      // Loại trừ câu hỏi đã trả lời
      if (answeredQuestionIds.length > 0) {
        const placeholders = answeredQuestionIds.map((_, index) => `$${index + 2}`).join(',');
        whereClause += ` AND qq.id NOT IN (${placeholders})`;
        queryParams = queryParams.concat(answeredQuestionIds);
      }

      // Thêm userId và limit
      queryParams.push(userId); // $n
      queryParams.push(totalNeeded);  // $n+1

      const query = `
        SELECT
          qq.id as question_id,
          qq.question_text,
          qq.question_type,
          qq.difficulty_level,
          qq.explanation,
          qq.points,
          w.id as word_id,
          w.word,
          w.meaning,
          w.pronunciation,
          w.definition,
          w.example_sentence,
          w.audio_url,
          w.image_url,
          CASE WHEN ub.id IS NOT NULL THEN TRUE ELSE FALSE END as is_bookmarked,
          ub.notes as bookmark_notes
        FROM quiz_questions qq
        JOIN words w ON qq.word_id = w.id
        LEFT JOIN user_bookmarks ub ON w.id = ub.word_id AND ub.user_id = $${queryParams.length - 1}
        ${whereClause}
        ORDER BY RANDOM()
        LIMIT $${queryParams.length}
      `;

      const questionsResult = await pool.query(query, queryParams);

      if (questionsResult.rows.length === 0) {
        return [];
      }

      // Lấy options cho các câu hỏi
      const questionIds = questionsResult.rows.map(q => q.question_id);
      const optionsQuery = `
        SELECT qo.*
        FROM quiz_options qo
        WHERE qo.question_id = ANY($1)
        ORDER BY qo.question_id, qo.option_order, qo.id
      `;

      const optionsResult = await pool.query(optionsQuery, [questionIds]);

      // Nhóm options theo question_id
      const optionsByQuestion = {};
      optionsResult.rows.forEach(option => {
        if (!optionsByQuestion[option.question_id]) {
          optionsByQuestion[option.question_id] = [];
        }
        optionsByQuestion[option.question_id].push({
          id: option.id,
          option_text: option.option_text,
          is_correct: option.is_correct,
          option_order: option.option_order
        });
      });

      // Kết hợp questions và options với bookmark info
      const questionsWithOptions = questionsResult.rows.map(question => ({
        question_id: question.question_id,
        question_text: question.question_text,
        question_type: question.question_type,
        difficulty_level: question.difficulty_level,
        explanation: question.explanation,
        points: question.points,
        word_id: question.word_id,
        word: question.word,
        meaning: question.meaning,
        pronunciation: question.pronunciation,
        definition: question.definition,
        example_sentence: question.example_sentence,
        audio_url: question.audio_url,
        image_url: question.image_url,
        is_bookmarked: question.is_bookmarked,
        bookmark_notes: question.bookmark_notes,
        bookmarked_at: null, // Set to null since column doesn't exist
        options: optionsByQuestion[question.question_id] || []
      }));

      return questionsWithOptions;
    } catch (error) {
      console.error('❌ Error getting remaining questions:', error);
      throw error;
    }
  },

  // Cập nhật total_questions cho session
  updateSessionTotalQuestions: async (sessionId, totalQuestions) => {
    try {
      const query = `
        UPDATE user_quiz_sessions
        SET total_questions = $2
        WHERE id = $1
        RETURNING id, total_questions
      `;

      const result = await pool.query(query, [sessionId, totalQuestions]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating session total questions:', error);
      throw error;
    }
  },

  // Lấy thông tin question và word_id
  getQuestionInfo: async (questionId) => {
    try {
      const query = `
        SELECT
          qq.id as question_id,
          qq.word_id,
          w.word,
          w.meaning
        FROM quiz_questions qq
        JOIN words w ON qq.word_id = w.id
        WHERE qq.id = $1
      `;

      const result = await pool.query(query, [questionId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting question info:', error);
      throw error;
    }
  },

  // Xóa bookmark từ vựng
  deleteBookmark: async (userId, wordId) => {
    try {
      const query = `
        DELETE FROM user_bookmarks
        WHERE user_id = $1 AND word_id = $2
        RETURNING id, word_id
      `;
      const result = await pool.query(query, [userId, wordId]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error deleting bookmark:', error);
      throw error;
    }
  },

  // ADMIN: Lấy tất cả quiz sessions
  getAllQuizSessions: async () => {
    const result = await pool.query('SELECT * FROM user_quiz_sessions ORDER BY started_at DESC');
    return result.rows;
  },

  // ADMIN: Xóa quiz session
  deleteQuizSession: async (sessionId) => {
    const result = await pool.query('DELETE FROM user_quiz_sessions WHERE id = $1 RETURNING id', [sessionId]);
    return result.rows[0];
  },

  // ADMIN: Thêm câu hỏi mới
  createQuestion: async (data) => {
    const { question_text, question_type, difficulty_level, explanation, points, word_id } = data;
    const result = await pool.query(
      `INSERT INTO quiz_questions (question_text, question_type, difficulty_level, explanation, points, word_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [question_text, question_type, difficulty_level, explanation, points, word_id]
    );
    return result.rows[0];
  },

  // ADMIN: Sửa câu hỏi
  updateQuestion: async (id, data) => {
    const { question_text, question_type, difficulty_level, explanation, points, word_id } = data;
    const result = await pool.query(
      `UPDATE quiz_questions SET
        question_text = COALESCE($2, question_text),
        question_type = COALESCE($3, question_type),
        difficulty_level = COALESCE($4, difficulty_level),
        explanation = COALESCE($5, explanation),
        points = COALESCE($6, points),
        word_id = COALESCE($7, word_id)
       WHERE id = $1
       RETURNING *`,
      [id, question_text, question_type, difficulty_level, explanation, points, word_id]
    );
    return result.rows[0];
  },

  // ADMIN: Xóa câu hỏi
  deleteQuestion: async (id) => {
    const result = await pool.query('DELETE FROM quiz_questions WHERE id = $1 RETURNING id', [id]);
    return result.rows[0];
  },
};

module.exports = quizModel;
