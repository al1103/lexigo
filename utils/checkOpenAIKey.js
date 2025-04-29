const { OpenAI } = require("openai");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Using environment variable instead of hardcoding
});

async function checkOpenAIKey() {
  try {
    console.log("Kiểm tra API Key OpenAI...");
    const models = await openai.models.list();
    console.log("✅ API Key hợp lệ!");
    console.log(
      "Các model khả dụng:",
      models.data
        .slice(0, 5)
        .map((m) => m.id)
        .join(", "),
      "...",
    );
    return true;
  } catch (error) {
    console.error("❌ API Key lỗi hoặc hết hạn!");
    console.error(error.message);
    return false;
  }
}

// Run the check if this file is executed directly
if (require.main === module) {
  checkOpenAIKey();
}

module.exports = checkOpenAIKey;
