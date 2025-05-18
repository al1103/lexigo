const { pool } = require('../config/database');

const lessonModel = {
  // Create lesson tables
  createTables: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create lessons table
      await client.query(`
        CREATE TABLE IF NOT EXISTS lessons (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          difficulty_level INTEGER DEFAULT 1,
          category_id INTEGER REFERENCES categories(id),
          order_index INTEGER DEFAULT 0,
          image_url VARCHAR(255),
          duration INTEGER, -- in minutes
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create lesson content sections
      await client.query(`
        CREATE TABLE IF NOT EXISTS lesson_sections (
          id SERIAL PRIMARY KEY,
          lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
          title VARCHAR(200),
          content TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'text', -- text, video, audio, etc.
          media_url VARCHAR(255),
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create quizzes table
      await client.query(`
        CREATE TABLE IF NOT EXISTS quizzes (
          id SERIAL PRIMARY KEY,
          lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          passing_score INTEGER DEFAULT 70,
          time_limit INTEGER, -- in seconds
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create questions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS questions (
          id SERIAL PRIMARY KEY,
          quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
          question TEXT NOT NULL,
          question_type VARCHAR(50) DEFAULT 'multiple_choice', -- multiple_choice, true_false, fill_blank
          points INTEGER DEFAULT 1,
          order_index INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create answers table
      await client.query(`
        CREATE TABLE IF NOT EXISTS answers (
          id SERIAL PRIMARY KEY,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          answer_text TEXT NOT NULL,
          is_correct BOOLEAN DEFAULT FALSE,
          explanation TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user progress table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_progress (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          lesson_id INTEGER REFERENCES lessons(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed
          progress_percentage INTEGER DEFAULT 0,
          last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP,
          UNIQUE(user_id, lesson_id)
        )
      `);

      // Create quiz attempts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS quiz_attempts (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
          score INTEGER,
          passed BOOLEAN,
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          completed_at TIMESTAMP
        )
      `);

      // Create quiz responses table
      await client.query(`
        CREATE TABLE IF NOT EXISTS quiz_responses (
          id SERIAL PRIMARY KEY,
          attempt_id INTEGER REFERENCES quiz_attempts(id) ON DELETE CASCADE,
          question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
          answer_id INTEGER REFERENCES answers(id) ON DELETE CASCADE,
          is_correct BOOLEAN,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await client.query('COMMIT');
      console.log('✅ Lesson and quiz tables created successfully');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating lesson tables:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Lesson CRUD operations
  createLesson: async (lessonData) => {
    const { title, description, difficulty_level, category_id, order_index, image_url, duration } = lessonData;
    
    try {
      const result = await pool.query(
        `INSERT INTO lessons 
         (title, description, difficulty_level, category_id, order_index, image_url, duration) 
         VALUES ($1, $2, $3, $4, $5, $6, $7) 
         RETURNING id`,
        [title, description, difficulty_level, category_id, order_index, image_url, duration]
      );
      
      return { success: true, id: result.rows[0].id };
    } catch (error) {
      console.error('Error creating lesson:', error);
      throw error;
    }
  },

  getLessonById: async (id) => {
    try {
      // Get lesson data
      const lessonResult = await pool.query(
        `SELECT l.*, c.name as category_name 
         FROM lessons l
         LEFT JOIN categories c ON l.category_id = c.id
         WHERE l.id = $1`,
        [id]
      );
      
      if (lessonResult.rows.length === 0) {
        return null;
      }
      
      const lesson = lessonResult.rows[0];
      
      // Get lesson sections
      const sectionsResult = await pool.query(
        `SELECT * FROM lesson_sections 
         WHERE lesson_id = $1 
         ORDER BY order_index ASC`,
        [id]
      );
      
      lesson.sections = sectionsResult.rows;
      
      // Get associated quizzes
      const quizzesResult = await pool.query(
        `SELECT * FROM quizzes WHERE lesson_id = $1`,
        [id]
      );
      
      lesson.quizzes = quizzesResult.rows;
      
      return lesson;
    } catch (error) {
      console.error('Error fetching lesson:', error);
      throw error;
    }
  },

  getAllLessons: async (filters = {}) => {
    try {
      let query = `
        SELECT l.*, c.name as category_name
        FROM lessons l
        LEFT JOIN categories c ON l.category_id = c.id
      `;
      
      const queryParams = [];
      const conditions = [];
      
      if (filters.level) {
        queryParams.push(filters.level);
        conditions.push(`l.difficulty_level = $${queryParams.length}`);
      }
      
      if (filters.category_id) {
        queryParams.push(filters.category_id);
        conditions.push(`l.category_id = $${queryParams.length}`);
      }
      
      if (filters.search) {
        queryParams.push(`%${filters.search}%`);
        conditions.push(`(l.title ILIKE $${queryParams.length} OR l.description ILIKE $${queryParams.length})`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      
      // Add order by
      query += ' ORDER BY l.difficulty_level ASC, l.order_index ASC';
      
      if (filters.limit) {
        queryParams.push(filters.limit);
        query += ` LIMIT $${queryParams.length}`;
      }
      
      if (filters.offset) {
        queryParams.push(filters.offset);
        query += ` OFFSET $${queryParams.length}`;
      }
      
      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('Error fetching lessons:', error);
      throw error;
    }
  },

  updateLesson: async (id, lessonData) => {
    const { title, description, difficulty_level, category_id, order_index, image_url, duration } = lessonData;
    
    try {
      await pool.query(
        `UPDATE lessons 
         SET title = COALESCE($1, title),
             description = COALESCE($2, description),
             difficulty_level = COALESCE($3, difficulty_level),
             category_id = COALESCE($4, category_id),
             order_index = COALESCE($5, order_index),
             image_url = COALESCE($6, image_url),
             duration = COALESCE($7, duration),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $8`,
        [title, description, difficulty_level, category_id, order_index, image_url, duration, id]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error updating lesson:', error);
      throw error;
    }
  },

  deleteLesson: async (id) => {
    try {
      await pool.query('DELETE FROM lessons WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting lesson:', error);
      throw error;
    }
  },

  // Lesson section operations
  addLessonSection: async (sectionData) => {
    const { lesson_id, title, content, type, media_url, order_index } = sectionData;
    
    try {
      const result = await pool.query(
        `INSERT INTO lesson_sections
         (lesson_id, title, content, type, media_url, order_index)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [lesson_id, title, content, type, media_url, order_index]
      );
      
      return { success: true, id: result.rows[0].id };
    } catch (error) {
      console.error('Error adding lesson section:', error);
      throw error;
    }
  },

  updateLessonSection: async (id, sectionData) => {
    const { title, content, type, media_url, order_index } = sectionData;
    
    try {
      await pool.query(
        `UPDATE lesson_sections
         SET title = COALESCE($1, title),
             content = COALESCE($2, content),
             type = COALESCE($3, type),
             media_url = COALESCE($4, media_url),
             order_index = COALESCE($5, order_index)
         WHERE id = $6`,
        [title, content, type, media_url, order_index, id]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error updating lesson section:', error);
      throw error;
    }
  },

  deleteLessonSection: async (id) => {
    try {
      await pool.query('DELETE FROM lesson_sections WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting lesson section:', error);
      throw error;
    }
  },
  
  // Quiz operations
  createQuiz: async (quizData) => {
    const { lesson_id, title, description, passing_score, time_limit } = quizData;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const quizResult = await client.query(
        `INSERT INTO quizzes
         (lesson_id, title, description, passing_score, time_limit)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [lesson_id, title, description, passing_score, time_limit]
      );
      
      const quizId = quizResult.rows[0].id;
      
      // Add questions if provided
      if (quizData.questions && quizData.questions.length > 0) {
        for (let i = 0; i < quizData.questions.length; i++) {
          const q = quizData.questions[i];
          
          const questionResult = await client.query(
            `INSERT INTO questions
             (quiz_id, question, question_type, points, order_index)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [quizId, q.question, q.question_type, q.points, q.order_index || i]
          );
          
          const questionId = questionResult.rows[0].id;
          
          // Add answers for this question
          if (q.answers && q.answers.length > 0) {
            for (const a of q.answers) {
              await client.query(
                `INSERT INTO answers
                 (question_id, answer_text, is_correct, explanation)
                 VALUES ($1, $2, $3, $4)`,
                [questionId, a.answer_text, a.is_correct, a.explanation]
              );
            }
          }
        }
      }
      
      await client.query('COMMIT');
      return { success: true, id: quizId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error creating quiz:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  getQuizById: async (id, includeAnswers = false) => {
    try {
      // Get basic quiz info
      const quizResult = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);
      
      if (quizResult.rows.length === 0) {
        return null;
      }
      
      const quiz = quizResult.rows[0];
      
      // Get questions
      const questionsResult = await pool.query(
        'SELECT * FROM questions WHERE quiz_id = $1 ORDER BY order_index ASC',
        [id]
      );
      
      quiz.questions = questionsResult.rows;
      
      // Get answers for each question if requested
      if (includeAnswers) {
        for (const question of quiz.questions) {
          const answersResult = await pool.query(
            'SELECT * FROM answers WHERE question_id = $1',
            [question.id]
          );
          
          question.answers = answersResult.rows;
        }
      }
      
      return quiz;
    } catch (error) {
      console.error('Error fetching quiz:', error);
      throw error;
    }
  },

  // User progress operations
  updateUserProgress: async (userId, lessonId, progressData) => {
    const { status, progress_percentage, completed } = progressData;
    
    try {
      // Check if progress record exists
      const existingRecord = await pool.query(
        'SELECT id FROM user_progress WHERE user_id = $1 AND lesson_id = $2',
        [userId, lessonId]
      );
      
      const completedAt = completed ? 'CURRENT_TIMESTAMP' : null;
      
      if (existingRecord.rows.length === 0) {
        // Create new progress record
        await pool.query(
          `INSERT INTO user_progress
           (user_id, lesson_id, status, progress_percentage, last_accessed, completed_at)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, ${completed ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
          [userId, lessonId, status, progress_percentage]
        );
      } else {
        // Update existing record
        await pool.query(
          `UPDATE user_progress
           SET status = COALESCE($1, status),
               progress_percentage = COALESCE($2, progress_percentage),
               last_accessed = CURRENT_TIMESTAMP,
               completed_at = ${completed ? 'CURRENT_TIMESTAMP' : 'completed_at'}
           WHERE user_id = $3 AND lesson_id = $4`,
          [status, progress_percentage, userId, lessonId]
        );
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error updating user progress:', error);
      throw error;
    }
  },

  getUserProgress: async (userId, lessonId = null) => {
    try {
      let query = `
        SELECT up.*, l.title as lesson_title, l.difficulty_level
        FROM user_progress up
        JOIN lessons l ON up.lesson_id = l.id
        WHERE up.user_id = $1
      `;
      
      const params = [userId];
      
      if (lessonId) {
        query += ' AND up.lesson_id = $2';
        params.push(lessonId);
      }
      
      const result = await pool.query(query, params);
      return lessonId ? result.rows[0] : result.rows;
    } catch (error) {
      console.error('Error fetching user progress:', error);
      throw error;
    }
  },
  
  // Quiz attempt operations
  createQuizAttempt: async (userId, quizId) => {
    try {
      const result = await pool.query(
        `INSERT INTO quiz_attempts
         (user_id, quiz_id, started_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, quizId]
      );
      
      return { success: true, id: result.rows[0].id };
    } catch (error) {
      console.error('Error creating quiz attempt:', error);
      throw error;
    }
  },

  saveQuizResponse: async (attemptId, questionId, answerId, isCorrect) => {
    try {
      await pool.query(
        `INSERT INTO quiz_responses
         (attempt_id, question_id, answer_id, is_correct)
         VALUES ($1, $2, $3, $4)`,
        [attemptId, questionId, answerId, isCorrect]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error saving quiz response:', error);
      throw error;
    }
  },

  completeQuizAttempt: async (attemptId, score, passed) => {
    try {
      await pool.query(
        `UPDATE quiz_attempts
         SET score = $1, passed = $2, completed_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [score, passed, attemptId]
      );
      
      return { success: true };
    } catch (error) {
      console.error('Error completing quiz attempt:', error);
      throw error;
    }
  },

  getUserQuizResults: async (userId, quizId = null) => {
    try {
      let query = `
        SELECT qa.*, q.title as quiz_title, q.passing_score,
               l.id as lesson_id, l.title as lesson_title
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN lessons l ON q.lesson_id = l.id
        WHERE qa.user_id = $1
      `;
      
      const params = [userId];
      
      if (quizId) {
        query += ' AND qa.quiz_id = $2';
        params.push(quizId);
      }
      
      query += ' ORDER BY qa.completed_at DESC';
      
      const result = await pool.query(query, params);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user quiz results:', error);
      throw error;
    }
  }
};

module.exports = lessonModel; 