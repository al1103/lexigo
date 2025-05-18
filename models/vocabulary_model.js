const { pool } = require('../config/database');

const vocabularyModel = {
  // Create tables if they don't exist
  createTables: async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Create vocabulary table
      await client.query(`
        CREATE TABLE IF NOT EXISTS vocabularies (
          id SERIAL PRIMARY KEY,
          word VARCHAR(100) NOT NULL,
          pronunciation VARCHAR(100),
          part_of_speech VARCHAR(20),
          definition TEXT NOT NULL,
          example TEXT,
          image_url VARCHAR(255),
          audio_url VARCHAR(255),
          difficulty_level INTEGER DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create vocabulary categories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create vocabulary-category mapping table
      await client.query(`
        CREATE TABLE IF NOT EXISTS vocabulary_categories (
          vocabulary_id INTEGER REFERENCES vocabularies(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
          PRIMARY KEY (vocabulary_id, category_id)
        )
      `);

      await client.query('COMMIT');
      console.log('✅ Vocabulary tables created successfully');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Error creating vocabulary tables:', error);
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Add a new vocabulary word
  addVocabulary: async (vocabularyData) => {
    const { word, pronunciation, part_of_speech, definition, example, image_url, audio_url, difficulty_level, categories } = vocabularyData;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Insert vocabulary
      const vocabResult = await client.query(
        `INSERT INTO vocabularies 
         (word, pronunciation, part_of_speech, definition, example, image_url, audio_url, difficulty_level) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
         RETURNING id`,
        [word, pronunciation, part_of_speech, definition, example, image_url, audio_url, difficulty_level]
      );
      
      const vocabularyId = vocabResult.rows[0].id;
      
      // Add categories if provided
      if (categories && categories.length > 0) {
        for (const categoryData of categories) {
          // Ensure category ID is an integer
          const categoryId = typeof categoryData === 'object' ? parseInt(categoryData.id) : parseInt(categoryData);
          
          if (isNaN(categoryId)) {
            console.warn(`Skipping invalid category ID: ${categoryData}`);
            continue;
          }
          
          await client.query(
            'INSERT INTO vocabulary_categories (vocabulary_id, category_id) VALUES ($1, $2)',
            [vocabularyId, categoryId]
          );
        }
      }
      
      await client.query('COMMIT');
      return { success: true, id: vocabularyId };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error adding vocabulary:', error);
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Get vocabulary by id
  getVocabularyById: async (id) => {
    try {
      const result = await pool.query(
        `SELECT v.*, 
          (SELECT json_agg(c.*) FROM categories c 
           INNER JOIN vocabulary_categories vc ON c.id = vc.category_id 
           WHERE vc.vocabulary_id = v.id) as categories
         FROM vocabularies v
         WHERE v.id = $1`,
        [id]
      );
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error fetching vocabulary:', error);
      throw error;
    }
  },
  
  // Get all vocabularies with optional filtering
  getAllVocabularies: async (filters = {}) => {
    try {
      let query = `
        SELECT v.*, 
          (SELECT json_agg(c.*) FROM categories c 
           INNER JOIN vocabulary_categories vc ON c.id = vc.category_id 
           WHERE vc.vocabulary_id = v.id) as categories
        FROM vocabularies v
      `;
      
      const queryParams = [];
      const conditions = [];
      
      if (filters.difficulty_level) {
        queryParams.push(filters.difficulty_level);
        conditions.push(`difficulty_level = $${queryParams.length}`);
      }
      
      if (filters.category_id) {
        queryParams.push(filters.category_id);
        conditions.push(`EXISTS (SELECT 1 FROM vocabulary_categories vc WHERE vc.vocabulary_id = v.id AND vc.category_id = $${queryParams.length})`);
      }
      
      if (filters.search) {
        queryParams.push(`%${filters.search}%`);
        conditions.push(`(word ILIKE $${queryParams.length} OR definition ILIKE $${queryParams.length})`);
      }
      
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
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
      console.error('Error fetching vocabularies:', error);
      throw error;
    }
  },
  
  // Update vocabulary
  updateVocabulary: async (id, vocabularyData) => {
    const { word, pronunciation, part_of_speech, definition, example, image_url, audio_url, difficulty_level, categories } = vocabularyData;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        `UPDATE vocabularies 
         SET word = COALESCE($1, word),
             pronunciation = COALESCE($2, pronunciation),
             part_of_speech = COALESCE($3, part_of_speech),
             definition = COALESCE($4, definition),
             example = COALESCE($5, example),
             image_url = COALESCE($6, image_url),
             audio_url = COALESCE($7, audio_url),
             difficulty_level = COALESCE($8, difficulty_level),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $9`,
        [word, pronunciation, part_of_speech, definition, example, image_url, audio_url, difficulty_level, id]
      );
      
      // Update categories if provided
      if (categories) {
        // Remove existing category associations
        await client.query('DELETE FROM vocabulary_categories WHERE vocabulary_id = $1', [id]);
        
        // Add new category associations
        if (categories.length > 0) {
          for (const categoryData of categories) {
            // Ensure category ID is an integer
            const categoryId = typeof categoryData === 'object' ? parseInt(categoryData.id) : parseInt(categoryData);
            
            if (isNaN(categoryId)) {
              console.warn(`Skipping invalid category ID: ${categoryData}`);
              continue;
            }
            
            await client.query(
              'INSERT INTO vocabulary_categories (vocabulary_id, category_id) VALUES ($1, $2)',
              [id, categoryId]
            );
          }
        }
      }
      
      await client.query('COMMIT');
      return { success: true };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error updating vocabulary:', error);
      throw error;
    } finally {
      client.release();
    }
  },
  
  // Delete vocabulary
  deleteVocabulary: async (id) => {
    try {
      await pool.query('DELETE FROM vocabularies WHERE id = $1', [id]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting vocabulary:', error);
      throw error;
    }
  },
  
  // Category management
  addCategory: async (name, description) => {
    try {
      const result = await pool.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id',
        [name, description]
      );
      return { success: true, id: result.rows[0].id };
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  },
  
  getAllCategories: async () => {
    try {
      const result = await pool.query('SELECT * FROM categories');
      return result.rows;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }
};

module.exports = vocabularyModel; 