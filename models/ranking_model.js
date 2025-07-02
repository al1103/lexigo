const { pool } = require('../config/database');

const rankingModel = {
  // Cập nhật ranking cho user (đơn giản hơn)
  updateUserRanking: async (userId) => {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');

      try {
        // Lấy thông tin user và tính toán thống kê
        const statsQuery = `
          SELECT
            u.total_points,
            u.streak_days,
            COALESCE(COUNT(DISTINCT qs.id), 0) as quizzes_completed,
            COALESCE(AVG(CASE WHEN qr.is_correct THEN 100.0 ELSE 0.0 END), 0) as quiz_accuracy,
            COALESCE(AVG(sr.overall_score), 0) as speaking_score,
            COALESCE(COUNT(DISTINCT sr.word_id), 0) as words_learned
          FROM users u
          LEFT JOIN user_quiz_sessions qs ON u.id = qs.user_id AND qs.is_completed = TRUE
          LEFT JOIN user_quiz_responses qr ON qs.id = qr.session_id
          LEFT JOIN speaking_results sr ON u.id = sr.user_id
          WHERE u.id = $1
          GROUP BY u.id, u.total_points, u.streak_days
        `;

        const statsResult = await client.query(statsQuery, [userId]);
        const stats = statsResult.rows[0];

        // Tính điểm tuần và tháng từ point_history
        const weeklyPointsQuery = `
          SELECT COALESCE(SUM(points), 0) as weekly_points
          FROM point_history
          WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '7 days'
        `;

        const monthlyPointsQuery = `
          SELECT COALESCE(SUM(points), 0) as monthly_points
          FROM point_history
          WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days'
        `;

        const [weeklyResult, monthlyResult] = await Promise.all([
          client.query(weeklyPointsQuery, [userId]),
          client.query(monthlyPointsQuery, [userId])
        ]);

        const weeklyPoints = weeklyResult.rows[0].weekly_points;
        const monthlyPoints = monthlyResult.rows[0].monthly_points;

        // Upsert user ranking - SỬ DỤNG total_points TỪ USERS TABLE
        const upsertQuery = `
          INSERT INTO user_rankings (
            user_id, total_points, weekly_points, monthly_points,
            streak_days, quiz_accuracy, speaking_score, level_completed,
            last_updated
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
          ON CONFLICT (user_id)
          DO UPDATE SET
            total_points = EXCLUDED.total_points,
            weekly_points = EXCLUDED.weekly_points,
            monthly_points = EXCLUDED.monthly_points,
            streak_days = EXCLUDED.streak_days,
            quiz_accuracy = EXCLUDED.quiz_accuracy,
            speaking_score = EXCLUDED.speaking_score,
            level_completed = EXCLUDED.level_completed,
            last_updated = CURRENT_TIMESTAMP
        `;

        await client.query(upsertQuery, [
          userId,
          stats.total_points || 0, // SỬ DỤNG TRỰC TIẾP TỪ USERS TABLE
          weeklyPoints,
          monthlyPoints,
          stats.streak_days || 0,
          parseFloat(stats.quiz_accuracy) || 0,
          parseFloat(stats.speaking_score) || 0,
          0
        ]);

        // Cập nhật rank positions
        await this.updateRankPositions(client);

        // Kiểm tra và trao badges
        await this.checkAndAwardBadges(client, userId, stats);

        await client.query('COMMIT');
        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating user ranking:', error);
      throw error;
    }
  },

  // Thêm điểm cho user - CẬP NHẬT CẢ USERS TABLE VÀ POINT_HISTORY
  addPoints: async (userId, points, activityType, referenceId = null, description = null) => {
    try {
      const client = await pool.connect();
      await client.query('BEGIN');

      try {
        // Thêm vào point history
        await client.query(`
          INSERT INTO point_history (user_id, points, activity_type, reference_id, description)
          VALUES ($1, $2, $3, $4, $5)
        `, [userId, points, activityType, referenceId, description]);

        // Cập nhật total_points trong users table
        await client.query(`
          UPDATE users
          SET total_points = total_points + $2
          WHERE id = $1
        `, [userId, points]);

        await client.query('COMMIT');

        // Cập nhật ranking (async)
        this.updateUserRanking(userId).catch(console.error);

        return true;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error adding points:', error);
      throw error;
    }
  },

  // Lấy bảng xếp hạng - SỬ DỤNG USERS.TOTAL_POINTS
  getLeaderboard: async (type = 'global', limit = 50, userId = null) => {
    try {
      let rankColumn, pointsColumn, joinClause = '';

      switch (type) {
        case 'weekly':
          rankColumn = 'weekly_rank';
          pointsColumn = 'weekly_points';
          joinClause = 'JOIN user_rankings ur ON u.id = ur.user_id';
          break;
        case 'monthly':
          rankColumn = 'monthly_rank';
          pointsColumn = 'monthly_points';
          joinClause = 'JOIN user_rankings ur ON u.id = ur.user_id';
          break;
        default:
          // GLOBAL - SỬ DỤNG TRỰC TIẾP USERS.TOTAL_POINTS
          const globalQuery = `
            SELECT
              ROW_NUMBER() OVER (ORDER BY u.total_points DESC, u.created_at ASC) as rank,
              u.id as user_id,
              u.username,
              u.full_name,
              u.total_points as points,
              u.streak_days,
              COALESCE(ur.quiz_accuracy, 0) as quiz_accuracy,
              COALESCE(ur.speaking_score, 0) as speaking_score,
              ARRAY_AGG(b.icon) FILTER (WHERE b.icon IS NOT NULL) as badges
            FROM users u
            LEFT JOIN user_rankings ur ON u.id = ur.user_id
            LEFT JOIN user_badges ub ON u.id = ub.user_id
            LEFT JOIN badges b ON ub.badge_id = b.id
            WHERE u.total_points > 0
            GROUP BY u.id, u.username, u.full_name, u.total_points, u.streak_days,
                     ur.quiz_accuracy, ur.speaking_score
            ORDER BY u.total_points DESC, u.created_at ASC
            LIMIT $1
          `;

          const globalResult = await pool.query(globalQuery, [limit]);

          // Lấy thông tin rank của user hiện tại nếu có
          let userRank = null;
          if (userId) {
            const userRankQuery = `
              SELECT
                (SELECT COUNT(*) + 1 FROM users WHERE total_points > u.total_points) as rank,
                u.total_points as points,
                u.streak_days,
                COALESCE(ur.quiz_accuracy, 0) as quiz_accuracy,
                COALESCE(ur.speaking_score, 0) as speaking_score
              FROM users u
              LEFT JOIN user_rankings ur ON u.id = ur.user_id
              WHERE u.id = $1
            `;

            const userRankResult = await pool.query(userRankQuery, [userId]);
            userRank = userRankResult.rows[0] || null;
          }

          return {
            leaderboard: globalResult.rows,
            user_rank: userRank,
            type: 'global'
          };
      }

      // Cho weekly và monthly rankings
      const query = `
        SELECT
          ur.${rankColumn} as rank,
          ur.user_id,
          u.username,
          u.full_name,
          ur.${pointsColumn} as points,
          ur.streak_days,
          ur.quiz_accuracy,
          ur.speaking_score,
          ARRAY_AGG(b.icon) FILTER (WHERE b.icon IS NOT NULL) as badges
        FROM user_rankings ur
        JOIN users u ON ur.user_id = u.id
        LEFT JOIN user_badges ub ON ur.user_id = ub.user_id
        LEFT JOIN badges b ON ub.badge_id = b.id
        WHERE ur.${rankColumn} > 0
        GROUP BY ur.${rankColumn}, ur.user_id, u.username, u.full_name,
                 ur.${pointsColumn}, ur.streak_days, ur.quiz_accuracy, ur.speaking_score
        ORDER BY ur.${rankColumn} ASC
        LIMIT $1
      `;

      const result = await pool.query(query, [limit]);

      let userRank = null;
      if (userId) {
        const userRankQuery = `
          SELECT
            ur.${rankColumn} as rank,
            ur.${pointsColumn} as points,
            ur.streak_days,
            ur.quiz_accuracy,
            ur.speaking_score
          FROM user_rankings ur
          WHERE ur.user_id = $1
        `;

        const userRankResult = await pool.query(userRankQuery, [userId]);
        userRank = userRankResult.rows[0] || null;
      }

      return {
        leaderboard: result.rows,
        user_rank: userRank,
        type: type
      };
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      throw error;
    }
  },

  // Cập nhật vị trí xếp hạng cho người dùng (rank positions)
  updateRankPositions: async (client) => {
    try {
      // Cập nhật weekly_rank
      await client.query(`
        WITH ranked_users AS (
          SELECT
            user_id,
            ROW_NUMBER() OVER (ORDER BY weekly_points DESC, last_updated ASC) as rank
          FROM user_rankings
          WHERE weekly_points > 0
        )
        UPDATE user_rankings ur
        SET weekly_rank = ru.rank
        FROM ranked_users ru
        WHERE ur.user_id = ru.user_id
      `);

      // Cập nhật monthly_rank
      await client.query(`
        WITH ranked_users AS (
          SELECT
            user_id,
            ROW_NUMBER() OVER (ORDER BY monthly_points DESC, last_updated ASC) as rank
          FROM user_rankings
          WHERE monthly_points > 0
        )
        UPDATE user_rankings ur
        SET monthly_rank = ru.rank
        FROM ranked_users ru
        WHERE ur.user_id = ru.user_id
      `);
    } catch (error) {
      console.error('Error updating rank positions:', error);
      throw error;
    }
  },

  // Kiểm tra và trao badges cho người dùng
  checkAndAwardBadges: async (client, userId, stats) => {
    try {
      // Ví dụ: Trao badge dựa trên số điểm
      const pointBadgeThresholds = [100, 500, 1000]; // Ngưỡng điểm để nhận badge
      const awardedBadges = [];

      for (let i = 0; i < pointBadgeThresholds.length; i++) {
        const threshold = pointBadgeThresholds[i];

        // Kiểm tra xem người dùng đã nhận badge này chưa
        const badgeCheckQuery = `
          SELECT COUNT(*) as count
          FROM user_badges
          WHERE user_id = $1 AND badge_id = $2
        `;
        const badgeCheckResult = await client.query(badgeCheckQuery, [userId, i + 1]);
        const badgeCount = badgeCheckResult.rows[0].count;

        if (badgeCount === 0 && stats.total_points >= threshold) {
          // Nếu chưa nhận badge và đạt ngưỡng điểm, tiến hành trao badge
          const awardBadgeQuery = `
            INSERT INTO user_badges (user_id, badge_id, awarded_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
          `;
          await client.query(awardBadgeQuery, [userId, i + 1]);
          awardedBadges.push(i + 1);
        }
      }

      return awardedBadges;
    } catch (error) {
      console.error('Error checking and awarding badges:', error);
      throw error;
    }
  },
};

module.exports = rankingModel;
