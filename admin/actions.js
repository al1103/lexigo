const { pool } = require('../config/database');

// Custom action để export data
const exportData = {
  actionType: 'resource',
  component: false,
  handler: async (request, response, context) => {
    const { resource } = context;

    try {
      const query = `SELECT * FROM ${resource.table}`;
      const result = await pool.query(query);

      // Set headers for CSV download
      response.setHeader('Content-Type', 'text/csv');
      response.setHeader('Content-Disposition', `attachment; filename="${resource.table}_export.csv"`);

      // Convert to CSV
      if (result.rows.length > 0) {
        const headers = Object.keys(result.rows[0]).join(',');
        const rows = result.rows.map(row =>
          Object.values(row).map(value =>
            typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
          ).join(',')
        );

        response.send([headers, ...rows].join('\n'));
      } else {
        response.send('No data available');
      }
    } catch (error) {
      console.error('Export error:', error);
      response.status(500).send('Export failed');
    }
  },
};

// Custom action để xem thống kê
const viewStats = {
  actionType: 'resource',
  component: false,
  handler: async (request, response, context) => {
    const { resource } = context;

    try {
      let stats = {};

      // User statistics
      if (resource.table === 'users') {
        const totalUsers = await pool.query('SELECT COUNT(*) as count FROM users');
        const adminUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
        const customerUsers = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['customer']);
        const recentUsers = await pool.query(
          'SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL \'7 days\''
        );

        stats = {
          total_users: totalUsers.rows[0].count,
          admin_users: adminUsers.rows[0].count,
          customer_users: customerUsers.rows[0].count,
          recent_users: recentUsers.rows[0].count,
        };
      }

      // Speaking statistics
      else if (resource.table === 'speaking_sessions') {
        const totalSessions = await pool.query('SELECT COUNT(*) as count FROM speaking_sessions');
        const completedSessions = await pool.query('SELECT COUNT(*) as count FROM speaking_sessions WHERE is_completed = true');
        const avgScore = await pool.query('SELECT AVG(average_score) as avg_score FROM speaking_sessions WHERE is_completed = true');

        stats = {
          total_sessions: totalSessions.rows[0].count,
          completed_sessions: completedSessions.rows[0].count,
          completion_rate: completedSessions.rows[0].count / totalSessions.rows[0].count * 100,
          average_score: parseFloat(avgScore.rows[0].avg_score || 0).toFixed(2),
        };
      }

      // Words statistics
      else if (resource.table === 'words') {
        const totalWords = await pool.query('SELECT COUNT(*) as count FROM words WHERE is_active = true');
        const easyWords = await pool.query('SELECT COUNT(*) as count FROM words WHERE difficulty_level = $1 AND is_active = true', ['easy']);
        const mediumWords = await pool.query('SELECT COUNT(*) as count FROM words WHERE difficulty_level = $1 AND is_active = true', ['medium']);
        const hardWords = await pool.query('SELECT COUNT(*) as count FROM words WHERE difficulty_level = $1 AND is_active = true', ['hard']);

        stats = {
          total_words: totalWords.rows[0].count,
          easy_words: easyWords.rows[0].count,
          medium_words: mediumWords.rows[0].count,
          hard_words: hardWords.rows[0].count,
        };
      }

      // Generate HTML response
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Statistics - ${resource.table}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .stats-container { max-width: 800px; margin: 0 auto; }
            .stat-card { background: #f5f5f5; padding: 20px; margin: 10px 0; border-radius: 8px; }
            .stat-title { font-size: 18px; font-weight: bold; color: #333; }
            .stat-value { font-size: 24px; color: #007bff; margin: 10px 0; }
            .back-btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
          </style>
        </head>
        <body>
          <div class="stats-container">
            <h1>Statistics for ${resource.table}</h1>
            ${Object.entries(stats).map(([key, value]) => `
              <div class="stat-card">
                <div class="stat-title">${key.replace(/_/g, ' ').toUpperCase()}</div>
                <div class="stat-value">${value}</div>
              </div>
            `).join('')}
            <br>
            <a href="/admin/resources/${resource.table}" class="back-btn">← Back to ${resource.table}</a>
          </div>
        </body>
        </html>
      `;

      response.send(html);
    } catch (error) {
      console.error('Stats error:', error);
      response.status(500).send('Failed to load statistics');
    }
  },
};

// Custom action để reset user password
const resetPassword = {
  actionType: 'record',
  component: false,
  guard: 'Bạn có chắc chắn muốn reset mật khẩu cho user này?',
  handler: async (request, response, context) => {
    const { record, resource } = context;

    if (resource.table !== 'users') {
      return response.status(400).send('Action only available for users');
    }

    try {
      const bcrypt = require('bcrypt');
      const newPassword = 'newpassword123';
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedPassword, record.params.id]
      );

      return {
        record: record.toJSON(),
        notice: {
          message: `Password reset successfully. New password: ${newPassword}`,
          type: 'success',
        },
      };
    } catch (error) {
      console.error('Password reset error:', error);
      return {
        record: record.toJSON(),
        notice: {
          message: 'Failed to reset password',
          type: 'error',
        },
      };
    }
  },
};

// Custom action để bulk delete
const bulkDelete = {
  actionType: 'resource',
  component: false,
  guard: 'Bạn có chắc chắn muốn xóa tất cả records đã chọn?',
  handler: async (request, response, context) => {
    const { resource } = context;
    const { recordIds } = request.payload || {};

    if (!recordIds || recordIds.length === 0) {
      return {
        notice: {
          message: 'Không có records nào được chọn',
          type: 'error',
        },
      };
    }

    try {
      const primaryKey = resource.primaryKey || 'id';
      const placeholders = recordIds.map((_, index) => `$${index + 1}`).join(',');

      const query = `DELETE FROM ${resource.table} WHERE ${primaryKey} IN (${placeholders})`;
      const result = await pool.query(query, recordIds);

      return {
        notice: {
          message: `Đã xóa ${result.rowCount} records thành công`,
          type: 'success',
        },
      };
    } catch (error) {
      console.error('Bulk delete error:', error);
      return {
        notice: {
          message: 'Có lỗi xảy ra khi xóa records',
          type: 'error',
        },
      };
    }
  },
};

module.exports = {
  exportData,
  viewStats,
  resetPassword,
  bulkDelete,
};
