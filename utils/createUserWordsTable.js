const { pool } = require('../config/database');

async function createUserWordsTable() {
  try {
    console.log('🔧 Creating user_words_learned table...');

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_words_learned (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        word_id INTEGER,
        learned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, word_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_words_learned_user_id ON user_words_learned(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_words_learned_word_id ON user_words_learned(word_id);
    `);

    console.log('✅ user_words_learned table created successfully');
    return { success: true };
  } catch (error) {
    console.error('❌ Error creating user_words_learned table:', error.message);
    return { success: false, error: error.message };
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  createUserWordsTable()
    .then(result => {
      if (result.success) {
        console.log('✅ Script completed successfully');
        process.exit(0);
      } else {
        console.error('❌ Script failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

module.exports = { createUserWordsTable };
