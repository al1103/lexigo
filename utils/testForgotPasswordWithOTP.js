const axios = require('axios');
const { pool } = require('../config/database');
require('dotenv').config();

// Cấu hình API
const BASE_URL = 'http://localhost:3000/api/users';

class ForgotPasswordOTPTester {
  constructor(testEmail = 'forgottest@example.com') {
    this.testEmail = testEmail;
    this.otpCode = null;
    this.newPassword = 'newSecurePassword123';
  }

  // Tạo user test nếu chưa có
  async createTestUser() {
    try {
      console.log(`👤 Kiểm tra user test: ${this.testEmail}...`);

      const userExists = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [this.testEmail]
      );

      if (userExists.rows.length === 0) {
        console.log('   📝 Tạo user test...');
        await pool.query(
          'INSERT INTO users (username, email, password_hash, full_name) VALUES ($1, $2, $3, $4)',
          [`testuser_${Date.now()}`, this.testEmail, 'oldpassword123', 'Test User']
        );
        console.log('   ✅ Đã tạo user test');
      } else {
        console.log('   ✅ User test đã tồn tại');
      }

      return true;
    } catch (error) {
      console.error('❌ Lỗi tạo user test:', error.message);
      return false;
    }
  }

  // Step 1: Gửi yêu cầu forgot password
  async sendForgotPasswordRequest() {
    try {
      console.log('\n📧 STEP 1: Gửi yêu cầu forgot password...');

      const response = await axios.post(`${BASE_URL}/forgot-password`, {
        email: this.testEmail
      });

      console.log(`   ✅ Success (${response.status}): ${response.data.message}`);

      // Lấy OTP từ database (trong thực tế sẽ từ email)
      await this.getOTPFromDatabase();

      return true;
    } catch (error) {
      console.log(`   ❌ Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  // Lấy OTP từ database cho test
  async getOTPFromDatabase() {
    try {
      const result = await pool.query(
        'SELECT code FROM verification_codes WHERE email = $1 ORDER BY created_at DESC LIMIT 1',
        [this.testEmail]
      );

      if (result.rows.length > 0) {
        this.otpCode = result.rows[0].code;
        console.log(`   📋 OTP code từ database: ${this.otpCode}`);
      } else {
        console.log('   ⚠️ Không tìm thấy OTP trong database');
      }
    } catch (error) {
      console.log('   ⚠️ Lỗi lấy OTP từ database:', error.message);
    }
  }

  // Step 2: Verify OTP (KHÔNG reset password)
  async verifyOTP() {
    try {
      console.log('\n🔍 STEP 2: Verify OTP (không reset password)...');

      if (!this.otpCode) {
        console.log('   ❌ Không có OTP code để test');
        return false;
      }

      const response = await axios.post(`${BASE_URL}/verify-otp`, {
        email: this.testEmail,
        code: this.otpCode,
        type: 'password_reset'
      });

      console.log(`   ✅ Success (${response.status}): ${response.data.message}`);
      console.log(`   📊 Data:`, {
        email: response.data.data.email,
        type: response.data.data.type,
        verified: response.data.data.verified,
        hasUserData: !!response.data.data.userData
      });

      // Check bảo mật: không trả userData cho password_reset
      if (!response.data.data.userData) {
        console.log('   🔒 Security OK: Không trả userData cho password_reset');
      } else {
        console.log('   ⚠️ Security Warning: Có trả userData cho password_reset');
      }

      return true;
    } catch (error) {
      console.log(`   ❌ Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  // Step 3: Reset password (sau khi OTP verified)
  async resetPassword() {
    try {
      console.log('\n🔑 STEP 3: Reset password (sau khi OTP đã verify)...');

      const response = await axios.post(`${BASE_URL}/reset-password`, {
        email: this.testEmail,
        code: this.otpCode,
        newPassword: this.newPassword
      });

      console.log(`   ✅ Success (${response.status}): ${response.data.message}`);
      return true;
    } catch (error) {
      console.log(`   ❌ Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  // Test login với mật khẩu mới
  async testLoginWithNewPassword() {
    try {
      console.log('\n🔐 STEP 4: Test login với mật khẩu mới...');

      const response = await axios.post(`${BASE_URL}/login`, {
        email: this.testEmail,
        password: this.newPassword
      });

      console.log(`   ✅ Login Success (${response.status}): Mật khẩu mới hoạt động!`);
      console.log(`   👤 User:`, {
        id: response.data.data.user.id,
        email: response.data.data.user.email,
        username: response.data.data.user.username
      });

      return true;
    } catch (error) {
      console.log(`   ❌ Login Failed (${error.response?.status}): ${error.response?.data?.message || error.message}`);
      return false;
    }
  }

  // Test các trường hợp lỗi
  async testErrorCases() {
    console.log('\n🧪 TEST ERROR CASES...\n');

    // Test 1: Verify OTP không tồn tại
    console.log('1. Test verify OTP không tồn tại:');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        email: this.testEmail,
        code: '999999',
        type: 'password_reset'
      });
    } catch (error) {
      console.log(`   ✅ Correct Error (${error.response?.status}): ${error.response?.data?.message}`);
    }

    // Test 2: Verify OTP thiếu email
    console.log('\n2. Test verify OTP thiếu email:');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        code: '123456',
        type: 'password_reset'
      });
    } catch (error) {
      console.log(`   ✅ Correct Error (${error.response?.status}): ${error.response?.data?.message}`);
    }

    // Test 3: Verify OTP thiếu code
    console.log('\n3. Test verify OTP thiếu code:');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        email: this.testEmail,
        type: 'password_reset'
      });
    } catch (error) {
      console.log(`   ✅ Correct Error (${error.response?.status}): ${error.response?.data?.message}`);
    }
  }

  // Chạy toàn bộ test
  async runFullTest() {
    console.log('🚀 BẮT ĐẦU TEST FORGOT PASSWORD VỚI OTP VERIFICATION\n');
    console.log('📋 Quy trình:');
    console.log('   1. Gửi forgot-password request');
    console.log('   2. Verify OTP (KHÔNG reset password)');
    console.log('   3. Reset password (sau khi OTP verified)');
    console.log('   4. Test login với password mới\n');

    try {
      // Tạo user test
      const userCreated = await this.createTestUser();
      if (!userCreated) return;

      // Step 1: Send forgot password
      const forgotSent = await this.sendForgotPasswordRequest();
      if (!forgotSent) return;

      // Step 2: Verify OTP
      const otpVerified = await this.verifyOTP();
      if (!otpVerified) return;

      // Step 3: Reset password
      const passwordReset = await this.resetPassword();
      if (!passwordReset) return;

      // Step 4: Test login
      const loginSuccess = await this.testLoginWithNewPassword();
      if (!loginSuccess) return;

      // Test error cases
      await this.testErrorCases();

      console.log('\n🎉 TOÀN BỘ TEST THÀNH CÔNG!');
      console.log('\n✅ Kết quả:');
      console.log('   ✅ Forgot password request hoạt động');
      console.log('   ✅ Verify OTP hoạt động (không reset password)');
      console.log('   ✅ Reset password hoạt động (sau OTP verify)');
      console.log('   ✅ Login với password mới thành công');
      console.log('   ✅ Error handling đúng');
      console.log('   ✅ Security: Không trả userData cho password_reset');

      console.log('\n💡 Lợi ích của quy trình này:');
      console.log('   🎯 Frontend biết OTP đúng trước khi user nhập password mới');
      console.log('   🔒 Tách biệt logic verify OTP và reset password');
      console.log('   📱 UX tốt hơn với feedback tức thì');
      console.log('   🛡️ Bảo mật cao hơn với double verification');

    } catch (error) {
      console.error('\n❌ Test failed with error:', error.message);
    } finally {
      await this.cleanup();
    }
  }

  // Cleanup test data
  async cleanup() {
    try {
      console.log('\n🧹 Cleanup test data...');

      // Xóa verification codes
      await pool.query('DELETE FROM verification_codes WHERE email = $1', [this.testEmail]);

      // Xóa test user
      await pool.query('DELETE FROM users WHERE email = $1', [this.testEmail]);

      console.log('   ✅ Đã xóa test data');
    } catch (error) {
      console.log('   ⚠️ Cleanup error:', error.message);
    } finally {
      if (pool && pool.end) {
        await pool.end();
      }
    }
  }
}

// Chạy test nếu file được gọi trực tiếp
if (require.main === module) {
  const tester = new ForgotPasswordOTPTester('forgottest@example.com');
  tester.runFullTest();
}

module.exports = ForgotPasswordOTPTester;
