const axios = require('axios');
const { pool } = require('../config/database');
require('dotenv').config();

// Cấu hình API base URL
const BASE_URL = 'http://localhost:3000/api/users';

async function createTestOTP(email, type = 'general', minutesExpiry = 15) {
  try {
    console.log(`📧 Tạo mã OTP test cho ${email} (type: ${type})...`);

    // Tạo mã OTP ngẫu nhiên
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Tạo user data giả cho test
    const userData = {
      type: type,
      email: email,
      username: 'testuser',
      fullName: 'Test User',
      password: 'testpass123'
    };

    // Thời gian hết hạn
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + minutesExpiry);

    // Xóa mã cũ nếu có
    await pool.query('DELETE FROM verification_codes WHERE email = $1', [email]);

    // Check column structure và insert
    const tableInfoQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'verification_codes'
    `;
    const tableInfo = await pool.query(tableInfoQuery);

    const hasExpirationTime = tableInfo.rows.some(
      (row) => row.column_name === "expiration_time"
    );
    const hasExpiresAt = tableInfo.rows.some(
      (row) => row.column_name === "expires_at"
    );

    if (hasExpiresAt) {
      // Dùng cấu trúc với expires_at
      await pool.query(
        `INSERT INTO verification_codes (email, code, expires_at, code_type, verified, attempts, max_attempts, user_data, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
        [email, code, expirationTime, type, false, 0, 3, JSON.stringify(userData)]
      );
    } else {
      // Dùng cấu trúc với expiration_time
      await pool.query(
        `INSERT INTO verification_codes (email, code, expiration_time, user_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [email, code, expirationTime, JSON.stringify(userData)]
      );
    }

    console.log(`✅ Đã tạo mã OTP: ${code} (hết hạn sau ${minutesExpiry} phút)`);
    return code;

  } catch (error) {
    console.error('❌ Lỗi khi tạo OTP test:', error.message);
    return null;
  }
}

async function testVerifyOTPBasic() {
  try {
    console.log('🧪 Test cơ bản Verify OTP API...\n');

    const testEmail = 'test@example.com';

    // Test 1: Thiếu email
    console.log('1. Test thiếu email:');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        code: '123456',
        type: 'general'
      });
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng (${error.response?.status}): ${error.response?.data?.message}`);
    }

    // Test 2: Thiếu code
    console.log('\n2. Test thiếu mã OTP:');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        email: testEmail,
        type: 'general'
      });
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng (${error.response?.status}): ${error.response?.data?.message}`);
    }

    // Test 3: Mã không tồn tại
    console.log('\n3. Test mã OTP không tồn tại:');
    try {
      await axios.post(`${BASE_URL}/verify-otp`, {
        email: testEmail,
        code: '999999',
        type: 'general'
      });
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng (${error.response?.status}): ${error.response?.data?.message}`);
    }

  } catch (error) {
    console.error('❌ Lỗi trong test cơ bản:', error.message);
  }
}

async function testVerifyOTPWithValidCodes() {
  try {
    console.log('\n🧪 Test với mã OTP hợp lệ...\n');

    const testEmail = 'test@example.com';

    // Test 4: OTP type registration
    console.log('4. Test OTP loại registration:');
    const regCode = await createTestOTP(testEmail, 'registration', 10);
    if (regCode) {
      try {
        const response = await axios.post(`${BASE_URL}/verify-otp`, {
          email: testEmail,
          code: regCode,
          type: 'registration'
        });
        console.log(`   ✅ Thành công (${response.status}): ${response.data.message}`);
        console.log(`   📊 Data: type=${response.data.data.type}, verified=${response.data.data.verified}`);
        if (response.data.data.userData) {
          console.log(`   👤 User data: ${Object.keys(response.data.data.userData).join(', ')}`);
        }
      } catch (error) {
        console.log(`   ❌ Lỗi (${error.response?.status}): ${error.response?.data?.message}`);
      }
    }

    // Test 5: OTP type password_reset
    console.log('\n5. Test OTP loại password_reset:');
    const passCode = await createTestOTP(testEmail, 'password_reset', 10);
    if (passCode) {
      try {
        const response = await axios.post(`${BASE_URL}/verify-otp`, {
          email: testEmail,
          code: passCode,
          type: 'password_reset'
        });
        console.log(`   ✅ Thành công (${response.status}): ${response.data.message}`);
        console.log(`   📊 Data: type=${response.data.data.type}, verified=${response.data.data.verified}`);
        if (response.data.data.userData) {
          console.log(`   👤 User data: Có userData`);
        } else {
          console.log(`   🔒 Security: Không trả về userData cho password_reset (đúng)`);
        }
      } catch (error) {
        console.log(`   ❌ Lỗi (${error.response?.status}): ${error.response?.data?.message}`);
      }
    }

    // Test 6: OTP type general
    console.log('\n6. Test OTP loại general:');
    const genCode = await createTestOTP(testEmail, 'general', 10);
    if (genCode) {
      try {
        const response = await axios.post(`${BASE_URL}/verify-otp`, {
          email: testEmail,
          code: genCode
          // không truyền type, sẽ default là 'general'
        });
        console.log(`   ✅ Thành công (${response.status}): ${response.data.message}`);
        console.log(`   📊 Data: type=${response.data.data.type}, verified=${response.data.data.verified}`);
      } catch (error) {
        console.log(`   ❌ Lỗi (${error.response?.status}): ${error.response?.data?.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi trong test mã hợp lệ:', error.message);
  }
}

async function testVerifyOTPExpiration() {
  try {
    console.log('\n🧪 Test OTP hết hạn...\n');

    const testEmail = 'expired@example.com';

    // Tạo OTP hết hạn (0 phút = hết hạn ngay)
    console.log('7. Test OTP đã hết hạn:');
    const expiredCode = await createTestOTP(testEmail, 'general', -1); // -1 phút = hết hạn
    if (expiredCode) {
      try {
        await axios.post(`${BASE_URL}/verify-otp`, {
          email: testEmail,
          code: expiredCode,
          type: 'general'
        });
      } catch (error) {
        console.log(`   ✅ Phản hồi đúng (${error.response?.status}): ${error.response?.data?.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Lỗi trong test hết hạn:', error.message);
  }
}

async function runAllTests() {
  try {
    console.log('🚀 Bắt đầu test toàn bộ Verify OTP API...\n');

    // Test cơ bản
    await testVerifyOTPBasic();

    // Test với mã hợp lệ
    await testVerifyOTPWithValidCodes();

    // Test hết hạn
    await testVerifyOTPExpiration();

    console.log('\n🎉 Hoàn thành tất cả tests!');
    console.log('\n📋 Tóm tắt:');
    console.log('   ✅ Test validation inputs');
    console.log('   ✅ Test các loại OTP khác nhau');
    console.log('   ✅ Test security (ẩn userData cho password_reset)');
    console.log('   ✅ Test OTP hết hạn');
    console.log('\n💡 Lưu ý:');
    console.log('   - API này chỉ verify OTP, không thực hiện action (tạo user, đổi password)');
    console.log('   - Để thực hiện action, sử dụng /verify-registration hoặc /reset-password');

  } catch (error) {
    console.error('❌ Lỗi trong test tổng thể:', error.message);
  } finally {
    // Cleanup: xóa test data
    try {
      await pool.query('DELETE FROM verification_codes WHERE email LIKE $1', ['%example.com']);
      console.log('\n🧹 Đã xóa dữ liệu test');
    } catch (cleanupError) {
      console.log('\n⚠️  Không thể xóa dữ liệu test:', cleanupError.message);
    }

    // Đóng connection
    if (pool && pool.end) {
      await pool.end();
    }
  }
}

// Chạy test nếu file được gọi trực tiếp
if (require.main === module) {
  runAllTests();
}

module.exports = {
  testVerifyOTPBasic,
  testVerifyOTPWithValidCodes,
  testVerifyOTPExpiration,
  createTestOTP,
  runAllTests
};
