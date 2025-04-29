const { pool } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { generateReferralCode } = require("../utils/referral");

class UserModel {
  static async updateUser(userId, userData) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const { fullName, phoneNumber, address, avatar } = userData;

      // Xây dựng câu truy vấn cập nhật động
      const updateFields = [];
      const queryParams = [];
      let paramCounter = 1;

      if (fullName) {
        updateFields.push(`full_name = $${paramCounter}`);
        queryParams.push(fullName);
        paramCounter++;
      }

      if (phoneNumber) {
        updateFields.push(`phone_number = $${paramCounter}`);
        queryParams.push(phoneNumber);
        paramCounter++;
      }

      if (address !== undefined) {
        // Kiểm tra undefined để cho phép cập nhật địa chỉ thành chuỗi rỗng
        updateFields.push(`address = $${paramCounter}`);
        queryParams.push(address);
        paramCounter++;
      }

      if (avatar) {
        updateFields.push(`avatar = $${paramCounter}`);
        queryParams.push(avatar);
        paramCounter++;
      }

      // Thêm tham số cuối cùng là user_id
      queryParams.push(userId);

      // Nếu không có trường nào được cập nhật
      if (updateFields.length === 0) {
        return null;
      }

      // Xây dựng và thực thi câu truy vấn
      const updateQuery = `
        UPDATE users
        SET ${updateFields.join(", ")}, updated_at = NOW()
        WHERE user_id = $${paramCounter}
        RETURNING user_id, username, email, full_name, phone_number, address, avatar
      `;

      const result = await client.query(updateQuery, queryParams);
      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error updating user:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Modify the register method to include role
  static async register(
    username,
    email,
    password,
    fullName,
    phoneNumber,
    referralCode = null,
    role = "customer" // Default role is customer
  ) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const userId = uuidv4();
      const userReferralCode = generateReferralCode();

      // Check if user exists
      const existingUserResult = await client.query(
        `SELECT 1 FROM users 
         WHERE username = $1 OR email = $2`,
        [username, email]
      );

      if (existingUserResult.rows.length > 0) {
        throw new Error("Email hoặc tên người dùng đã tồn tại");
      }

      let referrerId = null;

      // If referral code provided, find the referrer
      if (referralCode) {
        const referrerResult = await client.query(
          `SELECT user_id FROM users WHERE referral_code = $1`,
          [referralCode]
        );

        if (referrerResult.rows.length > 0) {
          referrerId = referrerResult.rows[0].user_id;
        }
      }

      // Insert new user
      await client.query(
        `INSERT INTO users (
          user_id, username, email, password, 
          full_name, phone_number, referral_code,
          referred_by, role, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
        )`,
        [
          userId,
          username,
          email,
          password,
          fullName,
          phoneNumber,
          userReferralCode,
          referrerId,
          role,
        ]
      );

      // If referred by someone, build the referral tree
      if (referrerId) {
        // First, insert direct referral (level 1)
        await client.query(
          `INSERT INTO referral_tree (user_id, ancestor_id, level)
           VALUES ($1, $2, 1)`,
          [userId, referrerId]
        );

        // Then get all ancestors of the referrer up to level 4
        // (as they'll be levels 2-5 for the new user)
        const ancestorsResult = await client.query(
          `SELECT ancestor_id, level 
           FROM referral_tree 
           WHERE user_id = $1 AND level <= 4`,
          [referrerId]
        );

        // Insert these ancestors with incremented levels
        for (const ancestor of ancestorsResult.rows) {
          await client.query(
            `INSERT INTO referral_tree (user_id, ancestor_id, level)
             VALUES ($1, $2, $3)`,
            [userId, ancestor.ancestor_id, ancestor.level + 1]
          );
        }

        // Give signup bonus to direct referrer
        const signupBonus = 50000; // VND

        await client.query(
          `UPDATE users 
           SET wallet_balance = wallet_balance + $1 
           WHERE user_id = $2`,
          [signupBonus, referrerId]
        );

        // Record the transaction
        await client.query(
          `INSERT INTO wallet_transactions (
            user_id, amount, transaction_type, reference_id, description, created_at
          ) VALUES (
            $1, $2, 'signup_bonus', $3, 'Thưởng giới thiệu đăng ký thành công', NOW()
          )`,
          [referrerId, signupBonus, userId]
        );

        // Record the referral
        await client.query(
          `INSERT INTO referrals (
            referrer_id, referred_id, commission, status, level, created_at, updated_at
          ) VALUES (
            $1, $2, $3, 'completed', 1, NOW(), NOW()
          )`,
          [referrerId, userId, signupBonus]
        );
      }

      await client.query("COMMIT");

      return {
        userId,
        referralCode: userReferralCode,
        message: "Đăng ký thành công!",
      };
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Lỗi trong quá trình đăng ký:", error.message);
      throw new Error("Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      client.release();
    }
  }

  // Add referral-related methods
  static async getReferralInfo(userId) {
    try {
      // Get user's referral code and wallet balance
      const userResult = await pool.query(
        `SELECT referral_code, wallet_balance FROM users WHERE user_id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error("Người dùng không tồn tại");
      }

      // Get summary statistics of all levels
      const statsQuery = `
        SELECT 
          rt.level,
          COUNT(DISTINCT rt.user_id) as total_referrals,
          COALESCE(SUM(r.commission), 0) as total_commission
        FROM referral_tree rt
        LEFT JOIN referrals r ON r.referrer_id = $1 AND r.referred_id = rt.user_id AND r.level = rt.level
        WHERE rt.ancestor_id = $1
        GROUP BY rt.level
        ORDER BY rt.level ASC
      `;

      const statsResult = await pool.query(statsQuery, [userId]);

      // Get recent referrals
      const recentQuery = `
        SELECT 
          r.id, 
          r.commission, 
          r.status,
          r.level, 
          r.created_at,
          u.username,
          u.full_name
        FROM referrals r
        JOIN users u ON r.referred_id = u.user_id
        WHERE r.referrer_id = $1
        ORDER BY r.created_at DESC
        LIMIT 10
      `;

      const recentResult = await pool.query(recentQuery, [userId]);

      // Process stats by level
      const levelStats = [];
      let totalReferrals = 0;
      let totalCommission = 0;

      // Process each level (ensure we have data for all 5 levels even if empty)
      for (let level = 1; level <= 5; level++) {
        const levelData = statsResult.rows.find(
          (row) => row.level === level
        ) || {
          level,
          total_referrals: "0",
          total_commission: "0",
        };

        const referrals = parseInt(levelData.total_referrals);
        const commission = parseFloat(levelData.total_commission);

        totalReferrals += referrals;
        totalCommission += commission;

        levelStats.push({
          level,
          referrals,
          commission,
        });
      }

      return {
        referralCode: userResult.rows[0].referral_code,
        walletBalance: userResult.rows[0].wallet_balance,
        totalReferrals,
        totalCommission,
        levelStats,
        recentReferrals: recentResult.rows.map((row) => ({
          id: row.id,
          commission: parseFloat(row.commission),
          status: row.status,
          level: row.level,
          createdAt: row.created_at,
          username: row.username,
          fullName: row.full_name,
        })),
      };
    } catch (error) {
      console.error("Lỗi khi lấy thông tin giới thiệu:", error);
      throw error;
    }
  }

  static async getWalletTransactions(userId, page = 1, limit = 10) {
    try {
      page = Math.max(1, parseInt(page));
      limit = Math.max(1, Math.min(100, parseInt(limit)));
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await pool.query(
        `SELECT COUNT(*) AS total_count FROM wallet_transactions WHERE user_id = $1`,
        [userId]
      );

      // Get transactions
      const transactionsResult = await pool.query(
        `SELECT 
          id,
          amount,
          transaction_type AS "transactionType",
          reference_id AS "referenceId",
          description,
          created_at AS "createdAt"
         FROM wallet_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      );

      const totalCount = parseInt(countResult.rows[0].total_count);
      const totalPages = Math.ceil(totalCount / limit);

      return {
        transactions: transactionsResult.rows,
        pagination: {
          totalItems: totalCount,
          totalPages,
          currentPage: page,
          pageSize: limit,
        },
      };
    } catch (error) {
      console.error("Lỗi khi lấy lịch sử giao dịch:", error);
      throw error;
    }
  }

  static async withdrawFromWallet(userId, amount, bankDetails) {
    try {
      // Begin transaction
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        // Check if user has enough balance
        const userResult = await client.query(
          `SELECT wallet_balance FROM users WHERE user_id = $1`,
          [userId]
        );

        if (userResult.rows.length === 0) {
          throw new Error("Người dùng không tồn tại");
        }

        const currentBalance = parseFloat(userResult.rows[0].wallet_balance);

        if (currentBalance < amount) {
          throw new Error("Số dư không đủ để rút tiền");
        }

        // Update user's wallet balance
        await client.query(
          `UPDATE users SET wallet_balance = wallet_balance - $1 WHERE user_id = $2`,
          [amount, userId]
        );

        // Insert withdrawal request
        const withdrawalResult = await client.query(
          `INSERT INTO wallet_transactions (
            user_id, amount, transaction_type, description, created_at
          ) VALUES (
            $1, $2, 'withdrawal', $3, NOW()
          ) RETURNING id`,
          [
            userId,
            amount,
            `Rút tiền đến tài khoản: ${bankDetails.bankName} - ${bankDetails.accountNumber}`,
          ]
        );

        await client.query("COMMIT");

        return {
          transactionId: withdrawalResult.rows[0].id,
          amount,
          message: "Yêu cầu rút tiền đã được gửi",
        };
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Lỗi khi rút tiền:", error);
      throw error;
    }
  }

  // Update the login method to return role information
  static async login(email, password) {
    try {
      const query = `
        SELECT 
          user_id AS "userId",
          username,
          email,
          password,
          full_name AS "fullName",
          phone_number AS "phoneNumber",
          address,
          wallet_balance AS "walletBalance",
          referral_code AS "referralCode",
          role
        FROM users
        WHERE email = $1
      `;

      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      const user = result.rows[0];

      // Kiểm tra mật khẩu
      if (user.password !== password) {
        return null;
      }

      // Xóa mật khẩu trước khi trả về
      delete user.password;

      return user;
    } catch (error) {
      console.error("Error during login:", error);
      throw error;
    }
  }

  static async sendCode(email, code, userData = null) {
    try {
      // Delete any existing verification codes
      await pool.query(`DELETE FROM verification_codes WHERE email = $1`, [
        email,
      ]);

      // Set expiration time
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 10);

      // Insert new code with user data
      await pool.query(
        `INSERT INTO verification_codes (
          email, code, type, expiration_time, is_verified, created_at, user_data
        ) VALUES (
          $1, $2, $3, $4, $5, NOW(), $6
        )`,
        [email, code, "register", expirationTime, false, userData]
      );
    } catch (error) {
      console.error("Lỗi trong sendCode:", error);
      throw error;
    }
  }

  static async verifyCode(email, code) {
    try {
      const result = await pool.query(
        `SELECT * FROM verification_codes 
         WHERE email = $1 AND code = $2 `,
        [email, code]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error("Lỗi khi xác minh mã xác nhận:", error);
      throw error;
    }
  }

  static async getUserByEmail(email) {
    try {
      const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [
        email,
      ]);
      return result.rows[0];
    } catch (error) {
      console.error("Lỗi khi lấy thông tin người dùng qua email:", error);
      throw error;
    }
  }

  // Update the getUserById method to return role information
  static async getUserById(userId) {
    try {
      const query = `
        SELECT 
          user_id AS "userId",
          username,
          email,
          password AS "password",
          full_name AS "fullName",
          phone_number AS "phoneNumber",
          address,
          wallet_balance AS "walletBalance",
          avatar,
          referral_code AS "referralCode",
          role,
          created_at AS "createdAt",
          updated_at AS "updatedAt"
        FROM users
        WHERE user_id = $1
      `;
      const result = await pool.query(query, [userId]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  static async deleteVerificationCode(email, code) {
    try {
      await pool.query(
        `DELETE FROM verification_codes 
         WHERE email = $1 AND code = $2`,
        [email, code]
      );
    } catch (error) {
      console.error("Lỗi trong deleteVerificationCode:", error);
      throw error;
    }
  }

  static async saveRefreshToken(userId, token) {
    try {
      await pool.query(
        `INSERT INTO refresh_tokens (user_id, token, created_at) 
         VALUES ($1, $2, NOW())`,
        [userId, token]
      );
    } catch (error) {
      console.error("Lỗi trong saveRefreshToken:", error);
      throw error;
    }
  }

  static async saveVerificationCode(email, code) {
    try {
      // Xóa mã xác nhận cũ (nếu có)
      await pool.query(`DELETE FROM verification_codes WHERE email = $1`, [
        email,
      ]);

      // Thêm mã xác nhận mới
      await pool.query(
        `INSERT INTO verification_codes (email, code, expiration_time, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '15 minutes', NOW())`,
        [email, code]
      );
    } catch (error) {
      console.error("Lỗi khi lưu mã xác nhận:", error);
      throw error;
    }
  }

  // Add method to get all users (for admin)
  static async getAllUsers(page = 1, limit = 10) {
    try {
      page = Math.max(1, parseInt(page));
      limit = Math.max(1, Math.min(100, parseInt(limit)));
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const countResult = await pool.query(
        "SELECT COUNT(*) AS total FROM users"
      );
      const totalCount = parseInt(countResult.rows[0].total);

      // Get paginated users
      const result = await pool.query(
        `SELECT 
          user_id AS "userId",
          username,
          email,
          full_name AS "fullName",
          phone_number AS "phoneNumber",
          role,
          referral_code AS "referralCode",
          wallet_balance AS "walletBalance",
          created_at AS "createdAt"
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2`,
        [limit, offset]
      );

      return {
        users: result.rows,
        pagination: {
          totalItems: totalCount,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: page,
          pageSize: limit,
        },
      };
    } catch (error) {
      console.error("Lỗi khi lấy danh sách người dùng:", error);
      throw error;
    }
  }

  // Add method to update user role (admin only)
  static async updateUserRole(userId, role) {
    try {
      if (!["admin", "customer", "staff"].includes(role)) {
        throw new Error(
          "Vai trò không hợp lệ. Phải là admin, customer hoặc staff."
        );
      }

      const result = await pool.query(
        `UPDATE users SET role = $1, updated_at = NOW() 
         WHERE user_id = $2 
         RETURNING user_id`,
        [role, userId]
      );

      if (result.rows.length === 0) {
        throw new Error("Không tìm thấy người dùng với ID đã cung cấp");
      }

      return await this.getUserById(userId);
    } catch (error) {
      console.error("Lỗi khi cập nhật vai trò người dùng:", error);
      throw error;
    }
  }

  // Add method to delete user (admin only)
  static async deleteUser(userId) {
    try {
      const result = await pool.query(
        "DELETE FROM users WHERE user_id = $1 RETURNING user_id",
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error("Không tìm thấy người dùng với ID đã cung cấp");
      }

      return { message: "Xóa người dùng thành công" };
    } catch (error) {
      console.error("Lỗi khi xóa người dùng:", error);
      throw error;
    }
  }

  // Method to calculate and distribute referral commissions
  static async distributeOrderCommission(userId, orderAmount) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get all ancestors up to 5 levels
      const ancestorsQuery = `
        SELECT 
          ancestor_id, 
          level 
        FROM referral_tree 
        WHERE user_id = $1 AND level <= 5
        ORDER BY level ASC`;

      const ancestorsResult = await client.query(ancestorsQuery, [userId]);

      // Get commission rates
      const ratesQuery = `SELECT level, rate FROM referral_commission_rates WHERE level <= 5`;
      const ratesResult = await client.query(ratesQuery);

      const rates = {};
      ratesResult.rows.forEach((row) => {
        rates[row.level] = parseFloat(row.rate);
      });

      // Process commissions for each ancestor
      for (const ancestor of ancestorsResult.rows) {
        const level = ancestor.level;
        const ancestorId = ancestor.ancestor_id;
        const commissionRate = rates[level] || 0;
        const commissionAmount = (orderAmount * commissionRate) / 100;

        if (commissionAmount <= 0) continue;

        // Add commission to referrer's wallet
        await client.query(
          `UPDATE users 
           SET wallet_balance = wallet_balance + $1,
               updated_at = NOW()
           WHERE user_id = $2`,
          [commissionAmount, ancestorId]
        );

        // Record the commission transaction
        await client.query(
          `INSERT INTO wallet_transactions (
            user_id, 
            amount, 
            transaction_type, 
            reference_id, 
            description, 
            created_at
          ) VALUES (
            $1, $2, 'referral_commission', $3, 
            $4, NOW()
          )`,
          [
            ancestorId,
            commissionAmount,
            userId,
            `Hoa hồng cấp ${level} từ đơn hàng`,
          ]
        );

        // Record the referral commission
        await client.query(
          `INSERT INTO referrals (
            referrer_id, 
            referred_id, 
            commission, 
            status, 
            level,
            created_at, 
            updated_at
          ) VALUES (
            $1, $2, $3, 'completed', $4, NOW(), NOW()
          )`,
          [ancestorId, userId, commissionAmount, level]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Error distributing commissions:", error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updatePassword(email, newPassword) {
    try {
      // const hashedPassword = bcrypt.hashSync(newPassword, 10);
      const hashedPassword = newPassword; // Nếu không cần hash

      const result = await pool.query(
        `UPDATE users 
         SET password = $1, updated_at = NOW()
         WHERE email = $2
         RETURNING user_id, email`,
        [hashedPassword, email]
      );

      return result.rows[0];
    } catch (error) {
      console.error("Lỗi khi cập nhật mật khẩu:", error);
      throw error;
    }
  }
}

module.exports = UserModel;
