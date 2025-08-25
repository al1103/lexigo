const { pool } = require('../config/database');
require('dotenv').config();

async function checkAndFixVerificationCodesTable() {
  const client = await pool.connect();

  try {
    console.log('🔧 Kiểm tra và sửa bảng verification_codes...\n');

    // Check if table exists
    const tableExistsQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'verification_codes'
      );
    `;

    const tableExists = await client.query(tableExistsQuery);

    if (!tableExists.rows[0].exists) {
      console.log('❌ Bảng verification_codes không tồn tại. Đang tạo...');

      await client.query(`
        CREATE TABLE verification_codes (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          code VARCHAR(10) NOT NULL,
          expiration_time TIMESTAMP NOT NULL,
          user_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);

      console.log('✅ Đã tạo bảng verification_codes với schema mới');
      return;
    }

    console.log('✅ Bảng verification_codes đã tồn tại');

    // Check current structure
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_codes'
      ORDER BY ordinal_position
    `;

    const columns = await client.query(columnsQuery);

    console.log('\n📋 Cấu trúc hiện tại:');
    columns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

    // Check for required columns
    const columnNames = columns.rows.map(row => row.column_name);
    const hasExpirationTime = columnNames.includes('expiration_time');
    const hasExpiresAt = columnNames.includes('expires_at');
    const hasUserData = columnNames.includes('user_data');

    console.log(`\n🔍 Phân tích columns:`);
    console.log(`   - expiration_time: ${hasExpirationTime ? '✅' : '❌'}`);
    console.log(`   - expires_at: ${hasExpiresAt ? '✅' : '❌'}`);
    console.log(`   - user_data: ${hasUserData ? '✅' : '❌'}`);

    // Add missing columns if needed
    let needsUpdates = false;

    if (!hasExpirationTime && !hasExpiresAt) {
      console.log('\n🔧 Thêm column expiration_time...');
      await client.query(`
        ALTER TABLE verification_codes
        ADD COLUMN expiration_time TIMESTAMP;
      `);
      console.log('✅ Đã thêm expiration_time');
      needsUpdates = true;
    }

    if (!hasUserData) {
      console.log('\n🔧 Thêm column user_data...');
      await client.query(`
        ALTER TABLE verification_codes
        ADD COLUMN user_data JSONB;
      `);
      console.log('✅ Đã thêm user_data');
      needsUpdates = true;
    }

    // Clear old data if structure was updated
    if (needsUpdates) {
      console.log('\n🧹 Xóa dữ liệu cũ (để tránh conflicts)...');
      await client.query('DELETE FROM verification_codes;');
      console.log('✅ Đã xóa dữ liệu cũ');
    }

    if (needsUpdates) {
      console.log('\n✅ Đã cập nhật cấu trúc bảng verification_codes');
    } else {
      console.log('\n✅ Cấu trúc bảng verification_codes đã sẵn sàng');
    }

    // Show final structure
    const finalColumns = await client.query(columnsQuery);
    console.log('\n📋 Cấu trúc cuối cùng:');
    finalColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (${row.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });

  } catch (error) {
    console.error('❌ Lỗi:', error);
  } finally {
    client.release();
    console.log('\n🎉 Hoàn thành! Bây giờ có thể test chức năng forgot password.');
  }
}

// Run if called directly
if (require.main === module) {
  checkAndFixVerificationCodesTable().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
}

module.exports = { checkAndFixVerificationCodesTable };
