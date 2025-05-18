const { pool } = require('../config/database');

const userStatsModel = {
  // Create user stats tables
  createTables: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create user stats table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_stats (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          streak_days INTEGER DEFAULT 0,
          last_activity_date DATE,
          total_xp INTEGER DEFAULT 0,
          words_learned INTEGER DEFAULT 0,
          lessons_completed INTEGER DEFAULT 0,
          quizzes_passed INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id)
        )
      `);

      // Create achievements table
      await client.query(`
        CREATE TABLE IF NOT EXISTS achievements (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          icon_url VARCHAR(255),
          xp_reward INTEGER DEFAULT 0,
          requirement_type VARCHAR(50) NOT NULL, -- e.g., lessons_completed, streak_days, words_learned
          requirement_value INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create user achievements table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_achievements (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
          unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, achievement_id)
        )
      `);

      // Create vocabulary learning status tracking
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_vocabulary (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          vocabulary_id INTEGER REFERENCES vocabularies(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'new', -- new, learning, mastered
          familiarity_level INTEGER DEFAULT 0, -- 0-5 scale
          last_reviewed TIMESTAMP,
          next_review TIMESTAMP,
          review_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, vocabulary_id)
        )
      `);

      await client.query('COMMIT');
      console.log('✅ User stats tables created successfully');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating user stats tables:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Initialize user stats when a new user is created
  initializeUserStats: async (userId) => {
    try {
      await pool.query(
        `INSERT INTO user_stats
         (user_id, last_activity_date)
         VALUES ($1, CURRENT_DATE)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId]
      );
      return { success: true };
    } catch (error) {
      console.error('Error initializing user stats:', error);
      throw error;
    }
  },

  // Get user stats
  getUserStats: async (userId) => {
    try {
      const result = await pool.query(
        'SELECT * FROM user_stats WHERE user_id = $1',
        [userId]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  },

  // Update user streak and activity
  updateUserActivity: async (userId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Get current user stats
      const statsResult = await client.query(
        'SELECT * FROM user_stats WHERE user_id = $1',
        [userId]
      );
      
      if (statsResult.rows.length === 0) {
        // Initialize stats if not exists
        await client.query(
          `INSERT INTO user_stats
           (user_id, streak_days, last_activity_date)
           VALUES ($1, 1, CURRENT_DATE)`,
          [userId]
        );
      } else {
        const stats = statsResult.rows[0];
        const lastActivity = new Date(stats.last_activity_date);
        const today = new Date();
        
        // Reset timezone information for date comparison
        lastActivity.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        // Calculate days difference
        const daysDiff = Math.floor((today - lastActivity) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          // Already logged in today, no streak update needed
          // Just update the last activity timestamp
          await client.query(
            `UPDATE user_stats
             SET updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [userId]
          );
        } else if (daysDiff === 1) {
          // Consecutive day, increase streak
          await client.query(
            `UPDATE user_stats
             SET streak_days = streak_days + 1,
                 last_activity_date = CURRENT_DATE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [userId]
          );
          
          // Check for streak achievements
          await checkAndAwardAchievements(client, userId, 'streak_days');
        } else {
          // Streak broken, reset to 1
          await client.query(
            `UPDATE user_stats
             SET streak_days = 1,
                 last_activity_date = CURRENT_DATE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [userId]
          );
        }
      }
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating user activity:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Award XP to user
  awardXP: async (userId, amount, reason = '') => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update user stats
      await client.query(
        `UPDATE user_stats
         SET total_xp = total_xp + $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2`,
        [amount, userId]
      );
      
      // Check for XP-related achievements
      await checkAndAwardAchievements(client, userId, 'total_xp');
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error awarding XP:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Track lesson completion
  trackLessonCompletion: async (userId, lessonId) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Update user stats
      await client.query(
        `UPDATE user_stats
         SET lessons_completed = lessons_completed + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1`,
        [userId]
      );
      
      // Check for lesson completion achievements
      await checkAndAwardAchievements(client, userId, 'lessons_completed');
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error tracking lesson completion:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Track quiz completion
  trackQuizCompletion: async (userId, quizId, passed) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (passed) {
        // Update user stats
        await client.query(
          `UPDATE user_stats
           SET quizzes_passed = quizzes_passed + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [userId]
        );
        
        // Check for quiz achievements
        await checkAndAwardAchievements(client, userId, 'quizzes_passed');
      }
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error tracking quiz completion:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Track vocabulary learning
  trackVocabularyLearning: async (userId, vocabularyId, status = 'learning') => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Check if this vocabulary exists for user
      const existingVocab = await client.query(
        'SELECT * FROM user_vocabulary WHERE user_id = $1 AND vocabulary_id = $2',
        [userId, vocabularyId]
      );
      
      if (existingVocab.rows.length === 0) {
        // First time learning this word
        await client.query(
          `INSERT INTO user_vocabulary
           (user_id, vocabulary_id, status, familiarity_level, last_reviewed, next_review, review_count)
           VALUES ($1, $2, $3, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 day', 1)`,
          [userId, vocabularyId, status]
        );
        
        // Update user stats for new word
        await client.query(
          `UPDATE user_stats
           SET words_learned = words_learned + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [userId]
        );
        
        // Check for vocabulary achievements
        await checkAndAwardAchievements(client, userId, 'words_learned');
      } else {
        const vocab = existingVocab.rows[0];
        let familiarity = vocab.familiarity_level;
        let nextReviewInterval = '1 day';
        
        if (status === 'mastered') {
          familiarity = 5; // Max familiarity
          nextReviewInterval = '30 days';
        } else if (vocab.status !== 'mastered') {
          // Only increase familiarity if not already mastered
          familiarity = Math.min(5, vocab.familiarity_level + 1);
          
          // Adjust next review based on familiarity
          switch(familiarity) {
            case 1: nextReviewInterval = '1 day'; break;
            case 2: nextReviewInterval = '3 days'; break;
            case 3: nextReviewInterval = '7 days'; break;
            case 4: nextReviewInterval = '14 days'; break;
            case 5: nextReviewInterval = '30 days'; break;
          }
        }
        
        // Update the vocabulary status
        await client.query(
          `UPDATE user_vocabulary
           SET status = $1,
               familiarity_level = $2,
               last_reviewed = CURRENT_TIMESTAMP,
               next_review = CURRENT_TIMESTAMP + INTERVAL '${nextReviewInterval}',
               review_count = review_count + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $3 AND vocabulary_id = $4`,
          [status, familiarity, userId, vocabularyId]
        );
        
        // If word has been mastered for the first time
        if (status === 'mastered' && vocab.status !== 'mastered') {
          await client.query(
            `UPDATE user_stats
             SET words_learned = words_learned + 1,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1`,
            [userId]
          );
          
          // Check for vocabulary achievements
          await checkAndAwardAchievements(client, userId, 'words_learned');
        }
      }
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error tracking vocabulary learning:', error);
      throw error;
    } finally {
      client.release();
    }
  },

  // Get vocabulary to review
  getVocabularyToReview: async (userId, limit = 20) => {
    try {
      const result = await pool.query(
        `SELECT uv.*, v.word, v.definition, v.pronunciation, v.part_of_speech, v.example, 
                v.image_url, v.audio_url
         FROM user_vocabulary uv
         JOIN vocabularies v ON uv.vocabulary_id = v.id
         WHERE uv.user_id = $1 AND uv.next_review <= CURRENT_TIMESTAMP
         ORDER BY uv.next_review ASC
         LIMIT $2`,
        [userId, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting vocabulary to review:', error);
      throw error;
    }
  },

  // Get all user vocabulary
  getUserVocabulary: async (userId, filters = {}) => {
    try {
      let query = `
        SELECT uv.*, v.word, v.definition, v.pronunciation, v.part_of_speech, v.example, 
               v.image_url, v.audio_url
        FROM user_vocabulary uv
        JOIN vocabularies v ON uv.vocabulary_id = v.id
        WHERE uv.user_id = $1
      `;
      
      const queryParams = [userId];
      const conditions = [];
      
      if (filters.status) {
        queryParams.push(filters.status);
        conditions.push(`uv.status = $${queryParams.length}`);
      }
      
      if (filters.familiarity_level) {
        queryParams.push(filters.familiarity_level);
        conditions.push(`uv.familiarity_level = $${queryParams.length}`);
      }
      
      if (filters.category_id) {
        queryParams.push(filters.category_id);
        conditions.push(`EXISTS (
          SELECT 1 FROM vocabulary_categories vc 
          WHERE vc.vocabulary_id = uv.vocabulary_id AND vc.category_id = $${queryParams.length}
        )`);
      }
      
      if (conditions.length > 0) {
        query += ' AND ' + conditions.join(' AND ');
      }
      
      if (filters.sort_by === 'last_reviewed') {
        query += ' ORDER BY uv.last_reviewed DESC';
      } else if (filters.sort_by === 'next_review') {
        query += ' ORDER BY uv.next_review ASC';
      } else {
        query += ' ORDER BY v.word ASC';
      }
      
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
      console.error('Error getting user vocabulary:', error);
      throw error;
    }
  },

  // Get user achievements
  getUserAchievements: async (userId) => {
    try {
      const result = await pool.query(
        `SELECT ua.unlocked_at, a.* 
         FROM user_achievements ua
         JOIN achievements a ON ua.achievement_id = a.id
         WHERE ua.user_id = $1
         ORDER BY ua.unlocked_at DESC`,
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting user achievements:', error);
      throw error;
    }
  },

  // Create achievements
  createAchievement: async (achievementData) => {
    const { name, description, icon_url, xp_reward, requirement_type, requirement_value } = achievementData;
    
    try {
      const result = await pool.query(
        `INSERT INTO achievements
         (name, description, icon_url, xp_reward, requirement_type, requirement_value)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [name, description, icon_url, xp_reward, requirement_type, requirement_value]
      );
      
      return { success: true, id: result.rows[0].id };
    } catch (error) {
      console.error('Error creating achievement:', error);
      throw error;
    }
  },

  // Get leaderboard
  getLeaderboard: async (limit = 10) => {
    try {
      const result = await pool.query(
        `SELECT u.id, u.username, u.avatar_url, us.total_xp, us.streak_days, us.words_learned, 
                us.lessons_completed, us.quizzes_passed
         FROM user_stats us
         JOIN users u ON us.user_id = u.id
         ORDER BY us.total_xp DESC
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  }
};

// Helper function to check and award achievements
async function checkAndAwardAchievements(client, userId, achievementType) {
  try {
    // Get user's current stats
    const statsResult = await client.query(
      'SELECT * FROM user_stats WHERE user_id = $1',
      [userId]
    );
    
    if (statsResult.rows.length === 0) {
      return;
    }
    
    const stats = statsResult.rows[0];
    
    // Find eligible achievements
    const achievementsResult = await client.query(
      `SELECT * FROM achievements 
       WHERE requirement_type = $1 AND requirement_value <= $2
       AND NOT EXISTS (
         SELECT 1 FROM user_achievements 
         WHERE user_id = $3 AND achievement_id = achievements.id
       )`,
      [
        achievementType,
        stats[achievementType], // The value from stats
        userId
      ]
    );
    
    // Award any eligible achievements
    for (const achievement of achievementsResult.rows) {
      // Add to user achievements
      await client.query(
        `INSERT INTO user_achievements
         (user_id, achievement_id)
         VALUES ($1, $2)`,
        [userId, achievement.id]
      );
      
      // Award XP if applicable
      if (achievement.xp_reward > 0) {
        await client.query(
          `UPDATE user_stats
           SET total_xp = total_xp + $1
           WHERE user_id = $2`,
          [achievement.xp_reward, userId]
        );
      }
    }
    
    // Return new achievements
    return achievementsResult.rows;
  } catch (error) {
    console.error('Error checking achievements:', error);
    throw error;
  }
}

module.exports = userStatsModel; 