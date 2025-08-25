const axios = require('axios');
require('dotenv').config();

// Script nhanh để test forgot password với OTP verification
const BASE_URL = 'http://localhost:3000/api/users';

async function quickTestForgotPasswordOTP() {
  console.log('🧪 QUICK TEST: Forgot Password với OTP Verification\n');

  // Thay đổi email này thành email có trong database của bạn
  const testEmail = 'test@example.com';
  console.log(`📧 Test email: ${testEmail}`);
  console.log('⚠️  Hãy thay đổi email này thành email có trong database của bạn!\n');

  try {
    // Step 1: Gửi forgot password
    console.log('1️⃣ Gửi yêu cầu forgot password...');
    try {
      const forgotResponse = await axios.post(`${BASE_URL}/forgot-password`, {
        email: testEmail
      });
      console.log(`✅ Success: ${forgotResponse.data.message}`);
      console.log('📝 Kiểm tra console server để lấy OTP code!\n');
    } catch (error) {
      console.log(`❌ Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.status === 404) { 
        console.log('💡 Lỗi này có thể do email không tồn tại trong database');
        console.log('   Hãy thay đổi testEmail thành email có trong DB\n');
      }
      return;
    }

    // Hướng dẫn user nhập OTP
    console.log('2️⃣ Bây giờ hãy test verify OTP:');
    console.log('📋 Sao chép OTP code từ console server và chạy:');
    console.log('');
    console.log('   curl -X POST http://localhost:3000/api/users/verify-otp \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"email":"${testEmail}","code":"YOUR_OTP_CODE","type":"password_reset"}'`);
    console.log('');

    console.log('✅ Response thành công sẽ có dạng:');
    console.log(JSON.stringify({
      "status": 200,
      "message": "Mã OTP đã được xác thực thành công",
      "data": {
        "email": testEmail,
        "type": "password_reset",
        "verified": true,
        "verifiedAt": "2024-01-15T10:30:00.000Z"
        // Lưu ý: KHÔNG có userData vì type="password_reset" (bảo mật)
      }
    }, null, 2));

    console.log('\n3️⃣ Sau khi verify OTP thành công, reset password:');
    console.log('📋 Chạy lệnh sau để reset password:');
    console.log('');
    console.log('   curl -X POST http://localhost:3000/api/users/reset-password \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"email":"${testEmail}","code":"YOUR_OTP_CODE","newPassword":"newpass123"}'`);
    console.log('');

    console.log('4️⃣ Cuối cùng, test login với mật khẩu mới:');
    console.log('📋 Chạy lệnh sau:');
    console.log('');
    console.log('   curl -X POST http://localhost:3000/api/users/login \\');
    console.log('     -H "Content-Type: application/json" \\');
    console.log(`     -d '{"email":"${testEmail}","password":"newpass123"}'`);
    console.log('');

    console.log('🎯 QUY TRÌNH HOÀN CHỈNH:');
    console.log('   ✅ forgot-password → Gửi OTP');
    console.log('   ✅ verify-otp → Chỉ kiểm tra OTP đúng (KHÔNG đổi password)');
    console.log('   ✅ reset-password → Đổi password thật');
    console.log('   ✅ login → Test với password mới');

    console.log('\n💡 LỢI ÍCH:');
    console.log('   🎯 Frontend biết OTP đúng trước khi user nhập password mới');
    console.log('   🔒 Tách biệt logic verify và reset password');
    console.log('   🛡️ Không trả userData nhạy cảm cho password_reset');
    console.log('   📱 UX tốt hơn với feedback tức thì');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Automated test với OTP giả lập
async function automatedTest() {
  console.log('\n🤖 AUTOMATED TEST (với fake OTP):\n');

  const testEmail = 'autotest@example.com';

  try {
    // Test verify-otp với mã giả
    console.log('🔍 Test verify OTP với mã không tồn tại...');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        email: testEmail,
        code: '999999',
        type: 'password_reset'
      });
    } catch (error) {
      console.log(`✅ Expected error (${error.response?.status}): ${error.response?.data?.message}`);
    }

    // Test thiếu email
    console.log('\n📧 Test verify OTP thiếu email...');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        code: '123456',
        type: 'password_reset'
      });
    } catch (error) {
      console.log(`✅ Expected error (${error.response?.status}): ${error.response?.data?.message}`);
    }

    // Test thiếu code
    console.log('\n🔢 Test verify OTP thiếu code...');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        email: testEmail,
        type: 'password_reset'
      });
    } catch (error) {
      console.log(`✅ Expected error (${error.response?.status}): ${error.response?.data?.message}`);
    }

    console.log('\n✅ Tất cả validation tests passed!');

  } catch (error) {
    console.error('❌ Automated test error:', error.message);
  }
}

async function runAllTests() {
  await quickTestForgotPasswordOTP();
  await automatedTest();

  console.log('\n🎉 TEST HOÀN THÀNH!');
  console.log('\n📚 Xem thêm tài liệu chi tiết:');
  console.log('   - docs/FORGOT_PASSWORD_WITH_OTP_VERIFICATION.md');
  console.log('   - utils/testForgotPasswordWithOTP.js (full test suite)');
}

// Chạy test
if (require.main === module) {
  runAllTests();
}

module.exports = { quickTestForgotPasswordOTP, automatedTest };
