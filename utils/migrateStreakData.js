const { pool } = require('../config/database');

async function migrateStreakData() {
  try {
    console.log('🔄 Migrating streak data from users to user_stats...');

    const result = await pool.query(`
      UPDATE user_stats
      SET
        streak_days = u.streak_days,
        updated_at = CURRENT_TIMESTAMP
      FROM users u
      WHERE user_stats.user_id = u.id
        AND u.streak_days > 0
        AND (user_stats.streak_days IS NULL OR user_stats.streak_days = 0)
      RETURNING user_stats.user_id, user_stats.streak_days
    `);

    console.log(`✅ Migrated streak data for ${result.rows.length} users`);

    // Log chi tiết
    if (result.rows.length > 0) {
      console.log('📊 Migrated users:');
      result.rows.forEach(row => {
        console.log(`  - User ${row.user_id}: ${row.streak_days} days`);
      });
    }

    return {
      success: true,
      migratedUsers: result.rows.length,
      details: result.rows
    };

  } catch (error) {
    console.error('❌ Error migrating streak data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  migrateStreakData()
    .then(result => {
      if (result.success) {
        console.log(`✅ Migration completed successfully! ${result.migratedUsers} users updated.`);
        process.exit(0);
      } else {
        console.error('❌ Migration failed:', result.error);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}

module.exports = { migrateStreakData };
