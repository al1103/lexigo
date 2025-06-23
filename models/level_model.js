const { pool } = require('../config/database');

class LevelModel {
  // Lấy tất cả levels
  static async getAllLevels() {
    try {
      const query = `
        SELECT
          id, level_code, level_name, level_name_vi,
          description, description_vi, color, icon,
          min_score, max_score, sort_order, is_active
        FROM levels
        WHERE is_active = TRUE
        ORDER BY sort_order ASC
      `;

      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Error getting all levels:', error);
      throw error;
    }
  }

  // Lấy level theo code
  static async getLevelByCode(levelCode) {
    try {
      const query = `
        SELECT
          id, level_code, level_name, level_name_vi,
          description, description_vi, color, icon,
          min_score, max_score, sort_order
        FROM levels
        WHERE level_code = $1 AND is_active = TRUE
      `;

      const result = await pool.query(query, [levelCode]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting level by code:', error);
      throw error;
    }
  }

  // Lấy level theo điểm số
  static async getLevelByScore(score) {
    try {
      const query = `
        SELECT
          id, level_code, level_name, level_name_vi,
          description, description_vi, color, icon,
          min_score, max_score, sort_order
        FROM levels
        WHERE $1 >= min_score AND $1 <= max_score AND is_active = TRUE
        ORDER BY sort_order ASC
        LIMIT 1
      `;

      const result = await pool.query(query, [score]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting level by score:', error);
      throw error;
    }
  }

  // Lấy level tiếp theo
  static async getNextLevel(currentLevelCode) {
    try {
      const query = `
        SELECT
          l2.id, l2.level_code, l2.level_name, l2.level_name_vi,
          l2.description, l2.description_vi, l2.color, l2.icon,
          l2.min_score, l2.max_score, l2.sort_order
        FROM levels l1
        JOIN levels l2 ON l2.sort_order = l1.sort_order + 1
        WHERE l1.level_code = $1 AND l1.is_active = TRUE AND l2.is_active = TRUE
      `;

      const result = await pool.query(query, [currentLevelCode]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting next level:', error);
      throw error;
    }
  }

  // Lấy statistics cho tất cả levels
  static async getLevelsWithStats() {
    try {
      const query = `
        SELECT
          l.id, l.level_code, l.level_name, l.level_name_vi,
          l.description, l.description_vi, l.color, l.icon,
          l.min_score, l.max_score, l.sort_order,
          COUNT(DISTINCT u.id) as user_count,
          COUNT(DISTINCT w.id) as word_count,
          COUNT(DISTINCT qq.id) as question_count
        FROM levels l
        LEFT JOIN users u ON u.level = l.level_code
        LEFT JOIN words w ON w.difficulty_level = l.level_code AND w.is_active = TRUE
        LEFT JOIN quiz_questions qq ON qq.difficulty_level = l.level_code AND qq.is_active = TRUE
        WHERE l.is_active = TRUE
        GROUP BY l.id, l.level_code, l.level_name, l.level_name_vi,
                 l.description, l.description_vi, l.color, l.icon,
                 l.min_score, l.max_score, l.sort_order
        ORDER BY l.sort_order ASC
      `;

      const result = await pool.query(query);
      return result.rows.map(row => ({
        ...row,
        user_count: parseInt(row.user_count),
        word_count: parseInt(row.word_count),
        question_count: parseInt(row.question_count)
      }));
    } catch (error) {
      console.error('Error getting levels with stats:', error);
      throw error;
    }
  }

  // Kiểm tra level code có tồn tại không
  static async levelExists(levelCode) {
    try {
      const query = `SELECT id FROM levels WHERE level_code = $1 AND is_active = TRUE`;
      const result = await pool.query(query, [levelCode]);
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking level existence:', error);
      throw error;
    }
  }

  // Tạo level mới
  static async createLevel(levelData) {
    try {
      const {
        level_code, level_name, level_name_vi, description, description_vi,
        color, icon, min_score, max_score, sort_order
      } = levelData;

      const query = `
        INSERT INTO levels (
          level_code, level_name, level_name_vi, description, description_vi,
          color, icon, min_score, max_score, sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const values = [
        level_code, level_name, level_name_vi, description, description_vi,
        color, icon, min_score, max_score, sort_order
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error creating level:', error);
      throw error;
    }
  }

  // Cập nhật level
  static async updateLevel(id, updateData) {
    try {
      const {
        level_name, level_name_vi, description, description_vi,
        color, icon, min_score, max_score, sort_order, is_active
      } = updateData;

      const query = `
        UPDATE levels
        SET
          level_name = COALESCE($2, level_name),
          level_name_vi = COALESCE($3, level_name_vi),
          description = COALESCE($4, description),
          description_vi = COALESCE($5, description_vi),
          color = COALESCE($6, color),
          icon = COALESCE($7, icon),
          min_score = COALESCE($8, min_score),
          max_score = COALESCE($9, max_score),
          sort_order = COALESCE($10, sort_order),
          is_active = COALESCE($11, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `;

      const values = [
        id, level_name, level_name_vi, description, description_vi,
        color, icon, min_score, max_score, sort_order, is_active
      ];

      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Error updating level:', error);
      throw error;
    }
  }

  // Lấy level theo ID - THÊM METHOD MỚI
  static async getLevelById(id) {
    try {
      console.log('🔍 Finding level by ID:', id);

      const query = `
        SELECT
          id, level_code, level_name, level_name_vi,
          description, description_vi, color, icon,
          min_score, max_score, sort_order
        FROM levels
        WHERE id = $1 AND is_active = TRUE
      `;

      const result = await pool.query(query, [id]);
      console.log('📊 getLevelById result count:', result.rows.length);

      if (result.rows.length > 0) {
        console.log('✅ Level found by ID:', { id: result.rows[0].id, code: result.rows[0].level_code });
      } else {
        console.log('❌ No level found with ID:', id);
      }

      return result.rows[0] || null;
    } catch (error) {
      console.error('❌ Error finding level by ID:', error);
      throw error;
    }
  }
}

module.exports = LevelModel;
