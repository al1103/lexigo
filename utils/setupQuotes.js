const db = require('../config/database');
const fs = require('fs');
const path = require('path');

async function createQuotesTable() {
  try {
    console.log('Đang tạo bảng quotes...');

    // Đọc file SQL
    const sqlFile = path.join(__dirname, '../database/quotes_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Thực thi SQL
    await db.query(sql);

    console.log('✅ Tạo bảng quotes và thêm dữ liệu mẫu thành công!');

    // Kiểm tra dữ liệu
    const result = await db.query('SELECT COUNT(*) as count FROM quotes');
    console.log(`📊 Số lượng quotes trong database: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Lỗi khi tạo bảng quotes:', error);
    throw error;
  }
}

// Chạy migration nếu file được chạy trực tiếp
if (require.main === module) {
  createQuotesTable()
    .then(() => {
      console.log('Migration hoàn thành!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration thất bại:', error);
      process.exit(1);
    });
}

module.exports = { createQuotesTable };
