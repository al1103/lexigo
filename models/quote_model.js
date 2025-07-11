const { pool } = require('../config/database');


class QuoteModel {
  static async getDailyQuote() {
    try {
      // Lấy ngày hiện tại (yyyy-mm-dd)
      const today = new Date().toISOString().split('T')[0];

      // Tạo seed dựa trên ngày (đơn giản và ổn định)
      const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));

      // Query đơn giản với OFFSET dựa trên ngày
      const countQuery = `SELECT COUNT(*) as total FROM quotes`;
      const countResult = await pool.query(countQuery);
      const totalQuotes = parseInt(countResult.rows[0].total);

      if (totalQuotes === 0) {
        return null;
      }

      // Tính offset dựa trên ngày để đảm bảo mỗi ngày có quote khác nhau
      const offset = dayOfYear % totalQuotes;

      const query = `
        SELECT
          q.id,
          q.content,
          q.author,
          q.created_at
        FROM quotes q
        ORDER BY q.id
        LIMIT 1 OFFSET $1
      `;

      const result = await pool.query(query, [offset]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting daily quote:', error);

      // Fallback: nếu có lỗi, dùng random đơn giản
      try {
        const fallbackQuery = `
          SELECT
            q.id,
            q.content,
            q.author,
            q.created_at
          FROM quotes q
          ORDER BY RANDOM()
          LIMIT 1
        `;

        const result = await pool.query(fallbackQuery);
        return result.rows[0] || null;
      } catch (fallbackError) {
        console.error('Error in fallback daily quote:', fallbackError);
        throw fallbackError;
      }
    }
  }

  // ADMIN: Lấy tất cả quotes
  static async getAllQuotes() {
    try {
      const result = await pool.query('SELECT * FROM quotes ORDER BY id DESC');
      return result.rows;
    } catch (error) {
      console.error('Error getting all quotes:', error);
      throw error;
    }
  }

  // ADMIN: Thêm quote mới
  static async createQuote({ content, author }) {
    try {
      const result = await pool.query(
        'INSERT INTO quotes (content, author, created_at) VALUES ($1, $2, NOW()) RETURNING *',
        [content, author]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error creating quote:', error);
      throw error;
    }
  }

  // ADMIN: Sửa quote
  static async updateQuote(id, { content, author }) {
    try {
      const result = await pool.query(
        'UPDATE quotes SET content = COALESCE($2, content), author = COALESCE($3, author) WHERE id = $1 RETURNING *',
        [id, content, author]
      );
      return result.rows[0];
    } catch (error) {
      console.error('Error updating quote:', error);
      throw error;
    }
  }

  // ADMIN: Xóa quote
  static async deleteQuote(id) {
    try {
      const result = await pool.query('DELETE FROM quotes WHERE id = $1 RETURNING id', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('Error deleting quote:', error);
      throw error;
    }
  }
}

module.exports = QuoteModel;
