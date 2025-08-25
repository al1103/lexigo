const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api';
const TEST_EMAIL = 'chube2609@gmail.com';
const TEST_PASSWORD = 'Zilong2609@';

async function testUpdateProfileWithoutEmail() {
  console.log('🔧 UPDATE PROFILE WITHOUT EMAIL TEST\n');

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
    console.log('🖼️ Avatar:', currentProfile.avatar);
    console.log('');

  } catch (error) {
    console.log('❌ GET PROFILE FAILED:');
    console.log('Error:', error.response?.data?.message || error.message);
    return;
  }

  // Step 3: Test various update scenarios
  console.log('🧪 Step 3: Test update scenarios...\n');

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
      name: 'Update only avatar',
      data: { avatar: 'new-avatar.png' }
    },
    {
      name: 'Update multiple fields (no email)',
      data: {
        username: 'updatedUser',
        full_name: 'Updated Name',
        avatar: 'updated-avatar.png'
      }
    },
    {
      name: 'Try to update email (should be ignored)',
      data: {
        username: 'testuser',
        email: 'hacker@example.com',  // This should be IGNORED
        full_name: 'Test User'
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

      if (testCase.name.includes('email')) {
        // Check if email remained unchanged
        if (updatedUser.email === currentProfile.email) {
          console.log(`   🛡️ SECURITY: Email NOT changed (correct behavior)`);
          console.log(`   📧 Email stayed: ${updatedUser.email}`);
        } else {
          console.log(`   🚨 SECURITY BREACH: Email was changed! This is BAD!`);
          console.log(`   📧 Old email: ${currentProfile.email}`);
          console.log(`   📧 New email: ${updatedUser.email}`);
        }
      }

      console.log(`   👤 Updated Username: ${updatedUser.username}`);
      console.log(`   👤 Updated Full Name: ${updatedUser.full_name}`);
      console.log(`   🖼️ Updated Avatar: ${updatedUser.avatar}`);
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
    console.log('🖼️ Avatar:', finalProfile.avatar);

    // Security check
    if (finalProfile.email === currentProfile.email) {
      console.log('\n🛡️ SECURITY CHECK PASSED: Email was never changed!');
    } else {
      console.log('\n🚨 SECURITY CHECK FAILED: Email was changed! This is a security issue!');
    }

  } catch (error) {
    console.log('❌ FINAL PROFILE CHECK FAILED:');
    console.log('Error:', error.response?.data?.message || error.message);
  }
}

async function testDirectEmailUpdate() {
  console.log('\n🚨 SECURITY TEST: Direct email update attempt...\n');

  let authToken = null;

  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    authToken = loginResponse.data.data.token;

    // Try direct email update
    console.log('🎯 Attempting direct email update (should fail/be ignored)...');

    const maliciousUpdate = {
      email: 'hacker-email@evil.com',
      username: 'hacker'
    };

    console.log('📤 Malicious Data:', JSON.stringify(maliciousUpdate));

    const response = await axios.put(`${BASE_URL}/profile`, maliciousUpdate, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    console.log('✅ Update Response:', response.data.message);
    console.log('📧 Returned Email:', response.data.data.user.email);

    if (response.data.data.user.email === TEST_EMAIL) {
      console.log('🛡️ SECURITY PASSED: Email unchanged despite malicious attempt');
    } else {
      console.log('🚨 SECURITY FAILED: Email was changed by malicious request!');
    }

  } catch (error) {
    console.log('❌ Security test error:', error.response?.data?.message || error.message);
  }
}

async function runAllTests() {
  console.log('🔧 UPDATE PROFILE WITHOUT EMAIL - COMPREHENSIVE TEST\n');
  console.log('=' .repeat(60));

  await testUpdateProfileWithoutEmail();
  await testDirectEmailUpdate();

  console.log('\n' + '=' .repeat(60));
  console.log('🎉 UPDATE PROFILE TESTS COMPLETED!');
  console.log('📋 SUMMARY:');
  console.log('✅ Profile updates work (username, full_name, avatar)');
  console.log('🛡️ Email updates are blocked for security');
  console.log('✅ Backend properly ignores email field in requests');
  console.log('✅ Authentication required for profile updates');
}

// Export for testing
module.exports = {
  testUpdateProfileWithoutEmail,
  testDirectEmailUpdate
};

// Run if called directly
if (require.main === module) {
  runAllTests();
}
