const { pool } = require('../config/database');

async function checkBookmarkData() {
  try {
    console.log('🔍 Checking bookmark data...');

    // Kiểm tra bảng user_bookmarks
    console.log('\n📊 User Bookmarks:');
    const bookmarksResult = await pool.query('SELECT * FROM user_bookmarks LIMIT 10');
    if (bookmarksResult.rows.length > 0) {
      console.table(bookmarksResult.rows);
    } else {
      console.log('❌ Không có bookmark nào trong database');
    }

    // Kiểm tra từ có ID = 26
    console.log('\n📖 Word ID = 26:');
    const wordResult = await pool.query('SELECT * FROM words WHERE id = 26');
    if (wordResult.rows.length > 0) {
      console.table(wordResult.rows);
    } else {
      console.log('❌ Không tìm thấy từ có ID = 26');
    }

    // Kiểm tra user có ID = 9
    console.log('\n👤 User ID = 9:');
    const userResult = await pool.query('SELECT id, username, email FROM users WHERE id = 9');
    if (userResult.rows.length > 0) {
      console.table(userResult.rows);
    } else {
      console.log('❌ Không tìm thấy user có ID = 9');
    }

    // Kiểm tra bookmark cụ thể user_id=9, word_id=26
    console.log('\n🔖 Bookmark user_id=9, word_id=26:');
    const specificBookmark = await pool.query(
      'SELECT * FROM user_bookmarks WHERE user_id = 9 AND word_id = 26'
    );
    if (specificBookmark.rows.length > 0) {
      console.table(specificBookmark.rows);
      console.log('✅ Bookmark tồn tại - có thể xóa được');
    } else {
      console.log('❌ Bookmark KHÔNG tồn tại - không thể xóa');
    }

    // Tạo bookmark test để có thể xóa
    console.log('\n🔧 Tạo bookmark test...');
    try {
      await pool.query(
        'INSERT INTO user_bookmarks (user_id, word_id, notes) VALUES (9, 26, $1) ON CONFLICT (user_id, word_id) DO NOTHING',
        ['Test bookmark for deletion']
      );
      console.log('✅ Đã tạo bookmark test user_id=9, word_id=26');
    } catch (error) {
      console.log('⚠️ Lỗi tạo bookmark test:', error.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Chạy script
checkBookmarkData();
