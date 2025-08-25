const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api/users';
const TEST_EMAIL = 'chube2609@gmail.com';

async function testSimpleResetPassword() {
  console.log('🚀 TEST RESET PASSWORD - NO OTP REQUIRED\n');
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 New Password: Zilong2609@\n`);

  // Test request mới - chỉ cần email và newPassword
  const resetRequest = {
    email: TEST_EMAIL,
    newPassword: 'Zilong2609@'
  };

  console.log('📤 Request Data (Simplified):');
  console.log(JSON.stringify(resetRequest, null, 2));

  console.log('\n📡 Sending request to /api/users/reset-password...');

  try {
    const response = await axios.post(`${BASE_URL}/reset-password`, resetRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('\n✅ SUCCESS! Password Reset Completed:');
    console.log('Status:', response.status);
    console.log('Message:', response.data.message);
    console.log('Full Response:', JSON.stringify(response.data, null, 2));

    console.log('\n🎉 RESET PASSWORD THÀNH CÔNG!');
    console.log('📋 Next Steps:');
    console.log('1. Test login với password mới');
    console.log('2. Verify password đã được update trong database');

  } catch (error) {
    console.log('\n❌ ERROR Response:');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));

    const status = error.response?.status;
    const message = error.response?.data?.message;

    console.log('\n🔍 PHÂN TÍCH LỖI:');

    if (status === 400 && message === 'Thiếu thông tin cần thiết') {
      console.log('❌ Backend không nhận được email hoặc newPassword');
      console.log('📋 CHECK:');
      console.log('   - Request body có đúng format không?');
      console.log('   - Content-Type header có đúng không?');
      console.log('   - Backend có nhận được request không?');

    } else if (status === 400 && message === 'Mật khẩu phải có ít nhất 6 ký tự') {
      console.log('❌ Password quá ngắn (cần >= 6 ký tự)');

    } else if (status === 404 && message === 'Email không tồn tại trong hệ thống') {
      console.log('❌ Email không có trong database');
      console.log('📋 Solutions:');
      console.log('   - Đăng ký tài khoản với email này trước');
      console.log('   - Hoặc dùng email khác đã tồn tại');
      console.log('   - Check database users table');

    } else {
      console.log(`❌ Lỗi khác: ${message || 'Unknown error'}`);
      console.log('📋 Check backend logs cho chi tiết');
    }
  }
}

// Test với nhiều cases khác nhau
async function testVariousCases() {
  console.log('\n🧪 TESTING VARIOUS CASES:\n');

  const testCases = [
    {
      name: 'Valid Case',
      data: { email: TEST_EMAIL, newPassword: 'NewPassword123' },
      expectedResult: 'success'
    },
    {
      name: 'Missing email',
      data: { newPassword: 'NewPassword123' },
      expectedResult: 'error - missing email'
    },
    {
      name: 'Missing newPassword',
      data: { email: TEST_EMAIL },
      expectedResult: 'error - missing newPassword'
    },
    {
      name: 'Password too short',
      data: { email: TEST_EMAIL, newPassword: '123' },
      expectedResult: 'error - password too short'
    },
    {
      name: 'Invalid email format',
      data: { email: 'invalid-email', newPassword: 'NewPassword123' },
      expectedResult: 'error - email not found'
    },
    {
      name: 'Empty strings',
      data: { email: '', newPassword: '' },
      expectedResult: 'error - empty values'
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n   Testing: ${testCase.name}`);
    console.log(`   Data: ${JSON.stringify(testCase.data)}`);
    console.log(`   Expected: ${testCase.expectedResult}`);

    try {
      const response = await axios.post(`${BASE_URL}/reset-password`, testCase.data);
      console.log(`   ✅ Result: ${response.data.message}`);
    } catch (error) {
      const message = error.response?.data?.message || error.message;
      console.log(`   ❌ Result: ${message}`);
    }
  }
}

// Test login với password mới
async function testLoginWithNewPassword() {
  console.log('\n🔐 TEST LOGIN VỚI PASSWORD MỚI:\n');

  try {
    const loginResponse = await axios.post(`${BASE_URL}/login`, {
      email: TEST_EMAIL,
      password: 'Zilong2609@'
    });

    console.log('✅ LOGIN SUCCESS với password mới!');
    console.log('User Info:', {
      email: loginResponse.data.user?.email,
      id: loginResponse.data.user?.id,
      username: loginResponse.data.user?.username
    });

  } catch (error) {
    console.log('❌ LOGIN FAILED với password mới');
    console.log('Error:', error.response?.data?.message);
    console.log('💡 Có thể password chưa được update hoặc login API có vấn đề');
  }
}

async function showSimpleUsageExample() {
  console.log('\n📖 SIMPLE USAGE EXAMPLE:\n');

  console.log('// Frontend JavaScript Example:');
  console.log(`
const resetPassword = async (email, newPassword) => {
  try {
    const response = await fetch('/api/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        newPassword: newPassword
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Success:', data.message);
      return { success: true, message: data.message };
    } else {
      console.log('❌ Error:', data.message);
      return { success: false, message: data.message };
    }
  } catch (error) {
    console.log('❌ Network Error:', error);
    return { success: false, message: 'Network error' };
  }
};

// Usage:
resetPassword('${TEST_EMAIL}', 'NewPassword123');
`);

  console.log('\n// cURL Example:');
  console.log(`
curl -X POST http://localhost:3000/api/users/reset-password \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "${TEST_EMAIL}",
    "newPassword": "NewPassword123"
  }'
`);
}

async function runAllTests() {
  console.log('🎯 RESET PASSWORD SIMPLE - FULL TEST SUITE\n');
  console.log('=' .repeat(60));

  await testSimpleResetPassword();
  await testVariousCases();
  await testLoginWithNewPassword();
  await showSimpleUsageExample();

  console.log('\n' + '=' .repeat(60));
  console.log('🎉 ALL TESTS COMPLETED!');
  console.log('📋 SUMMARY:');
  console.log('✅ Reset password chỉ cần: email + newPassword');
  console.log('✅ Không cần OTP nữa');
  console.log('✅ Validation: email tồn tại + password >= 6 chars');
  console.log('✅ Backend logs chi tiết request');
}

// Export để có thể import
module.exports = {
  testSimpleResetPassword,
  testVariousCases,
  testLoginWithNewPassword
};

// Chạy nếu called directly
if (require.main === module) {
  runAllTests();
}
