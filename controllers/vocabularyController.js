const { pool } = require('../config/database');

const vocabularyController = {
  // Initialize database tables
  initializeVocabularyTables: async (req, res) => {
    try {
      // Kiểm tra xem tables đã tồn tại chưa
      const checkQuery = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('categories', 'words', 'word_translations')
      `;
      const result = await pool.query(checkQuery);

      if (result.rows.length >= 3) {
        return res.status(200).json({
          status: 'success',
          message: 'Vocabulary tables already exist'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Vocabulary tables initialized successfully'
      });
    } catch (error) {
      console.error('Error initializing vocabulary tables:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to initialize vocabulary tables'
      });
    }
  },

  // Add new vocabulary
  addVocabulary: async (req, res) => {
    try {
      const {
        word,
        pronunciation,
        meaning,
        definition,
        example_sentence,
        category_id,
        difficulty_level = 'easy',
        audio_url,
        image_url
      } = req.body;

      if (!word || !meaning) {
        return res.status(400).json({
          status: 'error',
          message: 'Word and meaning are required'
        });
      }

      const query = `
        INSERT INTO words (
          word, pronunciation, meaning, definition, example_sentence,
          category_id, difficulty_level, audio_url, image_url
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `;

      const values = [
        word,
        pronunciation,
        meaning,
        definition,
        example_sentence,
        category_id,
        difficulty_level,
        audio_url,
        image_url
      ];

      const result = await pool.query(query, values);

      res.status(201).json({
        status: 'success',
        message: 'Vocabulary added successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error adding vocabulary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add vocabulary'
      });
    }
  },

  // Get vocabulary by ID
  getVocabularyById: async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        SELECT w.*, c.name as category_name, c.color as category_color
        FROM words w
        LEFT JOIN categories c ON w.category_id = c.id
        WHERE w.id = $1 AND w.is_active = TRUE
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Vocabulary not found'
        });
      }

      res.status(200).json({
        status: 'success',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error getting vocabulary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get vocabulary'
      });
    }
  },

  // Get all vocabularies with optional filtering
  getAllVocabularies: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        category_id,
        difficulty_level,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      let whereConditions = ['w.is_active = TRUE'];
      let queryParams = [];
      let paramIndex = 1;

      if (category_id) {
        whereConditions.push(`w.category_id = $${paramIndex}`);
        queryParams.push(category_id);
        paramIndex++;
      }

      if (difficulty_level) {
        whereConditions.push(`w.difficulty_level = $${paramIndex}`);
        queryParams.push(difficulty_level);
        paramIndex++;
      }

      if (search) {
        whereConditions.push(`(w.word ILIKE $${paramIndex} OR w.meaning ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Count total records
      const countQuery = `
        SELECT COUNT(*) as total
        FROM words w
        WHERE ${whereClause}
      `;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const query = `
        SELECT w.*, c.name as category_name, c.color as category_color
        FROM words w
        LEFT JOIN categories c ON w.category_id = c.id
        WHERE ${whereClause}
        ORDER BY w.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await pool.query(query, queryParams);

      res.status(200).json({
        status: 'success',
        data: {
          data: result.rows,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: total,
            totalPages: Math.ceil(total / limit),
            hasNext: (offset + parseInt(limit)) < total,
            hasPrev: offset > 0
          }
        }
      });
    } catch (error) {
      console.error('Error getting vocabularies:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get vocabularies'
      });
    }
  },

  // Update vocabulary
  updateVocabulary: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        word,
        pronunciation,
        meaning,
        definition,
        example_sentence,
        category_id,
        difficulty_level,
        audio_url,
        image_url
      } = req.body;

      const query = `
        UPDATE words SET
          word = $1,
          pronunciation = $2,
          meaning = $3,
          definition = $4,
          example_sentence = $5,
          category_id = $6,
          difficulty_level = $7,
          audio_url = $8,
          image_url = $9
        WHERE id = $10 AND is_active = TRUE
        RETURNING *
      `;

      const values = [
        word,
        pronunciation,
        meaning,
        definition,
        example_sentence,
        category_id,
        difficulty_level,
        audio_url,
        image_url,
        id
      ];

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Vocabulary not found'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Vocabulary updated successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating vocabulary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to update vocabulary'
      });
    }
  },

  // Delete vocabulary (soft delete)
  deleteVocabulary: async (req, res) => {
    try {
      const { id } = req.params;

      const query = `
        UPDATE words SET is_active = FALSE
        WHERE id = $1 AND is_active = TRUE
        RETURNING id, word
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Vocabulary not found'
        });
      }

      res.status(200).json({
        status: 'success',
        message: 'Vocabulary deleted successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to delete vocabulary'
      });
    }
  },

  // Add category
  addCategory: async (req, res) => {
    try {
      const { name, description, icon, color } = req.body;

      if (!name) {
        return res.status(400).json({
          status: 'error',
          message: 'Category name is required'
        });
      }

      const query = `
        INSERT INTO categories (name, description, icon, color)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;

      const values = [name, description, icon, color];
      const result = await pool.query(query, values);

      res.status(201).json({
        status: 'success',
        message: 'Category added successfully',
        data: result.rows[0]
      });
    } catch (error) {
      console.error('Error adding category:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to add category'
      });
    }
  },

  // Get all categories
  getAllCategories: async (req, res) => {
    try {
      const query = `
        SELECT c.*, COUNT(w.id) as word_count
        FROM categories c
        LEFT JOIN words w ON c.id = w.category_id AND w.is_active = TRUE
        WHERE c.is_active = TRUE
        GROUP BY c.id
        ORDER BY c.sort_order, c.name
      `;

      const result = await pool.query(query);

      res.status(200).json({
        status: 'success',
        data: result.rows
      });
    } catch (error) {
      console.error('Error getting categories:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get categories'
      });
    }
  }
};

module.exports = vocabularyController;
