const { pool } = require('../config/database');
const UserModel = require('../models/user_model');
const speakingModel = require('../models/speaking_model');

async function testSpeakingSystem() {
  try {
    console.log('🧪 Testing speaking system...');

    // Lấy user đầu tiên để test
    const usersResult = await pool.query('SELECT id, username FROM users LIMIT 1');
    if (usersResult.rows.length === 0) {
      console.log('❌ No users found to test');
      return;
    }

    const testUser = usersResult.rows[0];
    console.log(`📋 Testing with user: ${testUser.username} (ID: ${testUser.id})`);

    // 1. Kiểm tra stats hiện tại
    console.log('\n1️⃣ Checking current user stats...');
    const currentStats = await UserModel.getUserWithStats(testUser.id);
    console.log(`Current streak: ${currentStats.streak_days} days`);
    console.log(`Last activity: ${currentStats.last_activity_date}`);
    console.log(`Lessons completed: ${currentStats.lessons_completed}`);
    console.log(`Words mastered: ${currentStats.words_mastered}`);
    console.log(`Total XP: ${currentStats.total_xp}`);

    // 2. Test speaking answer update
    console.log('\n2️⃣ Testing speaking answer update...');
    const testScore = 85; // Good score
    const xpBefore = currentStats.total_xp;

    const newXp = await UserModel.updateSpeakingAnswer(testUser.id, testScore);
    console.log(`XP updated from ${xpBefore} to ${newXp} (score: ${testScore})`);

    // 3. Test speaking completion
    console.log('\n3️⃣ Testing speaking completion...');
    const lessonsBefore = currentStats.lessons_completed;

    const newLessons = await UserModel.updateSpeakingCompletion(testUser.id);
    console.log(`Lessons completed updated from ${lessonsBefore} to ${newLessons}`);

    // 4. Test speaking word mastered
    console.log('\n4️⃣ Testing speaking word mastered...');
    const wordsBefore = currentStats.words_mastered;
    const testWordId = 1; // Assume word ID 1 exists

    const isNewWord = await UserModel.updateSpeakingWordMastered(testUser.id, testWordId, 80);
    console.log(`Word mastered result: ${isNewWord ? 'New word learned' : 'Word already known'}`);

    // 5. Verify final stats
    console.log('\n5️⃣ Verifying final stats...');
    const finalStats = await UserModel.getUserWithStats(testUser.id);
    console.log(`Final streak: ${finalStats.streak_days} days`);
    console.log(`Final lessons completed: ${finalStats.lessons_completed}`);
    console.log(`Final words mastered: ${finalStats.words_mastered}`);
    console.log(`Final total XP: ${finalStats.total_xp}`);

    // 6. Test speaking result simulation
    console.log('\n6️⃣ Testing full speaking result flow...');

    // Tạo dummy speaking session
    const dummySession = await speakingModel.createSpeakingSession(testUser.id, 'test', 'easy');
    console.log(`Created test session: ${dummySession.id}`);

    // Simulate speaking result
    const resultData = {
      sessionId: dummySession.id,
      userId: testUser.id,
      wordId: 2, // Different word ID
      referenceText: 'hello',
      spokenText: 'hello',
      overallScore: 90,
      audioUrl: null,
      feedbackText: 'Good pronunciation!'
    };

    const speakingResult = await speakingModel.saveSpeakingResult(resultData);
    console.log(`Speaking result saved with ID: ${speakingResult.id}`);

    // 7. Verify stats after speaking result
    console.log('\n7️⃣ Verifying stats after speaking result...');
    const afterSpeakingStats = await UserModel.getUserWithStats(testUser.id);
    console.log(`Stats after speaking:`)
    console.log(`  Streak: ${afterSpeakingStats.streak_days} days`);
    console.log(`  Total XP: ${afterSpeakingStats.total_xp}`);
    console.log(`  Words mastered: ${afterSpeakingStats.words_mastered}`);

    console.log('\n🎉 Speaking system test completed!');

  } catch (error) {
    console.error('❌ Error testing speaking system:', error);
    console.error(error.stack);
  }
}

// Chạy test nếu được gọi trực tiếp
if (require.main === module) {
  testSpeakingSystem()
    .then(() => {
      console.log('✅ Test completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testSpeakingSystem };
