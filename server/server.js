const { GoogleGenerativeAI } = require("@google/generative-ai");
const nodemailer = require("nodemailer");
require("dotenv").config();

const genAI = new GoogleGenerativeAI(process.env.API_KEY);

async function generateSuggestions(senderId, receiverId) {
  try {
    // Lấy lịch sử cuộc trò chuyện
    const conversation = await Message.getConversation(
      senderId,
      receiverId,
      10
    );

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // Tạo ngữ cảnh cho AI
    const context = conversation
      .map(
        (msg) =>
          `${msg.SenderID === senderId ? "Người gửi" : "Người nhận"}: ${
            msg.Content
          }`
      )
      .join("\n");

    // Tạo gợi ý cho câu trả lời tiếp theo
    const prompt = `Dựa trên cuộc trò chuyện sau:\n\n${context}\n\nHãy đưa ra 3 gợi ý ngắn gọn cho câu trả lời tiếp theo của người nhận.`;

    const result = await model.generateContent(prompt);
    const suggestedResponses = result.response
      .text()
      .split("\n")
      .filter((s) => s.trim() !== "");

    return suggestedResponses;
  } catch (error) {
    console.error("Lỗi khi tạo gợi ý:", error);
    throw error;
  }
}

async function sendRandomCodeEmail(email, code) {
  try {
    // Cấu hình transporter
    const transporter = nodemailer.createTransport({
      secureConnection: false, // TLS requires secureConnection to be false
      tls: {
        ciphers: "SSLv3",
      },
      requireTLS: true, //this parameter solved problem for me
      host: "smtp.ethereal.email", // Sử dụng ethereal để test email
      service: "gmail",
      port: 465,
      secure: true, // true for port 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER, // Đọc từ biến môi trường
        pass: process.env.EMAIL_PASS, // Đọc từ biến môi trường
      },
    });

    // Gửi email
    const info = await transporter.sendMail({
      from: "Zilong", // địa chỉ người gửi
      to: email, // địa chỉ người nhận
      subject: "Mã xác nhận của bạn", // Tiêu đề
      text: `Mã xác nhận của bạn là: ${code}`, // nội dung văn bản thuần túy
      html: `<b>Mã xác nhận của bạn là: ${code}</b>`, // nội dung HTML
    });

    console.log("Tin nhắn đã được gửi: %s", code);
    return code;
  } catch (error) {
    console.error("Lỗi khi gửi email:", error);
    throw error;
  }
}

module.exports = {
  sendRandomCodeEmail,
};

module.exports = {
  generateSuggestions,
  sendRandomCodeEmail,
};
