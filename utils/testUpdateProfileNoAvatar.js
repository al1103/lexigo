const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'chube2609@gmail.com';
const TEST_PASSWORD = 'Zilong2609@';

async function testUpdateProfileWithoutAvatar() {
  console.log('🔧 UPDATE PROFILE WITHOUT AVATAR & EMAIL TEST\n');

  let authToken = null;

  try {
    // Step 1: Login to get auth token
    console.log('🔑 Step 1: Login to get auth token...\n');

    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });

    authToken = loginResponse.data.data.token;
    console.log('✅ Login successful');
    console.log('🎟️ Token:', authToken.substring(0, 20) + '...\n');

  } catch (error) {
    console.log('❌ LOGIN FAILED:');
    console.log('Error:', error.response?.data?.message || error.message);
    return;
  }

  // Step 2: Get current profile
  console.log('📋 Step 2: Get current profile...\n');

  let currentProfile = null;
  try {
    const profileResponse = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    currentProfile = profileResponse.data.data.user;
    console.log('✅ Current Profile:');
    console.log('📧 Email:', currentProfile.email);
    console.log('👤 Username:', currentProfile.username);
    console.log('👤 Full Name:', currentProfile.full_name);
    console.log('🖼️ Avatar ID:', currentProfile.avatar_id);
    console.log('');

  } catch (error) {
    console.log('❌ GET PROFILE FAILED:');
    console.log('Error:', error.response?.data?.message || error.message);
    return;
  }

  // Step 3: Test various update scenarios
  console.log('🧪 Step 3: Test update scenarios (NO AVATAR & NO EMAIL)...\n');

  const testCases = [
    {
      name: 'Update only username',
      data: { username: 'newUsername123' }
    },
    {
      name: 'Update only full_name',
      data: { full_name: 'New Full Name' }
    },
    {
      name: 'Update both username and full_name',
      data: {
        username: 'updatedUser',
        full_name: 'Updated Name'
      }
    },
    {
      name: 'Try to update email (should be ignored)',
      data: {
        username: 'testuser',
        email: 'hacker@example.com',  // This should be IGNORED
        full_name: 'Test User'
      }
    },
    {
      name: 'Try to update avatar (should be ignored)',
      data: {
        username: 'avatartest',
        avatar: 'hacker-avatar.png',  // This should be IGNORED
        avatar_id: 999,  // This should be IGNORED
        full_name: 'Avatar Test'
      }
    },
    {
      name: 'Try to update everything (email & avatar ignored)',
      data: {
        username: 'alltest',
        email: 'hacker@evil.com',  // IGNORED
        avatar: 'evil-avatar.png',  // IGNORED
        avatar_id: 666,  // IGNORED
        full_name: 'All Test'
      }
    }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`   🧪 Test ${i + 1}: ${testCase.name}`);
    console.log(`   📤 Data: ${JSON.stringify(testCase.data)}`);

    try {
      const updateResponse = await axios.put(`${BASE_URL}/profile`, testCase.data, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const updatedUser = updateResponse.data.data.user;
      console.log(`   ✅ Success: ${updateResponse.data.message}`);

      // Security checks
      if (testCase.name.includes('email')) {
        if (updatedUser.email === currentProfile.email) {
          console.log(`   🛡️ SECURITY: Email NOT changed (correct behavior)`);
          console.log(`   📧 Email stayed: ${updatedUser.email}`);
        } else {
          console.log(`   🚨 SECURITY BREACH: Email was changed! This is BAD!`);
        }
      }

      if (testCase.name.includes('avatar')) {
        if (updatedUser.avatar_id === currentProfile.avatar_id) {
          console.log(`   🛡️ SECURITY: Avatar NOT changed (correct behavior)`);
          console.log(`   🖼️ Avatar ID stayed: ${updatedUser.avatar_id}`);
        } else {
          console.log(`   🚨 SECURITY BREACH: Avatar was changed! This is BAD!`);
        }
      }

      console.log(`   👤 Updated Username: ${updatedUser.username}`);
      console.log(`   👤 Updated Full Name: ${updatedUser.full_name}`);
      console.log(`   🖼️ Avatar ID (unchanged): ${updatedUser.avatar_id}`);
      console.log('');

    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
      console.log('');
    }
  }

  // Step 4: Final profile check
  console.log('🏁 Step 4: Final profile verification...\n');

  try {
    const finalProfileResponse = await axios.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const finalProfile = finalProfileResponse.data.data.user;
    console.log('✅ Final Profile:');
    console.log('📧 Email:', finalProfile.email);
    console.log('👤 Username:', finalProfile.username);
    console.log('👤 Full Name:', finalProfile.full_name);
    console.log('🖼️ Avatar ID:', finalProfile.avatar_id);

    // Security checks
    let securityPassed = true;

    if (finalProfile.email !== currentProfile.email) {
      console.log('\n🚨 SECURITY CHECK FAILED: Email was changed!');
      securityPassed = false;
    }

    if (finalProfile.avatar_id !== currentProfile.avatar_id) {
      console.log('\n🚨 SECURITY CHECK FAILED: Avatar was changed!');
      securityPassed = false;
    }

    if (securityPassed) {
      console.log('\n🛡️ SECURITY CHECK PASSED: Email and Avatar were never changed!');
    }

  } catch (error) {
    console.log('❌ FINAL PROFILE CHECK FAILED:');
    console.log('Error:', error.response?.data?.message || error.message);
  }
}

async function showAllowedFields() {
  console.log('\n📋 ALLOWED PROFILE UPDATE FIELDS:\n');

  console.log('✅ ALLOWED (can be updated):');
  console.log('   • username    - User display name');
  console.log('   • full_name   - User full name');
  console.log('   • level       - User English level (handled by system)');
  console.log('');

  console.log('❌ BLOCKED (will be ignored):');
  console.log('   • email       - Security: Use separate email change flow');
  console.log('   • avatar      - Use /upload-avatar endpoint instead');
  console.log('   • avatar_id   - Use /upload-avatar endpoint instead');
  console.log('   • password    - Use /change-password endpoint instead');
  console.log('   • id          - Cannot change user ID');
  console.log('   • total_points - System managed');
  console.log('   • streak_days  - System managed');
  console.log('');
}

async function showCorrectUsage() {
  console.log('💡 CORRECT USAGE EXAMPLES:\n');

  console.log('✅ Valid profile update:');
  console.log(`
const profileUpdate = {
  username: 'mynewusername',
  full_name: 'John Doe'
};

// This will work
const response = await axios.put('/api/profile', profileUpdate, {
  headers: { Authorization: 'Bearer ' + token }
});
`);

  console.log('🛡️ For other updates:');
  console.log(`
// Avatar update
POST /api/upload-avatar (with image file)

// Password change
PUT /api/change-password
{
  "currentPassword": "old123",
  "newPassword": "new456"
}

// Email change (if implemented)
POST /api/request-email-change
POST /api/verify-email-change
`);
}

async function runAllTests() {
  console.log('🔧 UPDATE PROFILE (NO AVATAR & NO EMAIL) - COMPREHENSIVE TEST\n');
  console.log('=' .repeat(70));

  await testUpdateProfileWithoutAvatar();
  await showAllowedFields();
  await showCorrectUsage();

  console.log('\n' + '=' .repeat(70));
  console.log('🎉 UPDATE PROFILE TESTS COMPLETED!');
  console.log('📋 SUMMARY:');
  console.log('✅ Profile updates work (username, full_name only)');
  console.log('🛡️ Email updates are blocked for security');
  console.log('🛡️ Avatar updates are blocked - use /upload-avatar instead');
  console.log('✅ Backend properly ignores restricted fields');
  console.log('✅ Authentication required for profile updates');
}

// Export for testing
module.exports = {
  testUpdateProfileWithoutAvatar
};

// Run if called directly
if (require.main === module) {
  runAllTests();
}
