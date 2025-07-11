const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function setupWordsTracking() {
  try {
    console.log('🔧 Setting up words tracking tables...');

    // Đọc file SQL
    const sqlFile = path.join(__dirname, '../database/user_words_tracking.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Thực thi SQL
    await pool.query(sql);

    console.log('✅ Words tracking tables created successfully!');

    // Kiểm tra dữ liệu
    const result = await pool.query('SELECT COUNT(*) as count FROM user_words_learned');
    console.log(`📊 Current words learned records: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error setting up words tracking:', error);
    throw error;
  }
}

// Chạy setup nếu file được chạy trực tiếp
if (require.main === module) {
  setupWordsTracking()
    .then(() => {
      console.log('Words tracking setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupWordsTracking };
