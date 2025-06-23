const { pool } = require('../config/database');

const speakingModel = {
  // Lấy danh sách levels cho speaking
  getSpeakingLevels: async () => {
    try {
      const query = `
        SELECT
          l.id,
          l.level_code,
          l.level_name,
          l.level_name_vi,
          l.description,
          l.color,
          l.icon,
          COUNT(DISTINCT w.id) as total_words
        FROM levels l
        LEFT JOIN words w ON (
          w.difficulty_level = l.level_code
          AND (w.is_active = TRUE OR w.is_active IS NULL)
        )
        WHERE l.is_active = TRUE
        GROUP BY l.id, l.level_code, l.level_name, l.level_name_vi,
                 l.description, l.color, l.icon
        HAVING COUNT(DISTINCT w.id) > 0
        ORDER BY l.id ASC
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting speaking levels:', error);
      throw error;
    }
  },

  // Lấy thống kê cho từng level của user
  getUserSpeakingLevelStats: async (userId) => {
    try {
      const query = `
        SELECT
          l.id as level_id,
          l.level_code,
          l.level_name,
          l.level_name_vi,
          l.color,
          l.icon,
          COUNT(DISTINCT w.id) as total_words,
          COUNT(DISTINCT ss.id) as total_sessions,
          COUNT(DISTINCT sr.id) as total_attempts,
          COALESCE(AVG(sr.overall_score), 0) as average_score,
          COALESCE(MAX(sr.overall_score), 0) as best_score,
          MAX(ss.completed_at) as last_session_date
        FROM levels l
        LEFT JOIN words w ON (
          w.difficulty_level = l.level_code
          AND (w.is_active = TRUE OR w.is_active IS NULL)
        )
        LEFT JOIN speaking_sessions ss ON ss.difficulty_level = l.level_code
          AND ss.user_id = $1 AND ss.is_completed = TRUE
        LEFT JOIN speaking_results sr ON sr.session_id = ss.id
        WHERE l.is_active = TRUE
        GROUP BY l.id, l.level_code, l.level_name, l.level_name_vi, l.color, l.icon
        HAVING COUNT(DISTINCT w.id) > 0
        ORDER BY l.id ASC
      `;

      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('Error getting user speaking level stats:', error);
      throw error;
    }
  },

  // Kiểm tra level có words không
  checkLevelHasWords: async (levelCode) => {
    try {
      const query = `
        SELECT COUNT(*) as word_count
        FROM words w
        WHERE w.difficulty_level = $1
          AND (w.is_active = TRUE OR w.is_active IS NULL)
      `;

      const result = await pool.query(query, [levelCode]);
      return parseInt(result.rows[0].word_count) || 0;
    } catch (error) {
      console.error('Error checking level words:', error);
      throw error;
    }
  },

  // Lấy từ vựng cho speaking practice
  getWordsForSpeaking: async (level, limit = 20) => {
    try {
      let query = `
        SELECT w.*, l.level_name, l.level_code, l.color
        FROM words w
        LEFT JOIN levels l ON l.level_code = w.difficulty_level
        WHERE w.difficulty_level = $1 AND (w.is_active = TRUE OR w.is_active IS NULL)
        ORDER BY RANDOM()
        LIMIT $2
      `;

      const result = await pool.query(query, [level, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting words for speaking:', error);
      throw error;
    }
  },

  // Tạo speaking session
  createSpeakingSession: async (userId, sessionType, difficultyLevel) => {
    try {
      const query = `
        INSERT INTO speaking_sessions (user_id, session_type, difficulty_level, started_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const result = await pool.query(query, [userId, sessionType, difficultyLevel]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating speaking session:', error);
      throw error;
    }
  },

  // Lưu kết quả speaking
  saveSpeakingResult: async (resultData) => {
    try {
      const {
        sessionId,
        userId,
        wordId,
        referenceText,
        referenceIpa,
        spokenText,
        spokenIpa,
        overallScore,
        accuracyLevel,
        pronunciationScore,
        fluencyScore,
        confidenceScore,
        audioUrl,
        feedbackText
      } = resultData;

      const query = `
        INSERT INTO speaking_results (
          session_id, user_id, word_id, reference_text, reference_ipa,
          spoken_text, spoken_ipa, overall_score, accuracy_level,
          pronunciation_score, fluency_score, confidence_score,
          audio_url, feedback_text, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const values = [
        sessionId, userId, wordId, referenceText, referenceIpa,
        spokenText, spokenIpa, overallScore, accuracyLevel,
        pronunciationScore, fluencyScore, confidenceScore,
        audioUrl, feedbackText
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error saving speaking result:', error);
      throw error;
    }
  },

  // Lưu word analysis
  saveWordAnalysis: async (speakingResultId, wordAnalysis) => {
    try {
      if (!wordAnalysis || wordAnalysis.length === 0) return;

      const query = `
        INSERT INTO word_analysis (
          speaking_result_id, reference_word, spoken_word, word_score,
          word_status, word_position, phoneme_accuracy, stress_accuracy
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      const promises = wordAnalysis.map((word, index) => {
        const values = [
          speakingResultId,
          word.reference_word || '',
          word.spoken_word || '',
          word.word_score || 0,
          word.word_status || 'incorrect',
          index + 1,
          word.phoneme_accuracy || 0,
          word.stress_accuracy || 0
        ];
        return pool.query(query, values);
      });

      await Promise.all(promises);
    } catch (error) {
      console.error('Error saving word analysis:', error);
      throw error;
    }
  },

  // Hoàn thành speaking session
  completeSpeakingSession: async (sessionId) => {
    try {
      const query = `
        UPDATE speaking_sessions
        SET
          total_words = (
            SELECT COUNT(*) FROM speaking_results WHERE session_id = $1
          ),
          total_score = (
            SELECT COALESCE(SUM(overall_score), 0) FROM speaking_results WHERE session_id = $1
          ),
          average_score = (
            SELECT COALESCE(AVG(overall_score), 0) FROM speaking_results WHERE session_id = $1
          ),
          session_duration = EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - started_at)),
          completed_at = CURRENT_TIMESTAMP,
          is_completed = TRUE
        WHERE id = $1
        RETURNING *
      `;

      const result = await pool.query(query, [sessionId]);

      // Cập nhật user statistics
      if (result.rows.length > 0) {
        await this.updateUserSpeakingStats(result.rows[0].user_id);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error completing speaking session:', error);
      throw error;
    }
  },

  // Cập nhật thống kê speaking
  updateUserSpeakingStats: async (userId) => {
    try {
      const query = `
        INSERT INTO user_statistics (
          user_id,
          speaking_total_sessions,
          speaking_total_words,
          speaking_average_score,
          speaking_best_score,
          speaking_last_session,
          last_updated
        )
        SELECT
          $1,
          COUNT(DISTINCT ss.id),
          COUNT(sr.id),
          AVG(sr.overall_score),
          MAX(sr.overall_score),
          MAX(ss.completed_at)::date,
          CURRENT_TIMESTAMP
        FROM speaking_sessions ss
        LEFT JOIN speaking_results sr ON ss.id = sr.session_id
        WHERE ss.user_id = $1 AND ss.is_completed = TRUE
        ON CONFLICT (user_id)
        DO UPDATE SET
          speaking_total_sessions = EXCLUDED.speaking_total_sessions,
          speaking_total_words = EXCLUDED.speaking_total_words,
          speaking_average_score = EXCLUDED.speaking_average_score,
          speaking_best_score = EXCLUDED.speaking_best_score,
          speaking_last_session = EXCLUDED.speaking_last_session,
          last_updated = CURRENT_TIMESTAMP
      `;

      await pool.query(query, [userId]);
    } catch (error) {
      console.error('Error updating speaking stats:', error);
      throw error;
    }
  },

  // Lấy lịch sử speaking
  getSpeakingHistory: async (userId, page = 1, limit = 20) => {
    try {
      const offset = (page - 1) * limit;

      const query = `
        SELECT
          ss.*,
          COUNT(sr.id) as total_attempts,
          AVG(sr.overall_score) as session_average
        FROM speaking_sessions ss
        LEFT JOIN speaking_results sr ON ss.id = sr.session_id
        WHERE ss.user_id = $1 AND ss.is_completed = TRUE
        GROUP BY ss.id
        ORDER BY ss.completed_at DESC
        LIMIT $2 OFFSET $3
      `;

      const countQuery = `
        SELECT COUNT(*) as total
        FROM speaking_sessions
        WHERE user_id = $1 AND is_completed = TRUE
      `;

      const [dataResult, countResult] = await Promise.all([
        pool.query(query, [userId, limit, offset]),
        pool.query(countQuery, [userId])
      ]);

      return {
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      };
    } catch (error) {
      console.error('Error getting speaking history:', error);
      throw error;
    }
  },

  // Lấy thống kê speaking
  getSpeakingStats: async (userId) => {
    try {
      const query = `
        SELECT * FROM user_statistics WHERE user_id = $1
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting speaking stats:', error);
      throw error;
    }
  },

  // Tìm speaking session chưa hoàn thành
  getActiveSpeakingSession: async (userId, levelCode) => {
    try {
      const query = `
        SELECT
          ss.id,
          ss.session_type,
          ss.difficulty_level,
          ss.started_at,
          ss.total_words,
          COUNT(sr.id) as completed_words
        FROM speaking_sessions ss
        LEFT JOIN speaking_results sr ON ss.id = sr.session_id
        WHERE ss.user_id = $1
          AND ss.difficulty_level = $2
          AND (ss.is_completed = FALSE OR ss.is_completed IS NULL)
          AND ss.started_at > NOW() - INTERVAL '24 hours'
        GROUP BY ss.id, ss.session_type, ss.difficulty_level, ss.started_at, ss.total_words
        HAVING (ss.total_words IS NULL OR COUNT(sr.id) < ss.total_words)
        ORDER BY ss.started_at DESC
        LIMIT 1
      `;

      const result = await pool.query(query, [userId, levelCode]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error getting active speaking session:', error);
      throw error;
    }
  },

  // Lấy từ đã practice trong session
  getPracticedWords: async (sessionId) => {
    try {
      const query = `
        SELECT DISTINCT word_id
        FROM speaking_results
        WHERE session_id = $1
      `;

      const result = await pool.query(query, [sessionId]);
      return result.rows.map(row => row.word_id);
    } catch (error) {
      console.error('❌ Error getting practiced words:', error);
      throw error;
    }
  },

  // Lấy từ chưa practice cho session
  getRemainingWordsForSpeaking: async (sessionId, levelCode, totalNeeded) => {
    try {
      // Lấy danh sách từ đã practice
      const practicedQuery = `
        SELECT DISTINCT word_id
        FROM speaking_results
        WHERE session_id = $1
      `;

      const practicedResult = await pool.query(practicedQuery, [sessionId]);
      const practicedWordIds = practicedResult.rows.map(row => row.word_id);

      let whereClause = `
        WHERE w.difficulty_level = $1
          AND (w.is_active IS NULL OR w.is_active = TRUE)
      `;

      let queryParams = [levelCode];

      // Loại trừ từ đã practice
      if (practicedWordIds.length > 0) {
        const placeholders = practicedWordIds.map((_, index) => `$${index + 2}`).join(',');
        whereClause += ` AND w.id NOT IN (${placeholders})`;
        queryParams = queryParams.concat(practicedWordIds);
      }

      const query = `
        SELECT w.*, l.level_name, l.level_code, l.color
        FROM words w
        LEFT JOIN levels l ON l.level_code = w.difficulty_level
        ${whereClause}
        ORDER BY RANDOM()
        LIMIT $${queryParams.length + 1}
      `;

      queryParams.push(totalNeeded);

      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      console.error('❌ Error getting remaining words for speaking:', error);
      throw error;
    }
  },

  // Cập nhật total_words cho session
  updateSessionTotalWords: async (sessionId, totalWords) => {
    try {
      const query = `
        UPDATE speaking_sessions
        SET total_words = $2
        WHERE id = $1
        RETURNING id, total_words
      `;

      const result = await pool.query(query, [sessionId, totalWords]);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error updating session total words:', error);
      throw error;
    }
  },
};

module.exports = speakingModel;
