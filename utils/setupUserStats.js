const userStatsModel = require('../models/user_stats_model');

async function setupUserStats() {
  try {
    console.log('🔧 Setting up user stats tables...');

    // Tạo các bảng user stats
    await userStatsModel.createTables();

    console.log('✅ User stats tables created successfully!');

    // Tạo một số achievements mẫu
    const sampleAchievements = [
      {
        name: 'First Steps',
        description: 'Complete your first lesson',
        icon_url: '🎯',
        xp_reward: 50,
        requirement_type: 'lessons_completed',
        requirement_value: 1
      },
      {
        name: 'Streak Starter',
        description: 'Maintain a 3-day learning streak',
        icon_url: '🔥',
        xp_reward: 100,
        requirement_type: 'streak_days',
        requirement_value: 3
      },
      {
        name: 'Quiz Master',
        description: 'Pass 10 quizzes',
        icon_url: '🧠',
        xp_reward: 200,
        requirement_type: 'quizzes_passed',
        requirement_value: 10
      },
      {
        name: 'Word Collector',
        description: 'Learn 50 new words',
        icon_url: '📚',
        xp_reward: 300,
        requirement_type: 'words_learned',
        requirement_value: 50
      },
      {
        name: 'Dedicated Learner',
        description: 'Maintain a 7-day learning streak',
        icon_url: '⭐',
        xp_reward: 500,
        requirement_type: 'streak_days',
        requirement_value: 7
      }
    ];

    console.log('📊 Creating sample achievements...');
    for (const achievement of sampleAchievements) {
      try {
        await userStatsModel.createAchievement(achievement);
        console.log(`✅ Created achievement: ${achievement.name}`);
      } catch (error) {
        console.log(`⚠️ Achievement may already exist: ${achievement.name}`);
      }
    }

    console.log('🎉 User stats setup completed!');

  } catch (error) {
    console.error('❌ Error setting up user stats:', error);
    throw error;
  }
}

// Chạy setup nếu file được chạy trực tiếp
if (require.main === module) {
  setupUserStats()
    .then(() => {
      console.log('Setup completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupUserStats };
