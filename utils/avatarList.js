const { pool } = require('../config/database');

// Lấy danh sách avatar từ bảng avatars
async function getAvatarListFromDb() {
  try {
    const result = await pool.query('SELECT id, url FROM avatars ORDER BY id');
    return result.rows;
  } catch (error) {
    console.error('Error fetching avatars from DB:', error);
    return [];
  }
}

module.exports = getAvatarListFromDb;
