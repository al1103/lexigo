const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class UserModel {
  // Tạo user mới
  static async create(userData) {
    try {
      const { username, email, password, full_name, level = 'beginner' } = userData;

      // Hash password
      const saltRounds = 10;
      const password_hash = await bcrypt.hash(password, saltRounds);

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

      // Verify password
      // const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      // if (!isPasswordValid) {
      //   throw new Error('Invalid password');
      // }

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

  // Cập nhật user profile
  static async updateProfile(id, updateData) {
    try {
      const { full_name, level } = updateData;

      const query = `
        UPDATE users
        SET full_name = COALESCE($2, full_name),
            level = COALESCE($3, level),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, username, email, full_name, level, total_points, streak_days, updated_at
      `;

      const result = await pool.query(query, [id, full_name, level]);
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

  // Cập nhật streak days
  static async updateStreak(id, streakDays) {
    try {
      const query = `
        UPDATE users
        SET streak_days = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING streak_days
      `;

      const result = await pool.query(query, [id, streakDays]);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating user streak:', error);
      throw error;
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

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

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
          u.id, u.username, u.email, u.full_name, u.level,
          u.total_points, u.streak_days, u.created_at, u.updated_at,
          us.words_learned, us.quizzes_completed, us.correct_answers, us.total_study_time
        FROM users u
        LEFT JOIN user_statistics us ON u.id = us.user_id
        WHERE u.id = $1
      `;

      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting user with stats:', error);
      throw error;
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
}

module.exports = UserModel;
