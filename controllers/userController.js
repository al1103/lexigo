require("dotenv").config();
const jwt = require("jsonwebtoken");
const UserModel = require("../models/user_model");
const { pool } = require("../config/database");
const { sendRandomCodeEmail } = require("../server/server");
const { getPaginationParams } = require("../utils/pagination");
const cloudinary = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Helper function to generate random referral code
function generateReferralCode() {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

exports.register = async (req, res) => {
  try {
    const {
      username,
      email,
      password,
      fullName,
      phoneNumber,
      address,
      referralCode,
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

    // Hash password before storing
    const hashedPassword = password;

    // Store temporary user data
    const userData = {
      username,
      email,
      password: hashedPassword,
      fullName,
      phoneNumber,
      address, // Thêm trường address
      referralCode,
    };

    console.log("Storing registration data for verification:", {
      ...userData,
      password: "[HASHED]",
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

      // Insert the new verification record using the correct column name
      await pool.query(
        `INSERT INTO verification_codes (email, code, ${expirationColumnName}, user_data, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [email, code, expirationTime, JSON.stringify(userData)]
      );
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
      return res.status(500).json({
        status: 500,
        message: "Không thể gửi email xác thực. Vui lòng thử lại sau.",
      });
    }

    return res.status(200).json({
      status: 200,
      message: "Vui lòng kiểm tra email để lấy mã xác nhận",
      data: { email, code },
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({
      status: 500,
      message: "Đã xảy ra lỗi trong quá trình đăng ký",
      error: error.message,
    });
  }
};

exports.verifyRegistration = async (req, res) => {
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
        password: "[HASHED]",
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
        phoneNumber,
        address,
        referralCode,
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

      // Generate UUID for user and referral code
      const userId = uuidv4();
      const userReferralCode = generateReferralCode();

      let referrerId = null;

      // If referral code provided, find the referrer
      if (referralCode) {
        console.log("Looking up referrer with code:", referralCode);
        const referrerResult = await client.query(
          `SELECT user_id FROM users WHERE referral_code = $1`,
          [referralCode]
        );

        if (referrerResult.rows.length > 0) {
          referrerId = referrerResult.rows[0].user_id;
          console.log("Found referrer with ID:", referrerId);
        } else {
          console.log("No referrer found with code:", referralCode);
        }
      }

      // Insert the new user into database
      const insertUserQuery = `
        INSERT INTO users (
          user_id, username, email, password,
          full_name, phone_number, address, referral_code,
          referred_by, role, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        )
        RETURNING user_id, username, email, full_name, address, referral_code
      `;

      const insertedUser = await client.query(insertUserQuery, [
        userId,
        username,
        email,
        password,
        fullName,
        phoneNumber,
        address, // Thêm trường address
        userReferralCode,
        referrerId,
        "customer",
      ]);

      console.log("User created successfully with ID:", userId);

      // If referred by someone, build the referral tree
      if (referrerId) {
        // First, insert direct referral (level 1)
        await client.query(
          `INSERT INTO referral_tree (user_id, ancestor_id, level)
           VALUES ($1, $2, 1)`,
          [userId, referrerId]
        );

        // Then get all ancestors of the referrer up to level 4
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
        const signupBonus = 50000;

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

        // Check if the status column exists in referrals table
        const referralsColumnsResult = await client.query(`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'referrals'
        `);

        const statusColumnName = referralsColumnsResult.rows.some(
          (row) => row.column_name === "status"
        )
          ? "status"
          : "status";

        console.log(
          `Using column name: ${statusColumnName} for referrals status`
        );

        // Record the referral with the correct column name
        await client.query(
          `INSERT INTO referrals (
            referrer_id, referred_id, commission, ${statusColumnName}, level, created_at, updated_at
          ) VALUES (
            $1, $2, $3, 'completed', 1, NOW(), NOW()
          )`,
          [referrerId, userId, signupBonus]
        );

        console.log(
          `Signup bonus of ${signupBonus} given to referrer ${referrerId}`
        );
      }

      // Delete the verification code after successful registration
      await client.query(`DELETE FROM verification_codes WHERE email = $1`, [
        email,
      ]);

      // Commit transaction
      await client.query("COMMIT");

      // Return success response
      return res.status(201).json({
        status: 200,
        message: "Đăng ký thành công",
        data: {
          userId,
          username: insertedUser.rows[0].username,
          email: insertedUser.rows[0].email,
          fullName: insertedUser.rows[0].full_name,
          address: insertedUser.rows[0].address, // Thêm trường address
          referralCode: userReferralCode,
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
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await UserModel.login(email, password);

    if (!user) {
      return res.status(401).json({
        status: 401,
        message: "Thông tin đăng nhập không chính xác",
      });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = jwt.sign(
      { userId: user.userId, username: user.username },
      process.env.REFRESH_SECRET_KEY
    );

    // Save refresh token
    await UserModel.saveRefreshToken(user.userId, refreshToken);

    return res.status(200).json({
      status: 200,
      message: "Đăng nhập thành công",
      accessToken,
      refreshToken,
      user: {
        userId: user.userId,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({
      status: 500,
      message: "Đã xảy ra lỗi trong quá trình đăng nhập",
    });
  }
};

exports.token = async (req, res) => {
  const { token } = req.body;

  if (!token) return res.sendStatus(401);
  if (!refreshTokens.includes(token)) return res.sendStatus(403);

  jwt.verify(token, process.env.REFRESH_SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    const accessToken = generateAccessToken({ username: user.username });
    res.status(200).json({ accessToken });
  });
};

// Update the function to include role in token
function generateAccessToken(user) {
  return jwt.sign(
    {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role || "customer",
    },
    process.env.JWT_SECRET_KEY,
    { expiresIn: "2000h" }
  );
}

exports.getReferralInfo = async (req, res) => {
  try {
    const userId = req.user.userId; // Fixed from req.useruserid
    const referralInfo = await UserModel.getReferralInfo(userId);

    res.status(200).json({
      status: 200,
      data: referralInfo,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Không thể lấy thông tin giới thiệu",
      error: error.message,
    });
  }
};

// Add an endpoint to update commission rates (admin only)
exports.updateCommissionRates = async (req, res) => {
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

      res.status(200).json({
        status: 200,
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
};

// Add endpoint to get detailed network structure
exports.getReferralNetwork = async (req, res) => {
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

    res.status(200).json({
      status: 200,
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
};

exports.getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page, limit } = getPaginationParams(req);

    const result = await UserModel.getWalletTransactions(userId, page, limit);

    res.status(200).json({
      status: 200,
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
};

exports.withdrawFromWallet = async (req, res) => {
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

    res.status(200).json({
      status: 200,
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
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        status: 400,
        message: "Email là bắt buộc",
      });
    }

    // Kiểm tra xem email có tồn tại trong hệ thống không
    const user = await UserModel.getUserByEmail(email);
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

    // Thêm mã xác nhận mới với expiration_time 15 phút
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 15);

    await pool.query(
      `INSERT INTO verification_codes (email, code, expiration_time, user_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [email, code, expirationTime, JSON.stringify(userData)]
    );

    // Gửi email chứa mã xác nhận
    await sendRandomCodeEmail(email, code);

    // Log mã xác nhận (chỉ dùng cho môi trường phát triển)
    console.log(`Verification code for password reset: ${code}`);

    return res.status(200).json({
      status: 200,
      message: "Mã xác nhận đã được gửi đến email của bạn",
    });
  } catch (error) {
    console.error("Lỗi quên mật khẩu:", error);
    return res.status(500).json({
      status: 500,
      message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({
        status: 400,
        message: "Thiếu thông tin cần thiết",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 400,
        message: "Mật khẩu phải có ít nhất 6 ký tự",
      });
    }

    // Kiểm tra mã xác nhận
    const verificationResult = await pool.query(
      `SELECT * FROM verification_codes
       WHERE email = $1 AND code = $2 AND expiration_time > NOW()`,
      [email, code]
    );

    if (verificationResult.rows.length === 0) {
      return res.status(400).json({
        status: 400,
        message: "Mã xác nhận không hợp lệ hoặc đã hết hạn",
      });
    }

    // Hash mật khẩu mới nếu cần
    // const hashedPassword = bcrypt.hashSync(newPassword, 10);
    const hashedPassword = newPassword; // Nếu không cần hash

    // Cập nhật mật khẩu trong cơ sở dữ liệu
    const updateResult = await pool.query(
      `UPDATE users
       SET password = $1, updated_at = NOW()
       WHERE email = $2
       RETURNING user_id, email`,
      [hashedPassword, email]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        status: 404,
        message: "Không tìm thấy tài khoản với email này",
      });
    }

    // Xóa mã xác nhận sau khi sử dụng
    await pool.query(`DELETE FROM verification_codes WHERE email = $1`, [
      email,
    ]);

    return res.status(200).json({
      status: 200,
      message: "Mật khẩu đã được cập nhật thành công",
    });
  } catch (error) {
    console.error("Lỗi đặt lại mật khẩu:", error);
    return res.status(500).json({
      status: 500,
      message: "Đã xảy ra lỗi. Vui lòng thử lại sau.",
    });
  }
};

exports.getReferralShareContent = async (req, res) => {
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

    res.status(200).json({
      status: 200,
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
};

exports.getUserProfile = async (req, res) => {
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
    res.status(200).json({
      status: 200,
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
};

exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fullName, phoneNumber, address, avatar } = req.body;

    const updatedUserData = await UserModel.updateUser(userId, {
      fullName,
      phoneNumber,
      address, // Thêm trường address
      avatar,
    });

    if (!updatedUserData) {
      return res.status(400).json({
        status: 400,
        message: "Không có thông tin nào được cập nhật",
      });
    }

    res.status(200).json({
      status: 200,
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
};

exports.uploadAvatar = async (req, res) => {
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

    return res.status(200).json({
      status: 200,
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
};
