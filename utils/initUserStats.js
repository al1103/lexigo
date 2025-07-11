const { pool } = require('../config/database');

async function initUserStatsTable() {
  const client = await pool.connect();

  try {
    console.log('🔧 Initializing user_stats table...');

    // Tạo bảng user_stats nếu chưa có
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_stats (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        streak_days INTEGER DEFAULT 0,
        total_xp INTEGER DEFAULT 0,
        words_learned INTEGER DEFAULT 0,
        lessons_completed INTEGER DEFAULT 0,
        quizzes_passed INTEGER DEFAULT 0,
        last_activity_date DATE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ user_stats table created successfully');

    // Tạo trigger để auto-update updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_user_stats_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    await client.query(`
      DROP TRIGGER IF EXISTS update_user_stats_updated_at_trigger ON user_stats;
      CREATE TRIGGER update_user_stats_updated_at_trigger
          BEFORE UPDATE ON user_stats
          FOR EACH ROW
          EXECUTE FUNCTION update_user_stats_updated_at();
    `);

    console.log('✅ Trigger for auto-updating updated_at created');

    // Migrate existing users - tạo record user_stats cho user đã có
    const result = await client.query(`
      INSERT INTO user_stats (user_id, created_at, updated_at)
      SELECT id, created_at, updated_at
      FROM users
      WHERE id NOT IN (SELECT user_id FROM user_stats)
      ON CONFLICT (user_id) DO NOTHING
      RETURNING user_id
    `);

    console.log(`✅ Migrated ${result.rows.length} existing users to user_stats`);

    // Cập nhật dữ liệu thống kê từ data hiện có
    console.log('📊 Updating existing quiz statistics...');

    // Kiểm tra bảng user_quiz_sessions tồn tại
    const checkQuizTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_quiz_sessions'
      );
    `);

    if (checkQuizTable.rows[0].exists) {
      await client.query(`
        UPDATE user_stats
        SET quizzes_passed = (
          SELECT COUNT(DISTINCT qs.id)
          FROM user_quiz_sessions qs
          WHERE qs.user_id = user_stats.user_id
          AND qs.is_completed = TRUE
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id IN (
          SELECT DISTINCT user_id FROM user_quiz_sessions WHERE is_completed = TRUE
        )
      `);
      console.log('✅ Updated quiz statistics from existing user_quiz_sessions');
    } else {
      console.log('⚠️ user_quiz_sessions table not found, skipping quiz stats update');
    }

    // Kiểm tra bảng user_words_learned tồn tại
    const checkWordsTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'user_words_learned'
      );
    `);

    if (checkWordsTable.rows[0].exists) {
      await client.query(`
        UPDATE user_stats
        SET words_learned = (
          SELECT COUNT(DISTINCT uwl.word_id)
          FROM user_words_learned uwl
          WHERE uwl.user_id = user_stats.user_id
        ),
        updated_at = CURRENT_TIMESTAMP
        WHERE user_id IN (
          SELECT DISTINCT user_id FROM user_words_learned
        )
      `);
      console.log('✅ Updated words learned statistics from existing user_words_learned');
    } else {
      console.log('⚠️ user_words_learned table not found, skipping words stats update');
    }

    console.log('🎉 User stats initialization completed successfully!');

    return {
      success: true,
      message: 'User stats table initialized successfully'
    };

  } catch (error) {
    console.error('❌ Error initializing user stats:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  initUserStatsTable()
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

module.exports = { initUserStatsTable };
