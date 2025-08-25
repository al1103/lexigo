const axios = require('axios');
require('dotenv').config();

// Test với email cụ thể của user
const BASE_URL = 'http://localhost:3000/api/users';
const TEST_EMAIL = 'chube2609@gmail.com'; // Email của user
const NEW_PASSWORD = 'Zilong2609@'; // Password mới

async function testWithSpecificEmail() {
  console.log('🧪 TEST RESET PASSWORD VỚI EMAIL CỤ THỂ\n');
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 New Password: ${NEW_PASSWORD}\n`);

  try {
    // Step 1: Gửi forgot password
    console.log('1️⃣ Gửi yêu cầu forgot password...');
    try {
      const response = await axios.post(`${BASE_URL}/forgot-password`, {
        email: TEST_EMAIL
      });
      console.log(`✅ Success: ${response.data.message}`);
      console.log('📝 Kiểm tra console server để lấy OTP code!\n');
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 404) {
        console.log('💡 Email không tồn tại trong database');
        console.log('   Hãy đăng ký tài khoản với email này trước\n');
      }
      return;
    }

    console.log('2️⃣ Hướng dẫn test tiếp theo:\n');

    // Hướng dẫn test verify OTP (optional)
    console.log('🔍 OPTION A: Test verify OTP trước (khuyến nghị):');
    console.log('   curl -X POST http://localhost:3000/api/users/verify-otp \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"email":"${TEST_EMAIL}","code":"YOUR_OTP_HERE","type":"password_reset"}'`);
    console.log('');
    console.log('   ✅ Nếu thành công, bạn sẽ thấy: "Mã OTP đã được xác thực thành công"');
    console.log('');

    // Hướng dẫn reset password
    console.log('🔑 OPTION B: Reset password trực tiếp:');
    console.log('   curl -X POST http://localhost:3000/api/users/reset-password \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"email":"${TEST_EMAIL}","code":"YOUR_OTP_HERE","newPassword":"${NEW_PASSWORD}"}'`);
    console.log('');

    // Show lỗi trước đó của user
    console.log('❌ LỖI TRƯỚC ĐÂY (CỦA USER):');
    console.log(`   Request SAI: {"email":"${TEST_EMAIL}","new_password":"${NEW_PASSWORD}"}`);
    console.log('   Response: {"status":400,"message":"Thiếu thông tin cần thiết"}');
    console.log('');
    console.log('🔧 NGUYÊN NHÂN:');
    console.log('   1. Thiếu field "code" (OTP)');
    console.log('   2. Field name sai: "new_password" thay vì "newPassword"');
    console.log('');

    // Correct request format
    console.log('✅ REQUEST ĐÚNG:');
    console.log(`   {"email":"${TEST_EMAIL}","code":"123456","newPassword":"${NEW_PASSWORD}"}`);
    console.log('');

    // Test với JavaScript
    console.log('🔧 JAVASCRIPT CODE ĐÚNG:');
    console.log(`const response = await fetch('/api/users/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: '${TEST_EMAIL}',
    code: '123456', // Lấy từ console server
    newPassword: '${NEW_PASSWORD}'
  })
});`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Test validation errors
async function testValidationErrors() {
  console.log('\n🧪 TEST CÁC LỖI VALIDATION:\n');

  const testCases = [
    {
      name: 'Thiếu email',
      data: { code: '123456', newPassword: 'test123' }
    },
    {
      name: 'Thiếu code',
      data: { email: TEST_EMAIL, newPassword: 'test123' }
    },
    {
      name: 'Thiếu newPassword',
      data: { email: TEST_EMAIL, code: '123456' }
    },
    {
      name: 'newPassword quá ngắn',
      data: { email: TEST_EMAIL, code: '123456', newPassword: '123' }
    },
    {
      name: 'Sai field name (new_password)',
      data: { email: TEST_EMAIL, code: '123456', new_password: 'test123' }
    }
  ];

  for (const testCase of testCases) {
    console.log(`${testCase.name}:`);
    try {
      await axios.post(`${BASE_URL}/reset-password`, testCase.data);
      console.log('   ❌ Không có lỗi (không mong muốn)');
    } catch (error) {
      console.log(`   ✅ Expected error: ${error.response?.data?.message || error.message}`);
    }
  }
}

async function showCorrectWorkflow() {
  console.log('\n📋 QUY TRÌNH ĐÚNG HOÀN CHỈNH:\n');

  console.log('// 1. Gửi OTP');
  console.log(`await fetch('/api/users/forgot-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: '${TEST_EMAIL}' })
});`);

  console.log('\n// 2. (Optional) Verify OTP trước');
  console.log(`await fetch('/api/users/verify-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: '${TEST_EMAIL}',
    code: otpCode, // Từ console server
    type: 'password_reset'
  })
});`);

  console.log('\n// 3. Reset password');
  console.log(`await fetch('/api/users/reset-password', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: '${TEST_EMAIL}',
    code: otpCode, // Same OTP code
    newPassword: '${NEW_PASSWORD}'
  })
});`);

  console.log('\n💡 LƯU Ý:');
  console.log(`   - OTP code lấy từ console server`);
  console.log(`   - Field name: "newPassword" (không phải "new_password")`);
  console.log(`   - Cần đầy đủ 3 fields: email, code, newPassword`);
  console.log(`   - Password phải ≥ 6 ký tự`);
}

async function runAll() {
  await testWithSpecificEmail();
  await testValidationErrors();
  await showCorrectWorkflow();

  console.log('\n🎉 TỔNG KỤT:');
  console.log('   ✅ Đã xác định nguyên nhân lỗi');
  console.log('   ✅ Đã cung cấp cách fix');
  console.log('   ✅ Đã test validation');
  console.log('   ✅ Đã hướng dẫn quy trình đúng');
}

if (require.main === module) {
  runAll();
}

module.exports = { testWithSpecificEmail, testValidationErrors, showCorrectWorkflow };
