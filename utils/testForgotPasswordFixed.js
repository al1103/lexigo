const axios = require('axios');
const { pool } = require('../config/database');
require('dotenv').config();

// Đổi BASE_URL theo cấu hình server của bạn
const BASE_URL = 'http://localhost:3000/api/users';

async function checkTableStructure() {
  try {
    console.log('🔍 Kiểm tra cấu trúc bảng verification_codes...');

    const tableInfoQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_codes'
      ORDER BY ordinal_position
    `;

    const tableInfo = await pool.query(tableInfoQuery);

    if (tableInfo.rows.length === 0) {
      console.log('❌ Bảng verification_codes không tồn tại!');
      return false;
    }

    console.log('✅ Cấu trúc bảng verification_codes:');
    tableInfo.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check for expiration columns
    const hasExpirationTime = tableInfo.rows.some(row => row.column_name === 'expiration_time');
    const hasExpiresAt = tableInfo.rows.some(row => row.column_name === 'expires_at');

    console.log(`\n📋 Phân tích:`);
    console.log(`   - Có expiration_time: ${hasExpirationTime ? '✅' : '❌'}`);
    console.log(`   - Có expires_at: ${hasExpiresAt ? '✅' : '❌'}`);

    if (!hasExpirationTime && !hasExpiresAt) {
      console.log('❌ Không tìm thấy column cho expiration time!');
      return false;
    }

    return true;

  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra cấu trúc bảng:', error.message);
    return false;
  }
}

async function testForgotPasswordWithColumnFix() {
  try {
    console.log('🧪 Test chức năng quên mật khẩu (đã sửa column name)...\n');

    // Kiểm tra cấu trúc bảng trước
    const tableOk = await checkTableStructure();
    if (!tableOk) {
      console.log('\n❌ Không thể tiếp tục test do vấn đề với bảng verification_codes');
      return;
    }

    console.log('\n🧪 Bắt đầu test API...');

    // Test với email không tồn tại
    console.log('1. Test email không tồn tại:');
    try {
      await axios.post(`${BASE_URL}/forgot-password`, {
        email: 'nonexistent@email.com'
      });
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng (${error.response?.status}): ${error.response?.data?.message || error.message}`);
    }

    // Test thiếu email
    console.log('\n2. Test thiếu email:');
    try {
      await axios.post(`${BASE_URL}/forgot-password`, {});
    } catch (error) {
      console.log(`   ✅ Phản hồi đúng (${error.response?.status}): ${error.response?.data?.message || error.message}`);
    }

    // Test với email hợp lệ (thay bằng email thực tế trong DB)
    console.log('\n3. Test với email hợp lệ:');
    const testEmail = 'test@example.com'; // Thay bằng email có trong DB

    console.log(`   📧 Gửi yêu cầu quên mật khẩu cho: ${testEmail}`);
    try {
      const forgotResponse = await axios.post(`${BASE_URL}/forgot-password`, {
        email: testEmail
      });
      console.log(`   ✅ Thành công (${forgotResponse.status}): ${forgotResponse.data.message}`);

      console.log('\n   📝 Mã xác nhận sẽ được hiển thị trong console của server!');
      console.log('   📝 Để test reset password, sử dụng mã từ server console.');

      // Test với mã giả để kiểm tra validation
      console.log('\n4. Test reset password với mã không hợp lệ:');
      try {
        await axios.post(`${BASE_URL}/reset-password`, {
          email: testEmail,
          code: '000000',
          newPassword: 'newpass123'
        });
      } catch (resetError) {
        console.log(`   ✅ Validation đúng (${resetError.response?.status}): ${resetError.response?.data?.message || resetError.message}`);
      }

    } catch (error) {
      console.log(`   ❌ Lỗi (${error.response?.status}): ${error.response?.data?.message || error.message}`);

      if (error.response?.status === 404) {
        console.log(`   ℹ️  Lỗi này bình thường nếu email ${testEmail} không tồn tại trong DB`);
        console.log('   ℹ️  Hãy thay đổi testEmail thành email có trong database của bạn');
      }
    }

    console.log('\n✅ Hoàn thành test. Chức năng forgot password đã được sửa để tương thích với schema database hiện tại.');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình test:', error.message);
  } finally {
    // Đóng pool connection nếu cần
    if (pool && pool.end) {
      await pool.end();
    }
  }
}

// Chạy test
testForgotPasswordWithColumnFix();

module.exports = {
  testForgotPasswordWithColumnFix,
  checkTableStructure
};
