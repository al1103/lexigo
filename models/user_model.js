const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserModel {
  // Tạo user mới
  static async create(userData) {
    try {
      const { username, email, password, full_name, level = 'beginner' } = userData;

      // Use plain password (no hashing)
      const password_hash = password;

      const query = `
        INSERT INTO users (username, email, password_hash, full_name, level)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, full_name, level, total_points, streak_days, created_at
      `;

      const values = [username, email, password_hash, full_name, level];
      const result = await pool.query(query, values);

      // Tạo user statistics record
      await this.createUserStatistics(result.rows[0].id);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Đăng nhập
  static async login(email, password) {
    try {
      const query = `
        SELECT id, username, email, password_hash, full_name, level, total_points, streak_days
        FROM users
        WHERE email = $1
      `;

      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = result.rows[0];

      // Verify password (plain text comparison)
      const isPasswordValid = password === user.password_hash;

      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          username: user.username,
          email: user.email
        },
        process.env.JWT_SECRET || 'lexigo_secret_key',
        { expiresIn: '7d' }
      );

      // Remove password_hash from response
      delete user.password_hash;

      return { user, token };
    } catch (error) {
      console.error('Error logging in user:', error);
      throw error;
    }
  }

  // Tìm user theo email
  static async findByEmail(email) {
    try {
      const query = `
        SELECT id, username, email, full_name, level, total_points, streak_days, created_at, updated_at
        FROM users
        WHERE email = $1
      `;

      const result = await pool.query(query, [email]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      throw error;
    }
  }

  // Tìm user theo ID
  static async findById(id) {
    try {
      const query = `
        SELECT id, username, email, full_name, level, total_points, streak_days, created_at, updated_at
        FROM users
        WHERE id = $1
      `;

      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Tìm user theo username
  static async findByUsername(username) {
    try {
      const query = `
        SELECT id, username, email, full_name, level, total_points, streak_days, created_at, updated_at
        FROM users
        WHERE username = $1
      `;

      const result = await pool.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error finding user by username:', error);
      throw error;
    }
  }

  // Cập nhật user profile (EMAIL và AVATAR KHÔNG ĐƯỢC PHÉP UPDATE)
  static async updateProfile(id, updateData) {
    try {
      const { username, full_name, level } = updateData;

      console.log('🔧 UserModel.updateProfile:', {
        id,
        username,
        full_name,
        level,
        emailDisabled: 'Email updates are disabled for security',
        avatarDisabled: 'Avatar updates are disabled - use /upload-avatar instead'
      });

      const query = `
        UPDATE users
        SET username = COALESCE($2, username),
            full_name = COALESCE($3, full_name),
            level = COALESCE($4, level),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, username, email, full_name, avatar_id, level, total_points, streak_days, updated_at
      `;

      const result = await pool.query(query, [id, username, full_name, level]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Cập nhật điểm số và streak
  static async updatePoints(id, points) {
    try {
      const query = `
        UPDATE users
        SET total_points = total_points + $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING total_points
      `;

      const result = await pool.query(query, [id, points]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user points:', error);
      throw error;
    }
  }

  // Thêm method update streak
  static async updateStreak(userId) {
    try {
      // Logic mới: Update streak trong user_stats dựa trên last_activity_date
      const query = `
        INSERT INTO user_stats (user_id, streak_days, last_activity_date, updated_at)
        VALUES ($1, 1, CURRENT_DATE, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET
          streak_days = CASE
            WHEN user_stats.last_activity_date = CURRENT_DATE THEN user_stats.streak_days
            WHEN user_stats.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN user_stats.streak_days + 1
            WHEN user_stats.last_activity_date IS NULL THEN
              CASE
                WHEN user_stats.streak_days > 0 THEN user_stats.streak_days
                ELSE 1
              END
            ELSE 1
          END,
          last_activity_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
        RETURNING streak_days, last_activity_date
      `;

      const result = await pool.query(query, [userId]);

      // Cũng update streak_days trong users table để consistency
      try {
        await pool.query(
          'UPDATE users SET streak_days = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [result.rows[0]?.streak_days || 1, userId]
        );
      } catch (usersUpdateError) {
        console.log('Could not update users.streak_days, continuing...');
      }

      console.log(`🔥 Updated streak to ${result.rows[0]?.streak_days || 1} for user ${userId}`);
      return result.rows[0]?.streak_days || 1;
    } catch (error) {
      console.error('Error updating streak:', error);
      // Fallback: không throw error để không ảnh hưởng quiz flow
      return 1;
    }
  }

  // Đổi mật khẩu
  static async changePassword(id, currentPassword, newPassword) {
    try {
      // Lấy mật khẩu hiện tại
      const userQuery = `SELECT password_hash FROM users WHERE id = $1`;
      const userResult = await pool.query(userQuery, [id]);

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      // Verify current password (plain text comparison)
      const isCurrentPasswordValid = currentPassword === userResult.rows[0].password_hash;
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Use plain password (no hashing)
      const newPasswordHash = newPassword;

      // Update password
      const updateQuery = `
        UPDATE users
        SET password_hash = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, username, email, full_name
      `;

      const result = await pool.query(updateQuery, [id, newPasswordHash]);
      return result.rows[0];
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Tạo user statistics record
  static async createUserStatistics(userId) {
    try {
      const query = `
        INSERT INTO user_statistics (user_id, words_learned, quizzes_completed, correct_answers, total_study_time)
        VALUES ($1, 0, 0, 0, 0)
        RETURNING *
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating user statistics:', error);
      throw error;
    }
  }

  // Lấy user với statistics
  static async getUserWithStats(id) {
    try {
      const query = `
        SELECT
          u.*,
          COALESCE(us.streak_days, 0) as streak_days,
          COALESCE(us.total_xp, 0) as total_xp,
          COALESCE(us.words_learned, 0) as words_mastered,
          COALESCE(us.lessons_completed, 0) as lessons_completed,
          COALESCE(us.quizzes_passed, 0) as quizzes_passed,
          us.last_activity_date
        FROM users u
        LEFT JOIN user_stats us ON u.id = us.user_id
        WHERE u.id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];

      // Nếu user chưa có user_stats record, tự động tạo
      if (!user.last_activity_date && user.quizzes_passed === 0 && user.words_mastered === 0) {
        try {
          await this.initializeUserStats(id);
          console.log(`🔧 Auto-initialized user_stats for user ${id}`);

          // Query lại để lấy data đã có stats
          const retryResult = await pool.query(query, [id]);
          if (retryResult.rows.length > 0) {
            return retryResult.rows[0];
          }
        } catch (initError) {
          console.log('Could not auto-initialize user_stats, continuing with fallback...');
        }
      }

      return user;
    } catch (error) {
      console.error('Error getting user with stats:', error);

      // Fallback: nếu bảng user_stats chưa tồn tại, chỉ lấy user info
      try {
        const fallbackQuery = `
          SELECT
            *,
            0 as streak_days,
            0 as total_xp,
            0 as words_mastered,
            0 as lessons_completed,
            0 as quizzes_passed,
            null as last_activity_date
          FROM users
          WHERE id = $1
        `;
        const fallbackResult = await pool.query(fallbackQuery, [id]);
        return fallbackResult.rows[0] || null;
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
        throw error;
      }
    }
  }

  // Kiểm tra email đã tồn tại
  static async emailExists(email) {
    try {
      const query = `SELECT id FROM users WHERE email = $1`;
      const result = await pool.query(query, [email]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking email exists:', error);
      throw error;
    }
  }

  // Kiểm tra username đã tồn tại
  static async usernameExists(username) {
    try {
      const query = `SELECT id FROM users WHERE username = $1`;
      const result = await pool.query(query, [username]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking username exists:', error);
      throw error;
    }
  }

  // Lấy user theo rank - CHỈ SỬ DỤNG TABLE USERS
  static async getUserByRank(rank, type = 'global') {
    try {
      // Chỉ hỗ trợ global ranking dựa trên total_points
      const query = `
        SELECT
          u.id,
          u.username,
          u.full_name,
          u.email,
          u.level,
          u.total_points,
          u.streak_days,
          u.created_at,
          ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as current_rank
        FROM users u
        WHERE u.total_points > 0
        ORDER BY u.total_points DESC, u.created_at ASC
        LIMIT 1 OFFSET $1
      `;

      const result = await pool.query(query, [rank - 1]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by rank:', error);
      throw error;
    }
  }

  // Lấy top users theo rank - CHỈ SỬ DỤNG TABLE USERS
  static async getTopUsersByRank(limit = 10, type = 'global') {
    try {
      // Chỉ hỗ trợ global ranking dựa trên total_points
      const query = `
        SELECT
          u.id,
          u.username,
          u.full_name,
          u.level,
          u.total_points,
          u.streak_days,
          u.created_at,
          ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as rank
        FROM users u
        WHERE u.total_points > 0
        ORDER BY u.total_points DESC, u.created_at ASC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting top users by rank:', error);
      throw error;
    }
  }

  // Lấy users trong khoảng rank - CHỈ SỬ DỤNG TABLE USERS
  static async getUsersInRankRange(startRank, endRank, type = 'global') {
    try {
      // Chỉ hỗ trợ global ranking dựa trên total_points
      const query = `
        SELECT
          u.id,
          u.username,
          u.full_name,
          u.level,
          u.total_points,
          u.streak_days,
          u.created_at,
          ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as rank
        FROM users u
        WHERE u.total_points > 0
        ORDER BY u.total_points DESC, u.created_at ASC
        LIMIT $2 OFFSET $1
      `;

      const offset = startRank - 1;
      const limit = endRank - startRank + 1;
      const result = await pool.query(query, [offset, limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting users in rank range:', error);
      throw error;
    }
  }

  // Tìm rank của user - CHỈ SỬ DỤNG TABLE USERS
  static async getUserRank(userId, type = 'global') {
    try {
      // Chỉ hỗ trợ global ranking dựa trên total_points
      const query = `
        SELECT
          (SELECT COUNT(*) + 1 FROM users WHERE total_points > u.total_points) as rank,
          u.total_points as points
        FROM users u
        WHERE u.id = $1
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw error;
    }
  }

  // Lấy thông tin user với rank hiện tại
  static async getUserWithCurrentRank(userId) {
    try {
      const query = `
        SELECT
          u.id,
          u.username,
          u.full_name,
          u.email,
          u.level,
          u.total_points,
          u.streak_days,
          u.created_at,
          u.updated_at,
          (SELECT COUNT(*) + 1 FROM users WHERE total_points > u.total_points) as current_rank,
          (SELECT COUNT(*) FROM users WHERE total_points > 0) as total_ranked_users
        FROM users u
        WHERE u.id = $1
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user with current rank:', error);
      throw error;
    }
  }

  // Lấy thông tin rank chi tiết của user
  static async getUserRankDetails(userId) {
    try {
      const query = `
        SELECT
          u.id,
          u.username,
          u.full_name,
          u.total_points,
          (SELECT COUNT(*) + 1 FROM users WHERE total_points > u.total_points) as current_rank,
          (SELECT COUNT(*) FROM users WHERE total_points > 0) as total_ranked_users,
          (SELECT COUNT(*) FROM users WHERE total_points > u.total_points AND total_points > 0) as users_above,
          (SELECT COUNT(*) FROM users WHERE total_points < u.total_points AND total_points > 0) as users_below,
          CASE
            WHEN (SELECT COUNT(*) FROM users WHERE total_points > 0) = 0 THEN 0
            ELSE ROUND(
              ((SELECT COUNT(*) FROM users WHERE total_points < u.total_points AND total_points > 0)::decimal /
               (SELECT COUNT(*) FROM users WHERE total_points > 0)::decimal) * 100, 2
            )
          END as percentile_rank
        FROM users u
        WHERE u.id = $1
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user rank details:', error);
      throw error;
    }
  }

  // Lấy users xung quanh rank của user hiện tại
  static async getUsersAroundRank(userId, range = 2) {
    try {
      // Lấy rank hiện tại của user
      const userRankResult = await this.getUserRank(userId);
      if (!userRankResult) {
        return { currentUser: null, usersAround: [] };
      }

      const currentRank = userRankResult.rank;
      const startRank = Math.max(1, currentRank - range);
      const endRank = currentRank + range;

      const query = `
        WITH ranked_users AS (
          SELECT
            u.id,
            u.username,
            u.full_name,
            u.level,
            u.total_points,
            u.streak_days,
            ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as rank
          FROM users u
          WHERE u.total_points > 0
          ORDER BY u.total_points DESC, u.created_at ASC
        )
        SELECT *,
          CASE WHEN id = $1 THEN true ELSE false END as is_current_user
        FROM ranked_users
        WHERE rank BETWEEN $2 AND $3
        ORDER BY rank
      `;

      const result = await pool.query(query, [userId, startRank, endRank]);

      const currentUser = result.rows.find(user => user.is_current_user);
      const usersAround = result.rows;

      return {
        currentUser,
        usersAround,
        rank_range: {
          start: startRank,
          end: endRank,
          center: currentRank
        }
      };
    } catch (error) {
      console.error('Error getting users around rank:', error);
      throw error;
    }
  }

  // Thêm các methods mới cho ranking theo thời gian

  // Lấy user theo rank với nhiều loại ranking
  static async getUserByRank(rank, type = 'global', currentUserId = null) {
    try {
      let query, params;

      if (type === 'global') {
        query = `
          SELECT
            u.id, u.username, u.full_name, u.email, u.level,
            u.total_points, u.streak_days, u.created_at,
            ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as current_rank,
            CASE WHEN u.id = $2 THEN true ELSE false END as is_current_user
          FROM users u
          WHERE u.total_points > 0
          ORDER BY u.total_points DESC, u.created_at ASC
          LIMIT 1 OFFSET $1
        `;
        params = [rank - 1, currentUserId];
      } else if (type === 'weekly') {
        const currentWeek = await this.getCurrentPeriod('weekly');
        query = `
          SELECT
            u.id, u.username, u.full_name, u.email, u.level,
            u.total_points, u.streak_days, u.created_at,
            COALESCE(urp.points_earned, 0) as period_points,
            ROW_NUMBER() OVER (ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC) as current_rank,
            CASE WHEN u.id = $4 THEN true ELSE false END as is_current_user
          FROM users u
          LEFT JOIN user_ranking_periods urp ON u.id = urp.user_id
            AND urp.period_type = 'weekly'
            AND urp.period_year = $2
            AND urp.period_number = $3
          WHERE COALESCE(urp.points_earned, 0) > 0 OR u.total_points > 0
          ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC
          LIMIT 1 OFFSET $1
        `;
        params = [rank - 1, currentWeek.year, currentWeek.period, currentUserId];
      } else if (type === 'monthly') {
        const currentMonth = await this.getCurrentPeriod('monthly');
        query = `
          SELECT
            u.id, u.username, u.full_name, u.email, u.level,
            u.total_points, u.streak_days, u.created_at,
            COALESCE(urp.points_earned, 0) as period_points,
            ROW_NUMBER() OVER (ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC) as current_rank,
            CASE WHEN u.id = $4 THEN true ELSE false END as is_current_user
          FROM users u
          LEFT JOIN user_ranking_periods urp ON u.id = urp.user_id
            AND urp.period_type = 'monthly'
            AND urp.period_year = $2
            AND urp.period_number = $3
          WHERE COALESCE(urp.points_earned, 0) > 0 OR u.total_points > 0
          ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC
          LIMIT 1 OFFSET $1
        `;
        params = [rank - 1, currentMonth.year, currentMonth.period, currentUserId];
      } else {
        throw new Error('Invalid ranking type. Must be global, weekly, or monthly');
      }

      const result = await pool.query(query, params);
      const targetUser = result.rows[0] || null;

      // Lấy thông tin rank của current user nếu có
      let currentUserRank = null;
      if (currentUserId && targetUser && !targetUser.is_current_user) {
        currentUserRank = await this.getUserRank(currentUserId, type);
      }

      return {
        user: targetUser,
        currentUserRank: currentUserRank
      };
    } catch (error) {
      console.error('Error getting user by rank:', error);
      throw error;
    }
  }

  // Lấy top users với nhiều loại ranking
  static async getTopUsersByRank(limit = 10, type = 'global', currentUserId = null) {
    try {
      let query, params;

      if (type === 'global') {
        query = `
          SELECT
            u.id, u.username, u.full_name, u.level,
            u.total_points, u.streak_days, u.created_at,
            ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as rank,
            CASE WHEN u.id = $2 THEN true ELSE false END as is_current_user
          FROM users u
          WHERE u.total_points > 0
          ORDER BY u.total_points DESC, u.created_at ASC
          LIMIT $1
        `;
        params = [limit, currentUserId];
      } else if (type === 'weekly') {
        const currentWeek = await this.getCurrentPeriod('weekly');
        query = `
          SELECT
            u.id, u.username, u.full_name, u.level,
            u.total_points, u.streak_days, u.created_at,
            COALESCE(urp.points_earned, 0) as period_points,
            COALESCE(urp.quiz_completions, 0) as weekly_quiz_completions,
            COALESCE(urp.lesson_completions, 0) as weekly_lesson_completions,
            ROW_NUMBER() OVER (ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC) as rank,
            CASE WHEN u.id = $3 THEN true ELSE false END as is_current_user
          FROM users u
          LEFT JOIN user_ranking_periods urp ON u.id = urp.user_id
            AND urp.period_type = 'weekly'
            AND urp.period_year = $2
            AND urp.period_number = $4
          WHERE COALESCE(urp.points_earned, 0) > 0 OR u.total_points > 0
          ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC
          LIMIT $1
        `;
        params = [limit, currentWeek.year, currentUserId, currentWeek.period];
      } else if (type === 'monthly') {
        const currentMonth = await this.getCurrentPeriod('monthly');
        query = `
          SELECT
            u.id, u.username, u.full_name, u.level,
            u.total_points, u.streak_days, u.created_at,
            COALESCE(urp.points_earned, 0) as period_points,
            COALESCE(urp.quiz_completions, 0) as monthly_quiz_completions,
            COALESCE(urp.lesson_completions, 0) as monthly_lesson_completions,
            ROW_NUMBER() OVER (ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC) as rank,
            CASE WHEN u.id = $3 THEN true ELSE false END as is_current_user
          FROM users u
          LEFT JOIN user_ranking_periods urp ON u.id = urp.user_id
            AND urp.period_type = 'monthly'
            AND urp.period_year = $2
            AND urp.period_number = $4
          WHERE COALESCE(urp.points_earned, 0) > 0 OR u.total_points > 0
          ORDER BY COALESCE(urp.points_earned, 0) DESC, u.created_at ASC
          LIMIT $1
        `;
        params = [limit, currentMonth.year, currentUserId, currentMonth.period];
      } else {
        throw new Error('Invalid ranking type. Must be global, weekly, or monthly');
      }

      const result = await pool.query(query, params);

      // Tách current user và users khác
      const currentUser = result.rows.find(user => user.is_current_user);
      const allUsers = result.rows;

      // Nếu current user không có trong top list, lấy rank của họ
      let currentUserRank = null;
      if (currentUserId && !currentUser) {
        currentUserRank = await this.getUserRank(currentUserId, type);
        if (currentUserRank) {
          const userInfo = await this.findById(currentUserId);
          if (userInfo) {
            currentUserRank = {
              ...userInfo,
              rank: currentUserRank.rank,
              points: currentUserRank.points,
              is_current_user: true,
              in_top_list: false
            };
          }
        }
      }

      return {
        users: allUsers,
        currentUser: currentUser || null,
        currentUserRank: currentUserRank,
        topInfo: {
          limit: limit,
          total_returned: allUsers.length,
          has_current_user_in_top: !!currentUser,
          ranking_type: type
        }
      };
    } catch (error) {
      console.error('Error getting top users by rank:', error);
      throw error;
    }
  }

  // Lấy rank của user theo loại ranking
  static async getUserRank(userId, type = 'global') {
    try {
      let query, params;

      if (type === 'global') {
        query = `
          SELECT
            (SELECT COUNT(*) + 1 FROM users WHERE total_points > u.total_points) as rank,
            u.total_points as points
          FROM users u
          WHERE u.id = $1
        `;
        params = [userId];
      } else if (type === 'weekly') {
        const currentWeek = await this.getCurrentPeriod('weekly');
        query = `
          SELECT
            (SELECT COUNT(*) + 1
             FROM user_ranking_periods urp2
             JOIN users u2 ON urp2.user_id = u2.id
             WHERE urp2.period_type = 'weekly'
             AND urp2.period_year = $2
             AND urp2.period_number = $3
             AND urp2.points_earned > COALESCE(urp.points_earned, 0)) as rank,
            COALESCE(urp.points_earned, 0) as points
          FROM users u
          LEFT JOIN user_ranking_periods urp ON u.id = urp.user_id
            AND urp.period_type = 'weekly'
            AND urp.period_year = $2
            AND urp.period_number = $3
          WHERE u.id = $1
        `;
        params = [userId, currentWeek.year, currentWeek.period];
      } else if (type === 'monthly') {
        const currentMonth = await this.getCurrentPeriod('monthly');
        query = `
          SELECT
            (SELECT COUNT(*) + 1
             FROM user_ranking_periods urp2
             JOIN users u2 ON urp2.user_id = u2.id
             WHERE urp2.period_type = 'monthly'
             AND urp2.period_year = $2
             AND urp2.period_number = $3
             AND urp2.points_earned > COALESCE(urp.points_earned, 0)) as rank,
            COALESCE(urp.points_earned, 0) as points
          FROM users u
          LEFT JOIN user_ranking_periods urp ON u.id = urp.user_id
            AND urp.period_type = 'monthly'
            AND urp.period_year = $2
            AND urp.period_number = $3
          WHERE u.id = $1
        `;
        params = [userId, currentMonth.year, currentMonth.period];
      } else {
        throw new Error('Invalid ranking type. Must be global, weekly, or monthly');
      }

      const result = await pool.query(query, params);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user rank:', error);
      throw error;
    }
  }

  // Helper method để lấy period hiện tại
  static async getCurrentPeriod(type) {
    try {
      let query;

      if (type === 'weekly') {
        query = `SELECT * FROM get_current_week()`;
      } else if (type === 'monthly') {
        query = `SELECT * FROM get_current_month()`;
      } else {
        throw new Error('Invalid period type');
      }

      const result = await pool.query(query);
      const period = result.rows[0];

      return {
        year: period.year,
        period: type === 'weekly' ? period.week : period.month,
        start_date: period.start_date,
        end_date: period.end_date
      };
    } catch (error) {
      console.error('Error getting current period:', error);
      throw error;
    }
  }

  // Method để update điểm cho user (gọi từ quiz, speaking, v.v.)
  static async updateUserPoints(userId, points, activityType = 'quiz') {
    try {
      // Update total points
      await pool.query(
        'UPDATE users SET total_points = total_points + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [points, userId]
      );

      // Init ranking periods nếu chưa có (làm trước)
      try {
        await pool.query('SELECT init_user_ranking_periods($1)', [userId]);
      } catch (initError) {
        console.log('Init ranking periods info:', initError.message);
        // Bỏ qua lỗi init vì có thể đã tồn tại
      }

      // Update ranking periods
      try {
        await pool.query('SELECT update_user_ranking_points($1, $2, $3)', [userId, points, activityType]);
      } catch (rankingError) {
        if (rankingError.code === '23505') {
          console.log('Ranking constraint conflict - continuing...');
          // Bỏ qua lỗi unique constraint vì có thể do concurrent access
        } else {
          throw rankingError;
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating user points:', error);
      throw error;
    }
  }

  // Update words mastered khi user làm đúng
  static async updateWordsMastered(userId, wordId) {
    try {
      // Kiểm tra xem user đã học từ này chưa
      const checkQuery = `
        SELECT id FROM user_words_learned
        WHERE user_id = $1 AND word_id = $2
      `;
      const checkResult = await pool.query(checkQuery, [userId, wordId]);

      if (checkResult.rows.length === 0) {
        // Chưa học từ này, thêm vào bảng user_words_learned
        await pool.query(
          `INSERT INTO user_words_learned (user_id, word_id, learned_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id, word_id) DO NOTHING`,
          [userId, wordId]
        );

        // Cập nhật user_stats nếu bảng tồn tại
        try {
          await pool.query(
            `INSERT INTO user_stats (user_id, words_learned)
             VALUES ($1, 1)
             ON CONFLICT (user_id)
             DO UPDATE SET
               words_learned = user_stats.words_learned + 1,
               updated_at = CURRENT_TIMESTAMP`,
            [userId]
          );
        } catch (statsError) {
          console.log('User stats table not available yet');
        }

        return true; // Từ mới được học
      }

      return false; // Từ đã được học trước đó
    } catch (error) {
      console.error('Error updating words mastered:', error);
      throw error;
    }
  }

  // Thêm function update quiz completion statistics
  static async updateQuizCompletion(userId) {
    try {
      // Tạo hoặc update user_stats record
      const query = `
        INSERT INTO user_stats (user_id, quizzes_passed, last_activity_date, updated_at)
        VALUES ($1, 1, CURRENT_DATE, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET
          quizzes_passed = user_stats.quizzes_passed + 1,
          last_activity_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
        RETURNING quizzes_passed
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0]?.quizzes_passed || 1;
    } catch (error) {
      console.error('Error updating quiz completion:', error);
      // Không throw error để không ảnh hưởng đến flow chính
      console.log('User stats table not available yet, continuing...');
      return 0;
    }
  }

  // Thêm function update quiz answer statistics
  static async updateQuizAnswer(userId, isCorrect = false) {
    try {
      // Tạo hoặc update user_stats record
      const query = `
        INSERT INTO user_stats (user_id, total_xp, last_activity_date, updated_at)
        VALUES ($1, $2, CURRENT_DATE, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET
          total_xp = user_stats.total_xp + $2,
          last_activity_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
        RETURNING total_xp
      `;

      // Cộng XP: 10 điểm nếu đúng, 2 điểm nếu sai (để khuyến khích thử)
      const xpToAdd = isCorrect ? 10 : 2;
      const result = await pool.query(query, [userId, xpToAdd]);
      return result.rows[0]?.total_xp || xpToAdd;
    } catch (error) {
      console.error('Error updating quiz answer stats:', error);
      // Không throw error để không ảnh hưởng đến flow chính
      console.log('User stats table not available yet, continuing...');
      return 0;
    }
  }

  // Function để initialize user_stats nếu chưa có
  static async initializeUserStats(userId) {
    try {
      const query = `
        INSERT INTO user_stats (user_id, created_at, updated_at)
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id) DO NOTHING
        RETURNING user_id
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error initializing user stats:', error);
      // Không throw để tránh crash app
      return null;
    }
  }

  // 🎤 SPEAKING STATISTICS FUNCTIONS

  // Update speaking completion statistics
  static async updateSpeakingCompletion(userId) {
    try {
      // Tạo hoặc update user_stats record cho speaking completion
      const query = `
        INSERT INTO user_stats (user_id, lessons_completed, last_activity_date, updated_at)
        VALUES ($1, 1, CURRENT_DATE, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET
          lessons_completed = user_stats.lessons_completed + 1,
          last_activity_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
        RETURNING lessons_completed
      `;

      const result = await pool.query(query, [userId]);
      return result.rows[0]?.lessons_completed || 1;
    } catch (error) {
      console.error('Error updating speaking completion:', error);
      // Không throw error để không ảnh hưởng đến flow chính
      console.log('User stats table not available yet, continuing...');
      return 0;
    }
  }

  // Update speaking answer statistics (mỗi từ được nói)
  static async updateSpeakingAnswer(userId, score = 0) {
    try {
      // Tạo hoặc update user_stats record cho speaking answer
      const query = `
        INSERT INTO user_stats (user_id, total_xp, last_activity_date, updated_at)
        VALUES ($1, $2, CURRENT_DATE, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id)
        DO UPDATE SET
          total_xp = user_stats.total_xp + $2,
          last_activity_date = CURRENT_DATE,
          updated_at = CURRENT_TIMESTAMP
        RETURNING total_xp
      `;

      // Tính XP dựa trên điểm speaking (0-100)
      let xpToAdd = 0;
      if (score >= 80) {
        xpToAdd = 15; // Excellent pronunciation
      } else if (score >= 60) {
        xpToAdd = 10; // Good pronunciation
      } else if (score >= 40) {
        xpToAdd = 5;  // Fair pronunciation
      } else {
        xpToAdd = 2;  // Effort points
      }

      const result = await pool.query(query, [userId, xpToAdd]);
      return result.rows[0]?.total_xp || xpToAdd;
    } catch (error) {
      console.error('Error updating speaking answer stats:', error);
      // Không throw error để không ảnh hưởng đến flow chính
      console.log('User stats table not available yet, continuing...');
      return 0;
    }
  }

  // Update speaking word mastered (từ phát âm tốt)
  static async updateSpeakingWordMastered(userId, wordId, score = 0) {
    try {
      // Chỉ count là mastered nếu score >= 70 (phát âm tốt)
      if (score < 70) {
        return false;
      }

      // Kiểm tra xem user đã học từ này chưa
      const checkQuery = `
        SELECT id FROM user_words_learned
        WHERE user_id = $1 AND word_id = $2
      `;
      const checkResult = await pool.query(checkQuery, [userId, wordId]);

      if (checkResult.rows.length === 0) {
        // Chưa học từ này, thêm vào bảng user_words_learned
        await pool.query(
          `INSERT INTO user_words_learned (user_id, word_id, learned_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id, word_id) DO NOTHING`,
          [userId, wordId]
        );

        // Cập nhật user_stats nếu bảng tồn tại
        try {
          await pool.query(
            `INSERT INTO user_stats (user_id, words_learned)
             VALUES ($1, 1)
             ON CONFLICT (user_id)
             DO UPDATE SET
               words_learned = user_stats.words_learned + 1,
               updated_at = CURRENT_TIMESTAMP`,
            [userId]
          );
        } catch (statsError) {
          console.log('User stats table not available yet');
        }

        return true; // Từ mới được học qua speaking
      }

      return false; // Từ đã được học trước đó
    } catch (error) {
      console.error('Error updating speaking words mastered:', error);
      throw error;
    }
  }

  // Cập nhật user (profile, avatar_id, ...)
  static async updateUser(userId, { fullName, phoneNumber, address, avatar_id }) {
    try {
      const query = `
        UPDATE users
        SET
          full_name = COALESCE($2, full_name),
          phone_number = COALESCE($3, phone_number),
          address = COALESCE($4, address),
          avatar_id = COALESCE($5, avatar_id),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, username, email, full_name, phone_number, address, avatar_id, level, total_points, streak_days, updated_at
      `;
      const result = await pool.query(query, [userId, fullName, phoneNumber, address, avatar_id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }

  // ADMIN: Lấy tất cả users
  static async getAllUsers() {
    try {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // ADMIN: Lấy user theo id
  static async getUserByIdAdmin(id) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by id (admin):', error);
      throw error;
    }
  }

  // ADMIN: Cập nhật user (role, trạng thái, ...)
  static async updateUserAdmin(id, { full_name, level, role, is_active }) {
    try {
      const query = `
        UPDATE users
        SET full_name = COALESCE($2, full_name),
            level = COALESCE($3, level),
            role = COALESCE($4, role),
            is_active = COALESCE($5, is_active),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [id, full_name, level, role, is_active]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user (admin):', error);
      throw error;
    }
  }

  // ADMIN: Xóa user
  static async deleteUser(id) {
    try {
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = UserModel;
