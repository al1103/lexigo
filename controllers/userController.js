require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const UserModel = require("../models/user_model");
const { pool } = require("../config/database");
const { sendRandomCodeEmail } = require("../server/server");
const { getPaginationParams } = require("../utils/pagination");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const ApiResponse = require("../utils/apiResponse");
const getAvatarListFromDb = require("../utils/avatarList");



const userController = {
  // Đăng ký user mới
  register: async (req, res) => {
    try {
      const {
        username,
        email,
        password,
        fullName,
      } = req.body;

      // Basic validation
      if (!username || !email || !password || !fullName) {
        return res.status(400).json({
          status: 400,
          message: "Vui lòng điền đầy đủ thông tin",
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: 400,
          message: "Email không hợp lệ",
        });
      }

      // Validate password strength (min 6 characters)
      if (password.length < 6) {
        return res.status(400).json({
          status: 400,
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        });
      }

      // Check if username or email already exists
      const existingUserQuery = `
      SELECT 1 FROM users
      WHERE username = $1 OR email = $2
    `;
      const existingUserResult = await pool.query(existingUserQuery, [
        username,
        email,
      ]);

      if (existingUserResult.rows.length > 0) {
        return res.status(400).json({
          status: 400,
          message: "Email hoặc tên đăng nhập đã được sử dụng",
        });
      }

      // Generate verification code (6 digits)
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Store password as is (no hashing)
      const plainPassword = password;

      // Store temporary user data
      const userData = {
        username,
        email,
        password: plainPassword,
        fullName,
      };

      console.log("Storing registration data for verification:", {
        ...userData,
        password: "[PLAIN]",
      });

      // Create expiration time (10 minutes from now)
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 10);

      // First delete any existing record with this email
      await pool.query(`DELETE FROM verification_codes WHERE email = $1`, [
        email,
      ]);

      // Check if verification_codes table exists and has the correct column name
      try {
        const tableInfoQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'verification_codes'
      `;
        const tableInfo = await pool.query(tableInfoQuery);
        console.log(
          "Verification_codes columns:",
          tableInfo.rows.map((row) => row.column_name)
        );

        const hasExpirationTime = tableInfo.rows.some(
          (row) => row.column_name === "expiration_time"
        );
        const hasExpiresAt = tableInfo.rows.some(
          (row) => row.column_name === "expires_at"
        );

        // Use the correct column name based on what's available
        const expirationColumnName = hasExpirationTime
          ? "expiration_time"
          : hasExpiresAt
          ? "expires_at"
          : "expiration_time";

        console.log(
          `Using column name: ${expirationColumnName} for expiration time`
        );

        // Insert the new verification record using the correct column name and table structure
        if (hasExpiresAt) {
          // Use the existing table structure with expires_at and user_data
          await pool.query(
            `INSERT INTO verification_codes (email, code, expires_at, code_type, verified, attempts, max_attempts, user_data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [email, code, expirationTime, 'registration', false, 0, 3, JSON.stringify(userData)]
          );
        } else {
          // Use the new table structure with expiration_time and user_data
          await pool.query(
            `INSERT INTO verification_codes (email, code, ${expirationColumnName}, user_data, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [email, code, expirationTime, JSON.stringify(userData)]
          );
        }
      } catch (dbError) {
        console.error("Database error during table check:", dbError);
        // If the table doesn't exist or other DB issues, create it
        await pool.query(`
        CREATE TABLE IF NOT EXISTS verification_codes (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          code VARCHAR(10) NOT NULL,
          expiration_time TIMESTAMP NOT NULL,
          user_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

        // Then try the insert again with the new structure
        await pool.query(
          `INSERT INTO verification_codes (email, code, expiration_time, user_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
          [email, code, expirationTime, JSON.stringify(userData)]
        );
      }

      // Log the code being sent (for development only, remove in production)
      console.log(`Verification code ${code} for ${email}`);

      // Send verification email
      try {
        await sendRandomCodeEmail(email, code);
        console.log(`Verification email sent to ${email}`);
      } catch (emailError) {
        console.error("Error sending verification email:", emailError);
        return res.status('500').json({
          status: '500',
          message: "Không thể gửi email xác thực. Vui lòng thử lại sau.",
        });
      }

      return res.status('200').json({
        status: '200',
        message: "Vui lòng kiểm tra email để lấy mã xác nhận",
        data: { email, code },
      });
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      return res.status('500').json({
        status: '500',
        message: "Đã xảy ra lỗi trong quá trình đăng ký",
        error: error.message,
      });
    }
  },

  // Đăng nhập
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log("Login attempt with email:", email);

      // Validation
      if (!email || !password) {
        return ApiResponse.error(res, 400, "Email and password are required");
      }

      // Login user
      const loginResult = await UserModel.login(email, password);

      return ApiResponse.success(res, '200', "Login successful", loginResult);
    } catch (error) {
      console.error("Login error:", error);

      if (error.message === "User not found" || error.message === "Invalid password") {
        return ApiResponse.error(res, 401, "Invalid email or password");
      }

      return ApiResponse.error(res, 500, "Login failed");
    }
  },

  // Lấy profile user
  getProfile: async (req, res) => {
    try {
      const userId = req.user.userId;

      const user = await UserModel.getUserWithStats(userId);

      if (!user) {
        return ApiResponse.error(res, 404, "User not found");
      }

      return ApiResponse.success(res, '200', "Profile retrieved successfully",   user );
    } catch (error) {
      console.error("Get profile error:", error);
      return ApiResponse.error(res, 500, "Failed to get profile");
    }
  },

  // Cập nhật profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { username, full_name } = req.body;

      console.log('🔧 Update Profile Request:', {
        userId,
        username,
        full_name,
        emailRemoved: 'Email updates are disabled for security',
        avatarRemoved: 'Avatar updates are disabled - use /upload-avatar instead'
      });

      const updatedUser = await UserModel.updateProfile(userId, {
        username,
        full_name,
      });

      return ApiResponse.success(res, '200', "Profile updated successfully", {
        user: updatedUser,
      });
    } catch (error) {
      console.error("Update profile error:", error);
      return ApiResponse.error(res, 500, "Failed to update profile");
    }
  },

  // Đổi mật khẩu
  changePassword: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return ApiResponse.error(res, 400, "Current password and new password are required");
      }

      if (new_password.length < 6) {
        return ApiResponse.error(res, 400, "New password must be at least 6 characters long");
      }

      await UserModel.changePassword(userId, current_password, new_password);

      return ApiResponse.success(res, '200', "Password changed successfully");
    } catch (error) {
      console.error("Change password error:", error);

      if (error.message === "Current password is incorrect") {
        return ApiResponse.error(res, 400, "Current password is incorrect");
      }

      return ApiResponse.error(res, 500, "Failed to change password");
    }
  },

  verifyRegistration: async (req, res) => {
    const client = await pool.connect();
    try {
      const { email, code } = req.body;

      // Basic validation
      if (!email) {
        return res.status(400).json({
          status: 400,
          message: "Email là bắt buộc",
        });
      }

      if (!code) {
        return res.status(400).json({
          status: 400,
          message: "Mã xác nhận là bắt buộc",
        });
      }


      console.log(`Verifying registration for ${email} with code ${code}`);

      // Check the column name in verification_codes table
      const tableInfoQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'verification_codes'
    `;
      const tableInfo = await client.query(tableInfoQuery);
      console.log(
        "Verification_codes columns:",
        tableInfo.rows.map((row) => row.column_name)
      );

      const hasExpirationTime = tableInfo.rows.some(
        (row) => row.column_name === "expiration_time"
      );
      const hasExpiresAt = tableInfo.rows.some(
        (row) => row.column_name === "expires_at"
      );

      // Use the correct column name based on what's available
      const expirationColumnName = hasExpirationTime
        ? "expiration_time"
        : hasExpiresAt
        ? "expires_at"
        : "expiration_time";

      console.log(
        `Using column name: ${expirationColumnName} for expiration check`
      );

      // Get the verification record using the correct column name
      const verificationResult = await client.query(
        `SELECT * FROM verification_codes
       WHERE email = $1 AND code = $2 AND ${expirationColumnName} > NOW()`,
        [email, code]
      );

      // Kiểm tra kết quả query cho debugging
      console.log("Verification result:", {
        found: verificationResult.rows.length > 0,
        email: email,
        code: code,
        currentTime: new Date(),
      });

      // Check if verification code exists and is valid
      if (verificationResult.rows.length === 0) {
        return res.status(400).json({
          status: 400,
          message: "Mã xác nhận không chính xác hoặc đã hết hạn",
        });
      }

      // Parse user data from verification record
      let userData;
      try {
        const userDataRaw = verificationResult.rows[0].user_data;

        // Handle different data types based on how PostgreSQL returns JSONB
        if (typeof userDataRaw === "string") {
          userData = JSON.parse(userDataRaw);
        } else {
          userData = userDataRaw;
        }

        console.log("User data retrieved successfully:", {
          ...userData,
          password: "[PLAIN]",
        });
      } catch (parseError) {
        console.error("Error parsing user data:", parseError);
        return res.status(500).json({
          status: 500,
          message: "Lỗi xử lý dữ liệu đăng ký",
        });
      }

      // Begin transaction for user creation
      await client.query("BEGIN");

      try {
        // Extract user data for registration
        const {
          username,
          email,
          password,
          fullName,
        } = userData;

        // THÊM KIỂM TRA NÀY: Kiểm tra lại xem username/email đã tồn tại chưa
        const checkExistingQuery = `
        SELECT 1 FROM users
        WHERE username = $1 OR email = $2
      `;
        const checkExistingResult = await client.query(checkExistingQuery, [
          username,
          email,
        ]);

        if (checkExistingResult.rows.length > 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            status: 400,
            message: "Email hoặc tên đăng nhập đã được sử dụng trong hệ thống",
          });
        }

        // Use plain password (no hashing)
        const password_hash = password;

        // Insert the new user into database
        const insertUserQuery = `
        INSERT INTO users (
          username, email, password_hash, full_name
        ) VALUES (
          $1, $2, $3, $4
        )
        RETURNING id, username, email, full_name
      `;

        const insertedUser = await client.query(insertUserQuery, [
          username,
          email,
          password_hash,
          fullName,
        ]);

        console.log("User created successfully with ID:", insertedUser.rows[0].id);

        // Delete the verification code after successful registration
        await client.query(`DELETE FROM verification_codes WHERE email = $1`, [
          email,
        ]);

        // Commit transaction
        await client.query("COMMIT");

        // Return success response
        return res.status(201).json({
          status: '200',
          message: "Đăng ký thành công",
          data: {
            id: insertedUser.rows[0].id,
            username: insertedUser.rows[0].username,
            email: insertedUser.rows[0].email,
            fullName: insertedUser.rows[0].full_name,
          },
        });
      } catch (dbError) {
        // Rollback transaction on error
        await client.query("ROLLBACK");
        console.error("Error creating user:", dbError);

        // Specific error messages for common issues
        if (dbError.code === "23505") {
          // Unique violation
          if (dbError.constraint && dbError.constraint.includes("username")) {
            return res.status(400).json({
              status: 400,
              message: "Tên đăng nhập đã tồn tại",
            });
          } else if (dbError.constraint && dbError.constraint.includes("email")) {
            return res.status(400).json({
              status: 400,
              message: "Email đã tồn tại",
            });
          }
        }

        return res.status(500).json({
          status: 500,
          message: "Đăng ký thất bại",
          error: dbError.message,
        });
      }
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Error rolling back transaction:", rollbackError);
      }

      console.error("Lỗi xác nhận đăng ký:", error);
      return res.status(500).json({
        status: 500,
        message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
        error: error.message,
      });
    } finally {
      client.release();
    }
  },
  token: async (req, res) => {
    const { token } = req.body;

    if (!token) return res.sendStatus(401);
    if (!refreshTokens.includes(token)) return res.sendStatus(403);

    jwt.verify(token, process.env.REFRESH_SECRET_KEY, (err, user) => {
      if (err) return res.sendStatus(403);
      const accessToken = generateAccessToken({ username: user.username });
      res.status('200').json({ accessToken });
    });
  },

  // Update the function to include role in token
  generateAccessToken(user) {
    return jwt.sign(
      {
        userId: user.userId,
        username: user.username,
        email: user.email,
        role: user.role || "customer",
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "'200'0h" }
    );
  },

  getReferralInfo: async (req, res) => {
    try {
      const userId = req.user.userId; // Fixed from req.useruserid
      const referralInfo = await UserModel.getReferralInfo(userId);

      res.status('200').json({
        status: '200',
        data: referralInfo,
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: "Không thể lấy thông tin giới thiệu",
        error: error.message,
      });
    }
  },

  // Add an endpoint to update commission rates (admin only)
  updateCommissionRates: async (req, res) => {
    try {
      const { rates } = req.body;

      if (!rates || !Array.isArray(rates)) {
        return res.status(400).json({
          status: 400,
          message: "Cần cung cấp dữ liệu tỷ lệ hoa hồng hợp lệ",
        });
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const rate of rates) {
          if (
            !rate.level ||
            rate.level < 1 ||
            rate.level > 5 ||
            !rate.rate ||
            rate.rate < 0
          ) {
            throw new Error(`Dữ liệu không hợp lệ cho cấp ${rate.level}`);
          }

          await client.query(
            `UPDATE referral_commission_rates
           SET rate = $1, updated_at = NOW()
           WHERE level = $2`,
            [rate.rate, rate.level]
          );
        }

        await client.query("COMMIT");

        res.status('200').json({
          status: '200',
          message: "Cập nhật tỷ lệ hoa hồng thành công",
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error updating commission rates:", error);
      res.status(500).json({
        status: 500,
        message: "Không thể cập nhật tỷ lệ hoa hồng",
        error: error.message,
      });
    }
  },

  // Add endpoint to get detailed network structure
  getReferralNetwork: async (req, res) => {
    try {
      const userId = req.user.userId; // Fixed from req.useruserid
      const { level = 1 } = req.query;

      // Validate level
      const parsedLevel = parseInt(level);
      if (isNaN(parsedLevel) || parsedLevel < 1 || parsedLevel > 5) {
        return res.status(400).json({
          status: 400,
          message: "Cấp độ phải từ 1 đến 5",
        });
      }

      const query = `
      SELECT
        u.user_id,
        u.username,
        u.full_name,
        u.email,
        u.created_at,
        rt.level,
        (SELECT COUNT(*) FROM referral_tree WHERE ancestor_id = u.user_id AND level = 1) as direct_referrals,
        (SELECT COALESCE(SUM(amount), 0) FROM wallet_transactions
         WHERE user_id = $1 AND reference_id = u.user_id AND transaction_type = 'referral_commission') as commission_earned
      FROM referral_tree rt
      JOIN users u ON rt.user_id = u.user_id
      WHERE rt.ancestor_id = $1 AND rt.level = $2
      ORDER BY u.created_at DESC
    `;

      const result = await pool.query(query, [userId, parsedLevel]);

      res.status('200').json({
        status: '200',
        data: {
          level: parsedLevel,
          members: result.rows,
        },
      });
    } catch (error) {
      console.error("Error getting referral network:", error);
      res.status(500).json({
        status: 500,
        message: "Không thể lấy thông tin mạng lưới giới thiệu",
        error: error.message,
      });
    }
  },

  getWalletTransactions: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page, limit } = getPaginationParams(req);

      const result = await UserModel.getWalletTransactions(userId, page, limit);

      res.status('200').json({
        status: '200',
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: "Không thể lấy lịch sử giao dịch",
        error: error.message,
      });
    }
  },

  withdrawFromWallet: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { amount, bankName, accountNumber, accountHolder } = req.body;

      if (
        !amount ||
        amount <= 0 ||
        !bankName ||
        !accountNumber ||
        !accountHolder
      ) {
        return res.status(400).json({
          status: 400,
          message: "Vui lòng nhập đầy đủ thông tin rút tiền",
        });
      }

      const result = await UserModel.withdrawFromWallet(userId, amount, {
        bankName,
        accountNumber,
        accountHolder,
      });

      res.status('200').json({
        status: '200',
        message: result.message,
        data: {
          transactionId: result.transactionId,
          amount: result.amount,
        },
      });
    } catch (error) {
      res.status(400).json({
        status: 400,
        message: error.message,
      });
    }
  },

  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          status: 400,
          message: "Email là bắt buộc",
        });
      }

      // Kiểm tra xem email có tồn tại trong hệ thống không
      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(404).json({
          status: 404,
          message: "Không tìm thấy tài khoản với email này",
        });
      }

      // Tạo mã xác nhận ngẫu nhiên (6 chữ số)
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Tạo dữ liệu lưu vào user_data (cần được lưu vì bảng yêu cầu NOT NULL)
      const userData = {
        type: "password_reset",
        email: email,
      };

      // Xóa mã xác nhận cũ (nếu có)
      await pool.query(`DELETE FROM verification_codes WHERE email = $1`, [
        email,
      ]);

      // Thêm mã xác nhận mới với expiration time 15 phút
      const expirationTime = new Date();
      expirationTime.setMinutes(expirationTime.getMinutes() + 15);

      // Check if verification_codes table exists and has the correct column name
      try {
        const tableInfoQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'verification_codes'
      `;
        const tableInfo = await pool.query(tableInfoQuery);
        console.log(
          "Verification_codes columns:",
          tableInfo.rows.map((row) => row.column_name)
        );

        const hasExpirationTime = tableInfo.rows.some(
          (row) => row.column_name === "expiration_time"
        );
        const hasExpiresAt = tableInfo.rows.some(
          (row) => row.column_name === "expires_at"
        );

        // Use the correct column name based on what's available
        const expirationColumnName = hasExpirationTime
          ? "expiration_time"
          : hasExpiresAt
          ? "expires_at"
          : "expiration_time";

        console.log(
          `Using column name: ${expirationColumnName} for expiration time`
        );

        // Insert the new verification record using the correct column name
        if (hasExpiresAt) {
          // Use the existing table structure with expires_at
          await pool.query(
            `INSERT INTO verification_codes (email, code, expires_at, code_type, verified, attempts, max_attempts, user_data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())`,
            [email, code, expirationTime, 'password_reset', false, 0, 3, JSON.stringify(userData)]
          );
        } else {
          // Use the new table structure with expiration_time
          await pool.query(
            `INSERT INTO verification_codes (email, code, ${expirationColumnName}, user_data, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [email, code, expirationTime, JSON.stringify(userData)]
          );
        }
      } catch (dbError) {
        console.error("Database error during table check:", dbError);
        // If the table doesn't exist or other DB issues, create it
        await pool.query(`
        CREATE TABLE IF NOT EXISTS verification_codes (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          code VARCHAR(10) NOT NULL,
          expiration_time TIMESTAMP NOT NULL,
          user_data JSONB NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

        // Then try the insert again with the new structure
        await pool.query(
          `INSERT INTO verification_codes (email, code, expiration_time, user_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
          [email, code, expirationTime, JSON.stringify(userData)]
        );
      }

      // Gửi email chứa mã xác nhận
      await sendRandomCodeEmail(email, code);

      // Log mã xác nhận (chỉ dùng cho môi trường phát triển)
      console.log(`Verification code for password reset: ${code}`);

      return res.status('200').json({
        status: '200',
        message: "Mã xác nhận đã được gửi đến email của bạn",
      });
    } catch (error) {
      console.error("Lỗi quên mật khẩu:", error);
      return res.status(500).json({
        status: 500,
        message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
      });
    }
  },

    resetPassword: async (req, res) => {
    try {
      console.log('🔍 Reset Password Request (No OTP):', {
        body: req.body,
        email: req.body.email,
        newPassword: req.body.newPassword,
        new_password: req.body.new_password,
        headers: req.headers['content-type']
      });

      // Support both field names for backward compatibility
      const { email, new_password } = req.body;
      const finalPassword = new_password;

      console.log('🔍 Extracted values:', {
        email,
        new_password,
        finalPassword
      });

      if (!email || !finalPassword) {
        console.log('❌ Missing fields check:', {
          emailMissing: !email,
          new_passwordMissing: !new_password,
          finalPasswordMissing: !finalPassword
        });
        return res.status(400).json({
          status: 400,
          message: "Thiếu thông tin cần thiết",
        });
      }

      if (finalPassword.length < 6) {
        return res.status(400).json({
          status: 400,
          message: "Mật khẩu phải có ít nhất 6 ký tự",
        });
      }

      // Kiểm tra email có tồn tại không
      const userCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );

      if (userCheck.rows.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "Email không tồn tại trong hệ thống",
        });
      }

      console.log('✅ Email found in database, proceeding with password update');

      // Use plain password (no hashing)
      const plainPassword = finalPassword;

      // Cập nhật mật khẩu trong cơ sở dữ liệu
      const updateResult = await pool.query(
        `UPDATE users
       SET password_hash = $1, updated_at = NOW()
       WHERE email = $2
       RETURNING id, email`,
        [plainPassword, email]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({
          status: 404,
          message: "Không tìm thấy tài khoản với email này",
        });
      }

      console.log('✅ Password updated successfully for:', email);

      return res.status('200').json({
        status: '200',
        message: "Mật khẩu đã được cập nhật thành công",
      });
    } catch (error) {
      console.error("Lỗi đặt lại mật khẩu:", error);
      return res.status(500).json({
        status: 500,
        message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
      });
    }
  },

  // Verify OTP - Chức năng xác thực OTP tổng quát
  verifyOTP: async (req, res) => {
    try {
      const { email, code, type = 'general' } = req.body;

      // Basic validation
      if (!email) {
        return res.status(400).json({
          status: 400,
          message: "Email là bắt buộc",
        });
      }

      if (!code) {
        return res.status(400).json({
          status: 400,
          message: "Mã OTP là bắt buộc",
        });
      }

      console.log(`Verifying OTP for ${email} with code ${code} and type ${type}`);

      // Check column name compatibility
      const tableInfoQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'verification_codes'
      `;
      const tableInfo = await pool.query(tableInfoQuery);

      const hasExpirationTime = tableInfo.rows.some(
        (row) => row.column_name === "expiration_time"
      );
      const hasExpiresAt = tableInfo.rows.some(
        (row) => row.column_name === "expires_at"
      );

      // Use the correct column name based on what's available
      const expirationColumnName = hasExpirationTime
        ? "expiration_time"
        : hasExpiresAt
        ? "expires_at"
        : "expiration_time";

      console.log(
        `Using column name: ${expirationColumnName} for expiration check`
      );

      // Get the verification record using the correct column name
      const verificationResult = await pool.query(
        `SELECT * FROM verification_codes
         WHERE email = $1 AND code = $2 AND ${expirationColumnName} > NOW()`,
        [email, code]
      );

      console.log("OTP verification result:", {
        found: verificationResult.rows.length > 0,
        email: email,
        code: code,
        type: type,
        currentTime: new Date(),
      });

      // Check if OTP exists and is valid
      if (verificationResult.rows.length === 0) {
        return res.status(400).json({
          status: 400,
          message: "Mã OTP không chính xác hoặc đã hết hạn",
        });
      }

      const verificationData = verificationResult.rows[0];

      // Parse user_data if exists
      let userData = null;
      if (verificationData.user_data) {
        try {
          if (typeof verificationData.user_data === "string") {
            userData = JSON.parse(verificationData.user_data);
          } else {
            userData = verificationData.user_data;
          }
        } catch (parseError) {
          console.error("Error parsing user_data:", parseError);
        }
      }

      // Determine verification type from data
      let verificationType = type;
      if (userData && userData.type) {
        verificationType = userData.type;
      } else if (verificationData.code_type) {
        verificationType = verificationData.code_type;
      }

      console.log(`OTP verification successful for type: ${verificationType}`);

      // Return success response with verification info
      const response = {
        status: '200',
        message: "Mã OTP đã được xác thực thành công",
        data: {
          email: email,
          type: verificationType,
          verified: true,
          verifiedAt: new Date(),
        }
      };

      // Add user data if available (but not for password reset for security)
      if (userData && verificationType !== 'password_reset') {
        response.data.userData = {
          ...userData,
          password: "[HIDDEN]" // Hide password in response
        };
      }

      return res.status(200).json(response);

    } catch (error) {
      console.error("OTP verification error:", error);
      return res.status(500).json({
        status: 500,
        message: "Đã xảy ra lỗi trong quá trình xác thực OTP",
        error: error.message,
      });
    }
  },

  getReferralShareContent: async (req, res) => {
    try {
      const userId = req.user.userId;
      const appUrl = process.env.APP_URL || "https://yourapp.com";

      // Get user's referral code
      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          status: 404,
          message: "Người dùng không tồn tại",
        });
      }

      // Generate sharing content
      const referralCode = user.referralcode;
      const referralLink = `${appUrl}/register?ref=${referralCode}`;

      const sharingContent = {
        referralCode,
        referralLink,
        whatsappMessage: `Đăng ký ngay tại ${referralLink} để nhận ưu đãi đặt món ăn! Nhập mã ${referralCode} khi đăng ký.`,
        smsMessage: `Dùng mã ${referralCode} để nhận ưu đãi khi đăng ký tại nhà hàng chúng tôi!`,
        emailSubject: "Lời mời đăng ký từ nhà hàng ABC",
        emailBody: `Xin chào,\n\nTôi xin mời bạn đăng ký tài khoản tại nhà hàng ABC. Sử dụng mã giới thiệu ${referralCode} để nhận ưu đãi đặc biệt.\n\nĐăng ký tại: ${referralLink}\n\nCảm ơn bạn!`,
      };

      res.status('200').json({
        status: '200',
        data: sharingContent,
      });
    } catch (error) {
      console.error("Lỗi lấy nội dung chia sẻ:", error);
      res.status(500).json({
        status: 500,
        message: "Không thể tạo nội dung chia sẻ",
        error: error.message,
      });
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const userId = req.user.userId;

      const user = await UserModel.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          status: 500,
          message: "Không tìm thấy thông tin người dùng",
        });
      }

      // Remove sensitive information
      const { Password, ...userProfile } = user;

      // Đảm bảo address được bao gồm trong response
      res.status('200').json({
        status: '200',
        data: [userProfile], // address đã được bao gồm trong userProfile
      });
    } catch (error) {
      console.error("Lỗi lấy thông tin người dùng:", error);
      res.status(500).json({
        status: 500,
        message: "Không thể lấy thông tin người dùng",
        error: error.message,
      });
    }
  },

  updateUserProfile: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { fullName, phoneNumber, address, avatar_id } = req.body;

      const updatedUserData = await UserModel.updateUser(userId, {
        fullName,
        phoneNumber,
        address,
        avatar_id,
      });

      if (!updatedUserData) {
        return res.status(400).json({
          status: 400,
          message: "Không có thông tin nào được cập nhật",
        });
      }

      res.status('200').json({
        status: '200',
        message: "Cập nhật thông tin thành công",
        data: updatedUserData,
      });
    } catch (error) {
      console.error("Lỗi cập nhật thông tin người dùng:", error);
      res.status(500).json({
        status: 500,
        message: "Không thể cập nhật thông tin người dùng",
        error: error.message,
      });
    }
  },

  uploadAvatar: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 400,
          message: "Không có file được upload",
        });
      }

      // Đối với storage là diskStorage
      const filePath = req.file.path;

      // Upload lên Cloudinary
      const cloudinaryResult = await cloudinary.uploader.upload(filePath, {
        folder: "food_api/avatars",
        transformation: [{ width: 500, height: 500, crop: "limit" }],
      });

      // Xóa file tạm sau khi upload
      fs.unlinkSync(filePath);

      // Cập nhật avatar của người dùng trong database
      const updatedUser = await UserModel.updateUser(req.user.userId, {
        avatar: cloudinaryResult.secure_url,
      });

      if (!updatedUser) {
        return res.status(400).json({
          status: 500,
          message: "Không thể cập nhật avatar",
        });
      }

      return res.status('200').json({
        status: '200',
        message: "Upload avatar thành công",
        data: {
          avatar: cloudinaryResult.secure_url,
          user: updatedUser,
        },
      });
    } catch (error) {
      console.error("Lỗi upload avatar:", error);

      // Xóa file tạm nếu có lỗi xảy ra
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Không thể xóa file tạm:", err);
        });
      }

      res.status(500).json({
        status: 500,
        message: "Lỗi khi upload avatar",
        error: error.message,
      });
    }
  },

  // Lấy danh sách avatar mẫu từ DB
  getAvatars: async (req, res) => {
    try {
      const avatars = await getAvatarListFromDb();
      return res.status('200').json({
        status: 200,
        data: avatars
      });
    } catch (error) {
      return res.status(500).json({
        status: 500,
        message: "Không thể lấy danh sách avatar",
        error: error.message
      });
    }
  },
};

module.exports = userController;
