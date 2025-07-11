const { pool } = require('../config/database');
const UserModel = require('../models/user_model');

async function testStreakSystem() {
  try {
    console.log('🧪 Testing streak system...');

    // Lấy user đầu tiên để test
    const usersResult = await pool.query('SELECT id, username FROM users LIMIT 1');
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found to test');
      return;
    }

    const testUser = usersResult.rows[0];
    console.log(`📋 Testing with user: ${testUser.username} (ID: ${testUser.id})`);

    // 1. Kiểm tra streak hiện tại
    console.log('\n1️⃣ Checking current user stats...');
    const currentStats = await UserModel.getUserWithStats(testUser.id);
    console.log(`Current streak: ${currentStats.streak_days} days`);
    console.log(`Last activity: ${currentStats.last_activity_date}`);
    console.log(`Quizzes passed: ${currentStats.quizzes_passed}`);

    // 2. Test update streak
    console.log('\n2️⃣ Testing streak update...');
    const newStreak = await UserModel.updateStreak(testUser.id);
    console.log(`New streak returned: ${newStreak} days`);

    // 3. Verify sau khi update
    console.log('\n3️⃣ Verifying after update...');
    const updatedStats = await UserModel.getUserWithStats(testUser.id);
    console.log(`Updated streak: ${updatedStats.streak_days} days`);
    console.log(`Updated last activity: ${updatedStats.last_activity_date}`);

    // 4. Kiểm tra consistency giữa users và user_stats
    console.log('\n4️⃣ Checking consistency between tables...');
    const userRow = await pool.query('SELECT streak_days FROM users WHERE id = $1', [testUser.id]);
    const userStatsRow = await pool.query('SELECT streak_days FROM user_stats WHERE user_id = $1', [testUser.id]);

    console.log(`users.streak_days: ${userRow.rows[0]?.streak_days || 'NULL'}`);
    console.log(`user_stats.streak_days: ${userStatsRow.rows[0]?.streak_days || 'NULL'}`);

    if (userRow.rows[0]?.streak_days === userStatsRow.rows[0]?.streak_days) {
      console.log('✅ Streak consistency: PASS');
    } else {
      console.log('❌ Streak consistency: FAIL');
    }

    // 5. Test logic streak khi activity cùng ngày
    console.log('\n5️⃣ Testing same-day activity...');
    const sameDay1 = await UserModel.updateStreak(testUser.id);
    const sameDay2 = await UserModel.updateStreak(testUser.id);

    if (sameDay1 === sameDay2) {
      console.log('✅ Same-day streak logic: PASS (streak not incremented)');
    } else {
      console.log('❌ Same-day streak logic: FAIL (streak incremented incorrectly)');
    }

    console.log('\n🎉 Streak system test completed!');

  } catch (error) {
    console.error('❌ Error testing streak system:', error);
  }
}

// Chạy test nếu được gọi trực tiếp
if (require.main === module) {
  testStreakSystem()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testStreakSystem };
