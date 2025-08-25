const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api/users';

async function debugResetPasswordIssue() {
  console.log('🔍 DEBUG RESET PASSWORD ISSUE\n');

  const testEmail = 'chube2609@gmail.com';
  const testPassword = 'Zilong2609@';

  // Test 1: Request chính xác theo format API yêu cầu
  console.log('🧪 Test 1: Request với format đúng...');

  const correctRequest = {
    email: testEmail,
    code: '123456', // Fake code để test validation
    newPassword: testPassword
  };

  console.log('📤 Request gửi đi:');
  console.log(JSON.stringify(correctRequest, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/reset-password`, correctRequest, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('✅ Response thành công:', response.data);
  } catch (error) {
    console.log('❌ Response lỗi:');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));
    console.log('Headers:', error.response?.headers);

    if (error.response?.status === 400) {
      console.log('\n🔍 PHÂN TÍCH LỖI 400:');
      const errorMsg = error.response.data.message;

      if (errorMsg === 'Thiếu thông tin cần thiết') {
        console.log('   → Backend không nhận được đầy đủ: email, code, newPassword');
        console.log('   → Có thể là vấn đề parsing request body');
      } else if (errorMsg === 'Mật khẩu phải có ít nhất 6 ký tự') {
        console.log('   → Validation password length');
      } else {
        console.log('   → Lỗi khác:', errorMsg);
      }
    }
  }

  // Test 2: Request với cả 2 format để xem backend nhận gì
  console.log('\n🧪 Test 2: Request với format sai (như user đã gửi)...');

  const wrongRequest = {
    email: testEmail,
    new_password: testPassword // Sai tên field
    // Thiếu code
  };

  console.log('📤 Request sai gửi đi:');
  console.log(JSON.stringify(wrongRequest, null, 2));

  try {
    const response = await axios.post(`${BASE_URL}/reset-password`, wrongRequest);
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.log('❌ Response lỗi (expected):', error.response?.data);
  }

  // Test 3: Test từng field một để xem field nào bị thiếu
  console.log('\n🧪 Test 3: Test từng field riêng biệt...');

  const testCases = [
    { name: 'Chỉ có email', data: { email: testEmail } },
    { name: 'Email + code', data: { email: testEmail, code: '123456' } },
    { name: 'Email + newPassword', data: { email: testEmail, newPassword: testPassword } },
    { name: 'Code + newPassword', data: { code: '123456', newPassword: testPassword } },
    { name: 'Đầy đủ nhưng sai field name', data: { email: testEmail, code: '123456', new_password: testPassword } },
  ];

  for (const testCase of testCases) {
    console.log(`\n   Testing: ${testCase.name}`);
    try {
      await axios.post(`${BASE_URL}/reset-password`, testCase.data);
      console.log('     ✅ Thành công (không mong đợi)');
    } catch (error) {
      console.log(`     ❌ ${error.response?.data?.message || error.message}`);
    }
  }
}

// Test với OTP thật
async function testWithRealOTP() {
  console.log('\n🎯 TEST VỚI OTP THẬT\n');

  const testEmail = 'chube2609@gmail.com';

  try {
    // 1. Gửi forgot password để lấy OTP
    console.log('1. Gửi forgot password request...');
    const forgotResponse = await axios.post(`${BASE_URL}/forgot-password`, {
      email: testEmail
    });
    console.log('✅ Forgot password success:', forgotResponse.data.message);

    // 2. Hướng dẫn lấy OTP từ console
    console.log('\n📋 HƯỚNG DẪN TIẾP THEO:');
    console.log('1. Check console server để lấy OTP code (6 chữ số)');
    console.log('2. Chạy lại script với OTP thật:');
    console.log(`   node -e "
     const axios = require('axios');
     (async () => {
       try {
         const response = await axios.post('${BASE_URL}/reset-password', {
           email: '${testEmail}',
           code: process.argv[1], // OTP từ command line
           newPassword: 'Zilong2609@'
         });
         console.log('✅ Success:', response.data);
       } catch (error) {
         console.log('❌ Error:', error.response?.data);
       }
     })();
   " YOUR_OTP_CODE_HERE`);

  } catch (error) {
    console.log('❌ Forgot password failed:', error.response?.data?.message);
    if (error.response?.status === 404) {
      console.log('💡 Email không tồn tại trong database');
      console.log('   → Cần đăng ký tài khoản với email này trước');
    }
  }
}

async function checkBackendCode() {
  console.log('\n🔧 KIỂM TRA BACKEND CODE\n');

  console.log('Validation logic trong resetPassword function:');
  console.log(`
const { email, code, newPassword } = req.body;

if (!email || !code || !newPassword) {
  return res.status(400).json({
    status: 400,
    message: "Thiếu thông tin cần thiết"
  });
}
  `);

  console.log('📋 CHECKLIST DEBUG:');
  console.log('1. ✅ Backend expects: email, code, newPassword');
  console.log('2. ✅ Validation: all 3 fields required');
  console.log('3. ✅ Password length: >= 6 chars');
  console.log('4. ❓ Request parsing: Cần test');
  console.log('5. ❓ Database schema: Cần kiểm tra');
}

async function runFullDebug() {
  await debugResetPasswordIssue();
  await checkBackendCode();
  await testWithRealOTP();

  console.log('\n🎯 TÓM TẮT:');
  console.log('1. Backend code có vẻ đúng');
  console.log('2. Cần test với OTP thật từ console server');
  console.log('3. Đảm bảo request format: { email, code, newPassword }');
  console.log('4. Check email có tồn tại trong DB không');
}

if (require.main === module) {
  runFullDebug();
}

module.exports = { debugResetPasswordIssue, testWithRealOTP };
