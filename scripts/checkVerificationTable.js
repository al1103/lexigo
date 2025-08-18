const { pool } = require('../config/database');

async function checkVerificationTable() {
  try {
    console.log('🔍 Kiểm tra cấu trúc bảng verification_codes...');

    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_codes'
      ORDER BY ordinal_position
    `);

    if (result.rows.length === 0) {
      console.log('❌ Bảng verification_codes không tồn tại');
      return;
    }

    console.log('📋 Cấu trúc bảng verification_codes hiện tại:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

    // Kiểm tra xem có cột expiration_time không
    const hasExpirationTime = result.rows.some(row => row.column_name === 'expiration_time');
    const hasExpiresAt = result.rows.some(row => row.column_name === 'expires_at');

    console.log('\n🔍 Phân tích:');
    console.log(`  - Có cột expiration_time: ${hasExpirationTime ? '✅' : '❌'}`);
    console.log(`  - Có cột expires_at: ${hasExpiresAt ? '✅' : '❌'}`);

  } catch (error) {
    console.error('❌ Lỗi khi kiểm tra bảng:', error.message);
  } finally {
    pool.end();
  }
}

checkVerificationTable();
