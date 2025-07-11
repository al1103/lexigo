const UserModel = require('../models/user_model');

async function simpleTest() {
  try {
    console.log('🧪 Simple streak test...');

    // Test với user ID 1
    const userId = 1;

    console.log('📊 Before update:');
    const before = await UserModel.getUserWithStats(userId);
    console.log(`  Streak: ${before.streak_days} days`);
    console.log(`  Last activity: ${before.last_activity_date}`);

    console.log('\n🔄 Updating streak...');
    const newStreak = await UserModel.updateStreak(userId);
    console.log(`  Returned: ${newStreak} days`);

    console.log('\n📊 After update:');
    const after = await UserModel.getUserWithStats(userId);
    console.log(`  Streak: ${after.streak_days} days`);
    console.log(`  Last activity: ${after.last_activity_date}`);

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  }
}

simpleTest().then(() => process.exit(0));
