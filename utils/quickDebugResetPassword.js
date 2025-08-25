const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:3000/api/users';
const TEST_EMAIL = 'chube2609@gmail.com';

async function quickDebugResetPassword() {
  console.log('🚀 QUICK DEBUG RESET PASSWORD\n');
  console.log(`📧 Email: ${TEST_EMAIL}`);
  console.log(`🔑 New Password: Zilong2609@\n`);

  // Test với format request như user đã gửi
  console.log('🧪 TEST: Request như user đã gửi...\n');

  const userRequest = {
    email: TEST_EMAIL,
    code: '123456', // Fake OTP để test
    newPassword: 'Zilong2609@'
  };

  console.log('📤 Request Data:');
  console.log(JSON.stringify(userRequest, null, 2));

  console.log('\n📡 Sending request to /api/users/reset-password...');

  try {
    const response = await axios.post(`${BASE_URL}/reset-password`, userRequest, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ SUCCESS Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.log('❌ ERROR Response:');
    console.log('Status:', error.response?.status);
    console.log('Data:', JSON.stringify(error.response?.data, null, 2));

    if (error.response?.status === 400) {
      const message = error.response.data?.message;
      console.log('\n🔍 PHÂN TÍCH LỖI 400:');

      if (message === 'Thiếu thông tin cần thiết') {
        console.log('❌ Backend không nhận được đầy đủ 3 fields: email, code, newPassword');
        console.log('📋 CHECK BACKEND LOGS để xem request body thực tế nhận được');
      } else if (message === 'Mã OTP không chính xác hoặc đã hết hạn') {
        console.log('❌ OTP code không đúng hoặc đã hết hạn');
        console.log('💡 Cần lấy OTP thật từ forgot-password endpoint');
      } else if (message === 'Mật khẩu phải có ít nhất 6 ký tự') {
        console.log('❌ Password quá ngắn');
      } else {
        console.log('❌ Lỗi khác:', message);
      }
    }
  }

  console.log('\n📋 HƯỚNG DẪN DEBUG:');
  console.log('1. Check BACKEND CONSOLE LOGS - sẽ thấy chi tiết request nhận được');
  console.log('2. Nếu backend không log gì → Server không chạy hoặc route sai');
  console.log('3. Nếu có log → So sánh request sent vs received');
  console.log('4. Check field names: email, code, newPassword (không phải new_password)');
}

async function testWithRealOTPFlow() {
  console.log('\n🔥 TEST VỚI OTP THẬT:\n');

  try {
    console.log('1️⃣ Gửi forgot-password để lấy OTP...');
    const forgotResponse = await axios.post(`${BASE_URL}/forgot-password`, {
      email: TEST_EMAIL
    });

    console.log('✅ Forgot password success:', forgotResponse.data.message);
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Check BACKEND CONSOLE để lấy OTP code (dạng: Verification code 123456...)');
    console.log('2. Copy OTP code');
    console.log('3. Chạy command sau với OTP thật:');
    console.log('');
    console.log('curl -X POST http://localhost:3000/api/users/reset-password \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log(`  -d '{"email":"${TEST_EMAIL}","code":"YOUR_OTP_HERE","newPassword":"Zilong2609@"}'`);
    console.log('');
    console.log('4. Hoặc test bằng JavaScript:');
    console.log(`
const axios = require('axios');
axios.post('http://localhost:3000/api/users/reset-password', {
  email: '${TEST_EMAIL}',
  code: 'YOUR_OTP_HERE',
  newPassword: 'Zilong2609@'
}).then(res => {
  console.log('✅ Success:', res.data);
}).catch(err => {
  console.log('❌ Error:', err.response?.data);
});`);

  } catch (error) {
    console.log('❌ Forgot password failed:', error.response?.data);

    if (error.response?.status === 404) {
      console.log('\n💡 EMAIL KHÔNG TỒN TẠI TRONG DATABASE');
      console.log('   → Cần đăng ký tài khoản với email này trước');
      console.log('   → Hoặc thay đổi TEST_EMAIL trong script này');
    }
  }
}

async function showDebugChecklist() {
  console.log('\n📋 DEBUG CHECKLIST:\n');

  console.log('🔍 1. REQUEST FORMAT:');
  console.log('   ✅ Content-Type: application/json');
  console.log('   ✅ Body: { email, code, newPassword }');
  console.log('   ❌ KHÔNG: { email, new_password } (thiếu code, sai field name)');

  console.log('\n🔍 2. BACKEND LOGS:');
  console.log('   ✅ Phải thấy "🔍 Reset Password Request:" trong console');
  console.log('   ✅ Check body nhận được có đúng format không');

  console.log('\n🔍 3. OTP CODE:');
  console.log('   ✅ Lấy từ forgot-password endpoint trước');
  console.log('   ✅ Code 6 chữ số, chưa hết hạn (15 phút)');

  console.log('\n🔍 4. EMAIL:');
  console.log(`   ✅ ${TEST_EMAIL} phải tồn tại trong database`);
  console.log('   ✅ Hoặc thay đổi email test khác');

  console.log('\n🔍 5. PASSWORD:');
  console.log('   ✅ Zilong2609@ (8 chars) > 6 chars requirement ✅');
}

async function runQuickDebug() {
  await quickDebugResetPassword();
  await showDebugChecklist();
  await testWithRealOTPFlow();

  console.log('\n🎯 TÓM TẮT:');
  console.log('✅ Đã thêm detailed logging vào backend');
  console.log('✅ Test request format đúng');
  console.log('✅ Hướng dẫn lấy OTP thật');
  console.log('📋 CHECK BACKEND CONSOLE để xem chi tiết!');
}

// Export để có thể import
module.exports = { quickDebugResetPassword, testWithRealOTPFlow };

// Chạy nếu called directly
if (require.main === module) {
  runQuickDebug();
}
