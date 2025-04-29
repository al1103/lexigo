const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const modelPreventive = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

async function handleNewMessage(prompt) {
  try {
    const suggestionsPrompt = `Dựa trên cuộc trò chuyện ${JSON.stringify(
      prompt,
    )} , hãy đưa ra 4 câu trả lời tiếp theo có thể để tiếp tục cuộc trò chuyện. Mỗi câu trả lời cần phù hợp với ngữ cảnh và giữ cuộc trò chuyện tiếp tục tự nhiên. Chỉ trả về 4 câu nói, mỗi câu trên một dòng, không có thêm bất kỳ văn bản nào khác. Không đánh số thứ tự cho các câu trả lời.`;
    let suggestionsResult;
    try {
      suggestionsResult = await model.generateContent(suggestionsPrompt);
    } catch (error) {
      suggestionsResult = await modelPreventive.generateContent(
        suggestionsPrompt,
      );
    }
    const suggestions = suggestionsResult.response
      .text()
      .split("\n")
      .filter((s) => s.trim() !== "");
    return { statusCode: 200, suggestions };
  } catch (error) {
    console.error("Lỗi khi xử lý tin nhắn mới:", error);
    return { statusCode: 500, message: "Có lỗi xảy ra, vui lòng thử lại sau." };
  }
}

async function handleImageAndPrompt(req, res) {
  try {
    const { image, prompt } = req.body;

    if (!image || !prompt) {
      return res.status(400).json({ error: "Thiếu ảnh hoặc prompt" });
    }

    const imageData = Buffer.from(image.split(",")[1], "base64");

    const imagePart = {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    try {
      console.log("Bắt đầu gọi API...");
      const result = await model.generateContent([prompt, imagePart]);
      console.log("Kết quả API:", result);

      const generatedText = result.response.text();

      res.status(200).json({
        message: "Xử lý thành công",
        generatedText,
      });
    } catch (apiError) {
      console.error("Lỗi API:", apiError);
      if (apiError.message.includes("Unable to process input image")) {
        return res.status(400).json({
          error:
            "Không thể xử lý ảnh đầu vào. Vui lòng thử lại với một ảnh khác.",
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error("Lỗi khi xử lý ảnh và prompt:", error);
    res
      .statusCode(500)
      .json({ message: "Có lỗi xảy ra, vui lòng thử lại sau." });
  }
}
async function promptAnswer(req, res) {
  try {
    const prompt = req.body.prompt;

    if (!prompt) {
      return res.status(400).json({ error: "Bạn chưa nhập câu hỏi." });
    }

    let result;
    try {
      const openaiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      });
      result = {
        response: { text: () => openaiResponse.choices[0].message.content },
      };
    } catch (error) {
      console.error("Lỗi khi gọi API OpenAI:", error);
      if (error.statusCode === 429) {
        return res.status(429).json({
          error:
            "Bạn đã vượt quá hạn mức hiện tại, vui lòng kiểm tra chi tiết kế hoạch và hóa đơn của bạn.",
        });
      }
      throw error;
    }

    let answer = result.response.text();

    answer = answer.replace(/\n\n/g, "\n");
    answer = answer.replace(/^##\s/gm, "### ");
    answer = answer.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    answer = answer.replace(/\*(.*?)\*/g, "<em>$1</em>");
    answer = answer.replace(/```(.*?)```/g, "<code>$1</code>");

    res.status(200).json({
      answer,
      message: "Câu trả lời được tạo thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi sinh câu trả lời:", error);
    res
      .statusCode(500)
      .json({ message: "Có lỗi xảy ra, vui lòng thử lại sau." });
  }
}
async function speechToText(req, res) {
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Không có file âm thanh nào được tải lên." });
    }

    // Thêm log để debug kích thước file
    console.log("File path:", req.file.path);
    console.log("File exists:", fs.existsSync(req.file.path));
    console.log("File size:", fs.statSync(req.file.path).size);

    // Chuẩn bị form-data để gửi sang Flask server
    const form = new FormData();
    const fileStream = fs.createReadStream(req.file.path);

    // Thêm các headers cụ thể cho form-data
    form.append("file", fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: fs.statSync(req.file.path).size,
    });

    // Gửi request POST sang Flask server với headers rõ ràng hơn
    const flaskRes = await axios.post(
      "http://127.0.0.1:5001/transcribe",
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
      },
    );

    // Xóa file tạm sau khi gửi
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Không thể xóa file tạm:", err);
    });

    // Trả kết quả về client
    res.status(200).json({
      text: flaskRes.data,
      message: "Chuyển đổi âm thanh thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi chuyển đổi âm thanh:", error);
    res.status(500).json({
      error: "Có lỗi xảy ra khi chuyển đổi âm thanh.",
      detail: error?.response?.data || error.message,
    });
  }
}

module.exports = {
  promptAnswer,
  speechToText,
  handleNewMessage,
  handleImageAndPrompt,
};
