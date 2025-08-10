const { pool } = require('../config/database');

class GrammarModel {
  // Lấy tất cả bài viết ngữ pháp với phân trang
  static async getAll(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        difficulty = null,
        category = null,
        search = null
      } = options;

      const offset = (page - 1) * limit;

      let query = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time, view_count, created_at
        FROM grammar_articles
        WHERE is_published = true
      `;

      const queryParams = [];
      let paramCount = 0;

      // Thêm điều kiện lọc theo độ khó
      if (difficulty) {
        paramCount++;
        query += ` AND difficulty_level = $${paramCount}`;
        queryParams.push(difficulty);
      }

      // Thêm điều kiện lọc theo danh mục
      if (category) {
        paramCount++;
        query += ` AND category ILIKE $${paramCount}`;
        queryParams.push(`%${category}%`);
      }

      // Thêm điều kiện tìm kiếm
      if (search) {
        paramCount++;
        query += ` AND (title ILIKE $${paramCount} OR content ILIKE $${paramCount})`;
        queryParams.push(`%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      queryParams.push(limit, offset);

      const result = await pool.query(query, queryParams);

      // Đếm tổng số bài viết cho phân trang
      let countQuery = `
        SELECT COUNT(*) as total
        FROM grammar_articles
        WHERE is_published = true
      `;

      const countParams = [];
      let countParamIndex = 0;

      if (difficulty) {
        countParamIndex++;
        countQuery += ` AND difficulty_level = $${countParamIndex}`;
        countParams.push(difficulty);
      }

      if (category) {
        countParamIndex++;
        countQuery += ` AND category ILIKE $${countParamIndex}`;
        countParams.push(`%${category}%`);
      }

      if (search) {
        countParamIndex++;
        countQuery += ` AND (title ILIKE $${countParamIndex} OR content ILIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
      }

      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        articles: result.rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error getting grammar articles:', error);
      throw error;
    }
  }

  // Lấy bài viết theo ID
  static async getById(id) {
    try {
      const query = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time, view_count, created_at
        FROM grammar_articles
        WHERE id = $1 AND is_published = true
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      // Tăng view count
      await this.incrementViewCount(id);

      return result.rows[0];
    } catch (error) {
      console.error('Error getting grammar article by ID:', error);
      throw error;
    }
  }

  // Lấy bài viết theo danh mục
  static async getByCategory(category, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time, view_count, created_at
        FROM grammar_articles
        WHERE category ILIKE $1 AND is_published = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [`%${category}%`, limit, offset]);

      // Đếm tổng số bài viết trong danh mục
      const countQuery = `
        SELECT COUNT(*) as total
        FROM grammar_articles
        WHERE category ILIKE $1 AND is_published = true
      `;

      const countResult = await pool.query(countQuery, [`%${category}%`]);
      const total = parseInt(countResult.rows[0].total);

      return {
        articles: result.rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error getting grammar articles by category:', error);
      throw error;
    }
  }

  // Lấy bài viết theo độ khó
  static async getByDifficulty(difficulty, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time, view_count, created_at
        FROM grammar_articles
        WHERE difficulty_level = $1 AND is_published = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await pool.query(query, [difficulty, limit, offset]);

      // Đếm tổng số bài viết theo độ khó
      const countQuery = `
        SELECT COUNT(*) as total
        FROM grammar_articles
        WHERE difficulty_level = $1 AND is_published = true
      `;

      const countResult = await pool.query(countQuery, [difficulty]);
      const total = parseInt(countResult.rows[0].total);

      return {
        articles: result.rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error getting grammar articles by difficulty:', error);
      throw error;
    }
  }

  // Tìm kiếm bài viết
  static async search(keyword, options = {}) {
    try {
      const { page = 1, limit = 10 } = options;
      const offset = (page - 1) * limit;

      const query = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time, view_count, created_at
        FROM grammar_articles
        WHERE (title ILIKE $1 OR content ILIKE $1 OR $1 = ANY(tags))
        AND is_published = true
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;

      const searchTerm = `%${keyword}%`;
      const result = await pool.query(query, [searchTerm, limit, offset]);

      // Đếm tổng số kết quả tìm kiếm
      const countQuery = `
        SELECT COUNT(*) as total
        FROM grammar_articles
        WHERE (title ILIKE $1 OR content ILIKE $1 OR $1 = ANY(tags))
        AND is_published = true
      `;

      const countResult = await pool.query(countQuery, [searchTerm]);
      const total = parseInt(countResult.rows[0].total);

      return {
        articles: result.rows,
        pagination: {
          current_page: page,
          total_pages: Math.ceil(total / limit),
          total_items: total,
          items_per_page: limit
        }
      };
    } catch (error) {
      console.error('Error searching grammar articles:', error);
      throw error;
    }
  }

  // Lấy các danh mục có sẵn
  static async getCategories() {
    try {
      const query = `
        SELECT DISTINCT category
        FROM grammar_articles
        WHERE is_published = true AND category IS NOT NULL
        ORDER BY category
      `;

      const result = await pool.query(query);
      return result.rows.map(row => row.category);
    } catch (error) {
      console.error('Error getting grammar categories:', error);
      throw error;
    }
  }

  // Lấy bài viết phổ biến (theo view count)
  static async getPopular(limit = 5) {
    try {
      const query = `
        SELECT id, title, content, difficulty_level, category, tags, reading_time, view_count, created_at
        FROM grammar_articles
        WHERE is_published = true
        ORDER BY view_count DESC, created_at DESC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error getting popular grammar articles:', error);
      throw error;
    }
  }

  // Tăng view count
  static async incrementViewCount(id) {
    try {
      const query = `
        UPDATE grammar_articles
        SET view_count = view_count + 1
        WHERE id = $1
      `;

      await pool.query(query, [id]);
    } catch (error) {
      console.error('Error incrementing view count:', error);
      throw error;
    }
  }

  // Tạo bài viết mới (chỉ dành cho admin)
  static async create(articleData) {
    try {
      const {
        title,
        content,
        difficulty_level = 'beginner',
        category,
        tags = [],
        reading_time,
        is_published = true
      } = articleData;

      const query = `
        INSERT INTO grammar_articles (title, content, difficulty_level, category, tags, reading_time, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, content, difficulty_level, category, tags, reading_time, created_at
      `;

      const values = [title, content, difficulty_level, category, tags, reading_time, is_published];
      const result = await pool.query(query, values);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating grammar article:', error);
      throw error;
    }
  }

  // Cập nhật bài viết (chỉ dành cho admin)
  static async update(id, articleData) {
    try {
      const {
        title,
        content,
        difficulty_level,
        category,
        tags,
        reading_time,
        is_published
      } = articleData;

      const query = `
        UPDATE grammar_articles
        SET title = $1, content = $2, difficulty_level = $3, category = $4,
            tags = $5, reading_time = $6, is_published = $7, updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        RETURNING id, title, content, difficulty_level, category, tags, reading_time, updated_at
      `;

      const values = [title, content, difficulty_level, category, tags, reading_time, is_published, id];
      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error updating grammar article:', error);
      throw error;
    }
  }

  // Xóa bài viết (chỉ dành cho admin)
  static async delete(id) {
    try {
      const query = `DELETE FROM grammar_articles WHERE id = $1 RETURNING id`;
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error deleting grammar article:', error);
      throw error;
    }
  }
}

module.exports = GrammarModel;
