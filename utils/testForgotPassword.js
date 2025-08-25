const axios = require('axios');
require('dotenv').config();

// Đổi BASE_URL theo cấu hình server của bạn
const BASE_URL = 'http://localhost:3000/api/users';

async function testForgotPasswordFlow() {
  try {
    console.log('🧪 Bắt đầu test chức năng quên mật khẩu...\n');

    // Test email không tồn tại
    console.log('1. Test email không tồn tại:');
    try {
      await axios.post(`${BASE_URL}/forgot-password`, {
        email: 'nonexistent@email.com'
      });
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng: ${error.response?.data?.message || error.message}`);
    }

    // Test thiếu email
    console.log('\n2. Test thiếu email:');
    try {
      await axios.post(`${BASE_URL}/forgot-password`, {});
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng: ${error.response?.data?.message || error.message}`);
    }

    // Test với email hợp lệ (cần thay đổi thành email thực tế trong DB)
    console.log('\n3. Test với email hợp lệ:');
    const testEmail = 'test@example.com'; // Thay bằng email có trong DB

    console.log(`   📧 Gửi yêu cầu quên mật khẩu cho: ${testEmail}`);
    try {
      const forgotResponse = await axios.post(`${BASE_URL}/forgot-password`, {
        email: testEmail
      });
      console.log(`   ✅ Thành công: ${forgotResponse.data.message}`);

      // Lưu ý: Trong môi trường thực tế, bạn sẽ cần lấy mã từ email
      // Ở đây, mã sẽ được log trong console của server
      console.log('\n   📝 Vui lòng kiểm tra console server để lấy mã xác nhận!');
      console.log('   📝 Sau khi có mã, chạy: testResetPassword(email, code, newPassword)');

    } catch (error) {
      console.log(`   ❌ Lỗi: ${error.response?.data?.message || error.message}`);
    }

    console.log('\n🧪 Hoàn thành test cơ bản. Để test reset password, cần có mã xác nhận thực tế.');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error.message);
  }
}

async function testResetPassword(email, code, newPassword) {
  try {
    console.log(`\n🔄 Test reset password cho ${email}...`);

    // Test mã không hợp lệ
    console.log('1. Test mã không hợp lệ:');
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        email: email,
        code: '000000',
        newPassword: newPassword
      });
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng: ${error.response?.data?.message || error.message}`);
    }

    // Test mật khẩu ngắn
    console.log('\n2. Test mật khẩu quá ngắn:');
    try {
      await axios.post(`${BASE_URL}/reset-password`, {
        email: email,
        code: code,
        newPassword: '123'
      });
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng: ${error.response?.data?.message || error.message}`);
    }

    // Test với mã đúng
    console.log('\n3. Test với mã đúng:');
    try {
      const resetResponse = await axios.post(`${BASE_URL}/reset-password`, {
        email: email,
        code: code,
        newPassword: newPassword
      });
      console.log(`   ✅ Thành công: ${resetResponse.data.message}`);

      // Test đăng nhập với mật khẩu mới
      console.log('\n4. Test đăng nhập với mật khẩu mới:');
      try {
        const loginResponse = await axios.post(`${BASE_URL}/login`, {
          email: email,
          password: newPassword
        });
        console.log(`   ✅ Đăng nhập thành công với mật khẩu mới!`);
      } catch (loginError) {
        console.log(`   ❌ Đăng nhập thất bại: ${loginError.response?.data?.message || loginError.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Lỗi reset: ${error.response?.data?.message || error.message}`);
    }

  } catch (error) {
    console.error('❌ Lỗi trong test reset password:', error.message);
  }
}

// Chạy test cơ bản
testForgotPasswordFlow();

// Export function để có thể sử dụng riêng lẻ
module.exports = {
  testForgotPasswordFlow,
  testResetPassword
};
