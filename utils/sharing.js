/**
 * Generates sharing links and messages for referrals
 * @param {string} referralCode - The user's referral code
 * @param {string} appUrl - The base URL of the application
 * @returns {Object} Object containing various sharing options
 */
function generateSharingContent(referralCode, appUrl = "https://yourapp.com") {
  const referralLink = `${appUrl}/register?ref=${referralCode}`;

  return {
    referralLink,
    whatsappMessage: `Đăng ký ngay tại ${referralLink} để nhận ưu đãi đặt món ăn! Nhập mã ${referralCode} khi đăng ký.`,
    smsMessage: `Dùng mã ${referralCode} để nhận ưu đãi khi đăng ký tại nhà hàng chúng tôi!`,
    emailSubject: "Lời mời đăng ký từ nhà hàng ABC",
    emailBody: `Xin chào,\n\nTôi xin mời bạn đăng ký tài khoản tại nhà hàng ABC. Sử dụng mã giới thiệu ${referralCode} để nhận ưu đãi đặc biệt.\n\nĐăng ký tại: ${referralLink}\n\nCảm ơn bạn!`,
  };
}

module.exports = { generateSharingContent };

exports.getReferralShareContent = async (req, res) => {
  try {
    const userId = req.useruserid;
    const appUrl = process.env.APP_URL || "https://yourapp.com";

    // Get user's referral code
    const userResult = await UserModel.getUserById(userId);

    if (!userResult) {
      return res.status(404).json({
        status: 500,
        message: "Người dùng không tồn tại",
      });
    }

    // Generate sharing content
    const sharingContent = generateSharingContent(
      userResult.referralCode,
      appUrl
    );

    res.status('200').json({
      status: '200',
      data: sharingContent,
    });
  } catch (error) {
    res.status(500).json({
      status: 500,
      message: "Không thể tạo nội dung chia sẻ",
      error: error.message,
    });
  }
};

// Add route
router.get("/referrals/share", userController.getReferralShareContent);
