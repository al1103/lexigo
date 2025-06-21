const { pool } = require('../config/database');

const lessonModel = {
  // Initialize lesson tables (admin function)
  createTables: async () => {
    try {
      // Check if tables exist and have data
      const queries = [
        'SELECT COUNT(*) as count FROM users',
        'SELECT COUNT(*) as count FROM lessons',
        'SELECT COUNT(*) as count FROM quiz_questions',
        'SELECT COUNT(*) as count FROM user_progress',
        'SELECT COUNT(*) as count FROM quiz_attempts'
      ];

      const results = {};
      for (let i = 0; i < queries.length; i++) {
        const result = await pool.query(queries[i]);
        const tableName = queries[i].split(' FROM ')[1];
        results[tableName] = parseInt(result.rows[0].count);
      }

      return {
        message: 'Lesson tables verified successfully',
        data: results
      };
    } catch (error) {
      throw error;
    }
  },

  // Get all lessons with optional filters
  getAllLessons: async (filters = {}) => {
    try {
      const { level, search, limit = 20, offset = 0 } = filters;

      let whereConditions = ['l.is_published = true'];
      let queryParams = [];
      let paramIndex = 1;

      // Map level numbers to difficulty strings
      if (level) {
        const difficultyMap = { 1: 'easy', 2: 'medium', 3: 'hard' };
        const difficulty = difficultyMap[level] || 'easy';
        whereConditions.push(`l.difficulty_level = $${paramIndex}`);
        queryParams.push(difficulty);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(l.title ILIKE $${paramIndex} OR l.description ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      const query = `
        SELECT
          l.id,
          l.title,
          l.description,
          l.difficulty_level,
          l.total_questions,
          l.is_published,
          l.created_at,
          COUNT(qq.id) as actual_question_count
        FROM lessons l
        LEFT JOIN quiz_questions qq ON l.id = qq.lesson_id
        ${whereClause}
        GROUP BY l.id, l.title, l.description, l.difficulty_level, l.total_questions, l.is_published, l.created_at
        ORDER BY l.id
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Get lesson by ID
  getLessonById: async (id) => {
    try {
      const query = `
        SELECT
          l.id,
          l.title,
          l.description,
          l.difficulty_level,
          l.total_questions,
          l.is_published,
          l.created_at,
          COUNT(qq.id) as actual_question_count
        FROM lessons l
        LEFT JOIN quiz_questions qq ON l.id = qq.lesson_id
        WHERE l.id = $1
        GROUP BY l.id, l.title, l.description, l.difficulty_level, l.total_questions, l.is_published, l.created_at
      `;

      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Get lesson with questions
  getLessonWithQuestions: async (id) => {
    try {
      // Get lesson
      const lessonQuery = `
        SELECT id, title, description, difficulty_level, total_questions, is_published, created_at
        FROM lessons
        WHERE id = $1 AND is_published = true
      `;
      const lessonResult = await pool.query(lessonQuery, [id]);

      if (lessonResult.rows.length === 0) {
        return null;
      }

      // Get questions
      const questionsQuery = `
        SELECT id, question_text, option_a, option_b, option_c, option_d
        FROM quiz_questions
        WHERE lesson_id = $1
        ORDER BY id
      `;
      const questionsResult = await pool.query(questionsQuery, [id]);

      return {
        lesson: lessonResult.rows[0],
        questions: questionsResult.rows
      };
    } catch (error) {
      throw error;
    }
  },

  // Get lesson with questions and answers
  getLessonWithQuestionsAndAnswers: async (id) => {
    try {
      // Get lesson
      const lessonQuery = `
        SELECT id, title, description, difficulty_level, total_questions, is_published, created_at
        FROM lessons
        WHERE id = $1 AND is_published = true
      `;
      const lessonResult = await pool.query(lessonQuery, [id]);

      if (lessonResult.rows.length === 0) {
        return null;
      }

      // Get questions with answers
      const questionsQuery = `
        SELECT
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation
        FROM quiz_questions
        WHERE lesson_id = $1
        ORDER BY id
      `;
      const questionsResult = await pool.query(questionsQuery, [id]);

      return {
        data: questionsResult.rows
      };
    } catch (error) {
      throw error;
    }
  },

  // Create lesson
  createLesson: async (lessonData) => {
    try {
      const {
        title,
        description,
        difficulty_level = 'easy',
        total_questions = 0,
        is_published = false
      } = lessonData;

      const query = `
        INSERT INTO lessons (title, description, difficulty_level, total_questions, is_published)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;

      const values = [title, description, difficulty_level, total_questions, is_published];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Update lesson
  updateLesson: async (id, updateData) => {
    try {
      const {
        title,
        description,
        difficulty_level,
        total_questions,
        is_published
      } = updateData;

      const query = `
        UPDATE lessons SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          difficulty_level = COALESCE($3, difficulty_level),
          total_questions = COALESCE($4, total_questions),
          is_published = COALESCE($5, is_published)
        WHERE id = $6
        RETURNING *
      `;

      const values = [title, description, difficulty_level, total_questions, is_published, id];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Delete lesson
  deleteLesson: async (id) => {
    try {
      const query = `DELETE FROM lessons WHERE id = $1 RETURNING id, title`;
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Get questions for lesson (with correct answers for admin)
  getLessonQuestions: async (lessonId, includeAnswers = false) => {
    try {
      let selectFields = 'id, question_text, option_a, option_b, option_c, option_d';
      if (includeAnswers) {
        selectFields += ', correct_answer, explanation';
      }

      const query = `
        SELECT ${selectFields}
        FROM quiz_questions
        WHERE lesson_id = $1
        ORDER BY id
      `;

      const result = await pool.query(query, [lessonId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Submit quiz and calculate score
  submitQuiz: async (userId, lessonId, answers, bookmarkedQuestions = []) => {
    try {
      // Get correct answers
      const questionsQuery = `
        SELECT id, correct_answer
        FROM quiz_questions
        WHERE lesson_id = $1
      `;
      const questionsResult = await pool.query(questionsQuery, [lessonId]);

      if (questionsResult.rows.length === 0) {
        throw new Error('No questions found for this lesson');
      }

      const correctAnswers = Object.fromEntries(
        questionsResult.rows.map(q => [q.id, q.correct_answer])
      );

      // Calculate score
      let correctCount = 0;
      for (const answer of answers) {
        if (correctAnswers[answer.question_id] === answer.answer) {
          correctCount++;
        }
      }

      const totalQuestions = questionsResult.rows.length;
      const score = Math.round((correctCount / totalQuestions) * 100);

      // Save attempt
      const attemptQuery = `
        INSERT INTO quiz_attempts (user_id, lesson_id, score, total_questions, correct_answers)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      const attemptResult = await pool.query(attemptQuery, [userId, lessonId, score, totalQuestions, correctCount]);

      // Save bookmarked questions
      if (bookmarkedQuestions && bookmarkedQuestions.length > 0) {
        const bookmarkQuery = `
          INSERT INTO user_bookmarks (user_id, question_id, lesson_id, created_at)
          VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id, question_id) DO NOTHING
        `;

        for (const questionId of bookmarkedQuestions) {
          await pool.query(bookmarkQuery, [userId, questionId, lessonId]);
        }
      }

      // Update user progress
      const progressQuery = `
        INSERT INTO user_progress (user_id, lesson_id, score, is_completed, completed_at)
        VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET
          score = GREATEST(user_progress.score, $3),
          is_completed = true,
          completed_at = CURRENT_TIMESTAMP
      `;
      await pool.query(progressQuery, [userId, lessonId, score]);

      // Update user points
      const pointsEarned = score;
      const updateUserQuery = `
        UPDATE users
        SET total_points = total_points + $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
      `;
      await pool.query(updateUserQuery, [pointsEarned, userId]);

      return {
        attemptId: attemptResult.rows[0].id,
        score,
        correctCount,
        totalQuestions,
        pointsEarned,
        passed: score >= 70,
        bookmarkedCount: bookmarkedQuestions ? bookmarkedQuestions.length : 0
      };
    } catch (error) {
      throw error;
    }
  },

  // Get user progress for specific lesson or all lessons
  getUserProgress: async (userId, lessonId = null) => {
    try {
      let query, queryParams;

      if (lessonId) {
        // Get progress for specific lesson
        query = `
          SELECT
            up.id,
            up.user_id,
            up.lesson_id,
            up.score,
            up.is_completed,
            up.completed_at,
            up.created_at,
            l.title,
            l.difficulty_level,
            l.total_questions
          FROM user_progress up
          JOIN lessons l ON up.lesson_id = l.id
          WHERE up.user_id = $1 AND up.lesson_id = $2
        `;
        queryParams = [userId, lessonId];
      } else {
        // Get progress for all lessons
        query = `
          SELECT
            up.id,
            up.user_id,
            up.lesson_id,
            up.score,
            up.is_completed,
            up.completed_at,
            up.created_at,
            l.title,
            l.difficulty_level,
            l.total_questions,
            l.is_published
          FROM user_progress up
          JOIN lessons l ON up.lesson_id = l.id
          WHERE up.user_id = $1
          ORDER BY up.created_at DESC
        `;
        queryParams = [userId];
      }

      const result = await pool.query(query, queryParams);
      return lessonId ? result.rows[0] || null : result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Update user progress
  updateUserProgress: async (userId, lessonId, progressData) => {
    try {
      const {
        progress_percentage = 0,
        completed = false
      } = progressData;

      // Use progress_percentage as score for simplicity
      const score = progress_percentage;

      const query = `
        INSERT INTO user_progress (user_id, lesson_id, score, is_completed, completed_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, lesson_id)
        DO UPDATE SET
          score = GREATEST(user_progress.score, $3),
          is_completed = $4,
          completed_at = CASE WHEN $4 = true THEN CURRENT_TIMESTAMP ELSE user_progress.completed_at END
        RETURNING *
      `;

      const completedAt = completed ? new Date() : null;
      const values = [userId, lessonId, score, completed, completedAt];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get quiz attempts for user
  getUserQuizResults: async (userId, quizId = null) => {
    try {
      let query, queryParams;

      if (quizId) {
        query = `
          SELECT
            qa.id,
            qa.user_id,
            qa.lesson_id,
            qa.score,
            qa.total_questions,
            qa.correct_answers,
            qa.completed_at,
            l.title as lesson_title,
            l.difficulty_level
          FROM quiz_attempts qa
          JOIN lessons l ON qa.lesson_id = l.id
          WHERE qa.user_id = $1 AND qa.lesson_id = $2
          ORDER BY qa.completed_at DESC
        `;
        queryParams = [userId, quizId];
      } else {
        query = `
          SELECT
            qa.id,
            qa.user_id,
            qa.lesson_id,
            qa.score,
            qa.total_questions,
            qa.correct_answers,
            qa.completed_at,
            l.title as lesson_title,
            l.difficulty_level
          FROM quiz_attempts qa
          JOIN lessons l ON qa.lesson_id = l.id
          WHERE qa.user_id = $1
          ORDER BY qa.completed_at DESC
        `;
        queryParams = [userId];
      }

      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Create quiz attempt
  createQuizAttempt: async (userId, quizId) => {
    try {
      const query = `
        INSERT INTO quiz_attempts (user_id, lesson_id, score, total_questions, correct_answers)
        VALUES ($1, $2, 0, 0, 0)
        RETURNING id
      `;

      const result = await pool.query(query, [userId, quizId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Complete quiz attempt
  completeQuizAttempt: async (attemptId, score, passed) => {
    try {
      const updateAttemptQuery = `
        UPDATE quiz_attempts
        SET score = $1
        WHERE id = $2
        RETURNING *
      `;
      const result = await pool.query(updateAttemptQuery, [score, attemptId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Save quiz response (placeholder for future implementation)
  saveQuizResponse: async (attemptId, questionId, answerId, isCorrect) => {
    try {
      // In simplified schema, we don't track individual responses
      // Just return success
      return {
        attemptId,
        questionId,
        answerId,
        isCorrect,
        message: 'Response recorded (placeholder)'
      };
    } catch (error) {
      throw error;
    }
  },

  // Create quiz (returns lesson info since quiz = lesson in simplified schema)
  createQuiz: async (quizData) => {
    try {
      const { lesson_id } = quizData;

      const query = `SELECT * FROM lessons WHERE id = $1`;
      const result = await pool.query(query, [lesson_id]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },

  // Get quiz by ID (same as getting lesson with questions)
  getQuizById: async (id, includeAnswers = false) => {
    try {
      const lessonData = await lessonModel.getLessonWithQuestions(id);

      if (!lessonData) {
        return null;
      }

      // If includeAnswers is true, get questions with answers
      if (includeAnswers) {
        const questionsWithAnswers = await lessonModel.getLessonQuestions(id, true);
        lessonData.questions = questionsWithAnswers;
      }

      return lessonData;
    } catch (error) {
      throw error;
    }
  },

  // Placeholder functions for lesson sections (not implemented in simplified schema)
  addLessonSection: async (sectionData) => {
    try {
      return {
        id: Date.now(), // Mock ID
        message: 'Lesson sections not implemented in simplified schema',
        data: sectionData
      };
    } catch (error) {
      throw error;
    }
  },

  updateLessonSection: async (id, sectionData) => {
    try {
      return {
        message: 'Lesson sections not implemented in simplified schema',
        data: { id, ...sectionData }
      };
    } catch (error) {
      throw error;
    }
  },

  deleteLessonSection: async (id) => {
    try {
      return {
        message: 'Lesson sections not implemented in simplified schema',
        data: { id }
      };
    } catch (error) {
      throw error;
    }
  },

  // Get user bookmarks
  getUserBookmarks: async (userId, lessonId = null) => {
    try {
      let query = `
        SELECT
          ub.question_id,
          ub.lesson_id,
          ub.created_at,
          qq.question_text,
          qq.option_a,
          qq.option_b,
          qq.option_c,
          qq.option_d,
          qq.correct_answer,
          qq.explanation,
          l.title as lesson_title
        FROM user_bookmarks ub
        JOIN quiz_questions qq ON ub.question_id = qq.id
        JOIN lessons l ON ub.lesson_id = l.id
        WHERE ub.user_id = $1
      `;

      let queryParams = [userId];

      if (lessonId) {
        query += ' AND ub.lesson_id = $2';
        queryParams.push(lessonId);
      }

      query += ' ORDER BY ub.created_at DESC';

      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      throw error;
    }
  },

  // Remove bookmark
  removeBookmark: async (userId, questionId) => {
    try {
      const query = `
        DELETE FROM user_bookmarks
        WHERE user_id = $1 AND question_id = $2
        RETURNING question_id
      `;

      const result = await pool.query(query, [userId, questionId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },

  // Get multiple lessons by IDs with questions and answers
  getLessonsByIds: async (lessonIds) => {
    try {
      // Convert array to string for SQL IN clause
      const idsPlaceholder = lessonIds.map((_, index) => `$${index + 1}`).join(',');

      // Get lessons
      const lessonsQuery = `
        SELECT id, title, description, difficulty_level, total_questions, is_published, created_at
        FROM lessons
        WHERE id IN (${idsPlaceholder}) AND is_published = true
        ORDER BY id
      `;
      const lessonsResult = await pool.query(lessonsQuery, lessonIds);

      if (lessonsResult.rows.length === 0) {
        return [];
      }

      // Get all questions for these lessons
      const questionsQuery = `
        SELECT
          lesson_id,
          id,
          question_text,
          option_a,
          option_b,
          option_c,
          option_d,
          correct_answer,
          explanation
        FROM quiz_questions
        WHERE lesson_id IN (${idsPlaceholder})
        ORDER BY lesson_id, id
      `;
      const questionsResult = await pool.query(questionsQuery, lessonIds);

      // Group questions by lesson_id
      const questionsByLesson = {};
      questionsResult.rows.forEach(question => {
        if (!questionsByLesson[question.lesson_id]) {
          questionsByLesson[question.lesson_id] = [];
        }

        const { lesson_id, ...questionData } = question;
        questionsByLesson[question.lesson_id].push(questionData);
      });

      // Combine lessons with their questions
      const result = lessonsResult.rows.map(lesson => ({
        lesson: lesson,
        questions: questionsByLesson[lesson.id] || []
      }));

      return result;
    } catch (error) {
      throw error;
    }
  },
};

module.exports = lessonModel;
