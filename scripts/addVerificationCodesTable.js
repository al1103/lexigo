const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

async function addVerificationCodesTable() {
  try {
    console.log('🔄 Bắt đầu thêm bảng verification_codes...');

    // Đọc file SQL migration
    const sqlPath = path.join(__dirname, '../database/add_verification_codes_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Thực thi SQL
    await pool.query(sql);

    console.log('✅ Đã thêm bảng verification_codes thành công!');

    // Kiểm tra bảng đã được tạo
    const checkResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'verification_codes'
      ORDER BY ordinal_position
    `);

    console.log('📋 Cấu trúc bảng verification_codes:');
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });

  } catch (error) {
    console.error('❌ Lỗi khi thêm bảng verification_codes:', error.message);
    throw error;
  }
}

// Chạy script nếu được gọi trực tiếp
if (require.main === module) {
  addVerificationCodesTable()
    .then(() => {
      console.log('🎉 Migration hoàn thành!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration thất bại:', error);
      process.exit(1);
    });
}

module.exports = addVerificationCodesTable;
