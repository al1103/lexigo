const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { uploadImage } = require("../utils/uploadImage");
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
    return { status: 200, suggestions };
  } catch (error) {
    console.error("Lỗi khi xử lý tin nhắn mới:", error);
    return { status: 500, message: "Có lỗi xảy ra, vui lòng thử lại sau." };
  }
}


async function handleImageAndPrompt(req, res) {
  try {
    console.log("Request file:", req.file);
    console.log("Request body:", req.body);

    let imageData, prompt, uploadedImageUrl = null;

    const defaultPrompt = `Please analyze the image and detect all visible objects.
For each object, return a JSON object with the following structure.

IMPORTANT:
- Your response must be ONLY valid JSON array, no other text, no markdown formatting, no code blocks.
- Coordinates must be in percentage (0.0 to 1.0) relative to image dimensions, NOT absolute pixels.
- For example: if object is at top-left corner, x and y should be around 0.0-0.1
- If object is at bottom-right corner, x and y should be around 0.9-1.0
- Does not return objects where x and y equal 1.0
Return EXACTLY in this format:
[
  {
    "name": "Object name in English",
    "score": 0.95,
    "boundingPoly": {
      "vertices": [
        { "x": 0.1, "y": 0.2 },
        { "x": 0.4, "y": 0.2 },
        { "x": 0.4, "y": 0.6 },
        { "x": 0.1, "y": 0.6 }
      ]
    }
  }
]

Where:
- x: horizontal position as percentage (0.0 = left edge, 1.0 = right edge)
- y: vertical position as percentage (0.0 = top edge, 1.0 = bottom edge)
- score: confidence between 0.0 and 1.0
- vertices: 4 corners of bounding box in clockwise order starting from top-left

Only include objects that are clearly visible. Use simple English names.`;

    // Handling file upload
    if (req.file) {
      prompt = req.body.prompt || defaultPrompt;
      imageData = fs.readFileSync(req.file.path);
    } else {
      return res.status(400).json({
        error: "Thiếu dữ liệu ảnh. Vui lòng gửi file, base64 hoặc URL ảnh."
      });
    }

    if (!imageData) {
      return res.status(400).json({ error: "Không thể xử lý dữ liệu ảnh" });
    }

    const imagePart = {
      inlineData: {
        data: imageData.toString("base64"),
        mimeType: "image/jpeg",
      },
    };

    try {
      console.log("Calling AI API...");
      const result = await model.generateContent([prompt, imagePart]);

      let generatedText = result.response.text().trim();
      console.log("Raw AI response:", generatedText);

      // Làm sạch response từ AI
      generatedText = generatedText
        .replace(/```json\s*/g, "")
        .replace(/```\s*/g, "")
        .replace(/^[^[\{]*/, "") // Remove text before first [ or {
        .replace(/[^}\]]*$/, "") // Remove text after last } or ]
        .trim();

      console.log("Cleaned response:", generatedText);

      // Parse JSON string to object for clean formatting
      let parsedData;
      try {
        parsedData = JSON.parse(generatedText);

        // Validate và normalize coordinates
        if (Array.isArray(parsedData)) {
          parsedData = parsedData.map(obj => {
            if (obj.boundingPoly && obj.boundingPoly.vertices) {
              // Đảm bảo tọa độ trong khoảng 0-1
              obj.boundingPoly.vertices = obj.boundingPoly.vertices.map(vertex => ({
                x: Math.max(0, Math.min(1, parseFloat(vertex.x) || 0)),
                y: Math.max(0, Math.min(1, parseFloat(vertex.y) || 0))
              }));
            }
            // Đảm bảo score trong khoảng 0-1
            if (obj.score) {
              obj.score = Math.max(0, Math.min(1, parseFloat(obj.score) || 0));
            }
            return obj;
          });
        }

      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Failed to parse:", generatedText);

        // Xóa file tạm khi có lỗi parse
        if (req.file && req.file.path) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Không thể xóa file tạm:", err);
          });
        }

        return res.status(200).json({
          message: "Xử lý thành công",
          data: [],
          rawResponse: generatedText,
        });
      }

      // Xóa file tạm sau khi xử lý thành công
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Không thể xóa file tạm:", err);
          else console.log("Đã xóa file tạm:", req.file.path);
        });
      }

      res.status(200).json({
        message: "Xử lý thành công",
        data: parsedData,
      });
    } catch (apiError) {
      console.error("API Error:", apiError);

      // Xóa file tạm khi có lỗi API
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Không thể xóa file tạm:", err);
        });
      }

      if (apiError.message.includes("Unable to process input image")) {
        return res.status(400).json({
          error: "Không thể xử lý ảnh đầu vào. Vui lòng thử lại với ảnh khác.",
          uploadedImageUrl: uploadedImageUrl
        });
      }
      throw apiError;
    }
  } catch (error) {
    console.error("Error processing image and prompt:", error);

    // Xóa file tạm khi có lỗi tổng quát
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Không thể xóa file tạm:", err);
      });
    }

    res.status(500).json({
      message: "Có lỗi xảy ra, vui lòng thử lại sau.",
      error: error.message,
      uploadedImageUrl: uploadedImageUrl || null
    });
  }
}

let conversationHistory = [];

async function promptAnswer(req, res) {
  try {
    const prompt = req.body.prompt;
    const reset = req.body.reset === true;
    if (reset) {
      conversationHistory = [];
      console.log("Đã reset lịch sử hội thoại");
    }

    if (!prompt) {
      return res.status(400).json({ error: "Bạn chưa nhập câu hỏi." });
    }

    // System prompt để đảm bảo câu trả lời ngắn gọn
    const systemPrompt = `You are Person A in an English conversation. Follow these rules:
- Reply with 1-4 short, natural sentences (max 40 words total)
- Always stay on the topic
- Never ask questions or explain
- If the user goes off-topic, gently guide the conversation back
`;

    let formattedPrompt = "";

    if (conversationHistory.length === 0) {
      // Lần đầu tiên: thiết lập topic và system prompt
      formattedPrompt = `${systemPrompt}

Topic: ${prompt}
You are starting a conversation about this topic. Give a short, simple response to begin.`;
    } else {
      // Các lần sau: duy trì system prompt + lịch sử + user input mới
      const historyText = conversationHistory
        .map((msg) => {
          if (msg.role === "user") return "User: " + msg.content;
          if (msg.role === "assistant") return "Assistant: " + msg.content;
          return msg.content;
        })
        .join("\n");

      formattedPrompt = `${systemPrompt}

Conversation history:
${historyText}

User: ${prompt}`;
    }
    console.log("Formatted prompt:", formattedPrompt);

    try {
      const result = await model.generateContent(formattedPrompt);
      let answer = result.response.text();

      answer = answer.replace(/\n/g, "");

      // Lưu lại câu trả lời vào lịch sử
      conversationHistory.push({ role: "user", content: prompt });
      conversationHistory.push({ role: "assistant", content: answer });

      res.status(200).json({
        data: answer ,
        message: "Câu trả lời được tạo thành công.",
      });
    } catch (error) {
      console.error("Lỗi khi sinh câu trả lời:", error);
      res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại sau." });
    }
  } catch (error) {
    console.error("Lỗi khi xử lý request:", error);
    res.status(500).json({ message: "Có lỗi xảy ra, vui lòng thử lại sau." });
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
      "http://192.168.31.225:5001/transcribe",
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
      },
    );

    // Xóa file tạm sau khi gửi
    fs.unlink(req.file.path, (err) => {
      if (err) console.error("Không thể xóa file tạm:", err);
    });b

    // Trả kết quả về client
    res.status(200).json({
      data: flaskRes.data,
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

async function comparePronunciation(req, res) {
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    if (!req.file) {
      return res
        .status(400)
        .json({ error: "Không có file âm thanh nào được tải lên." });
    }

    if (!req.body.reference_text) {
      return res
        .status(400)
        .json({ error: "Thiếu văn bản tham chiếu để so sánh." });
    }

    // Thêm log để debug
    console.log("File path:", req.file.path);
    console.log("File exists:", fs.existsSync(req.file.path));
    console.log("File size:", fs.statSync(req.file.path).size);
    console.log("Reference text:", req.body.reference_text);

    // Chuẩn bị form-data để gửi sang Flask server
    const form = new FormData();
    const fileStream = fs.createReadStream(req.file.path);

    // Thêm file và reference text vào form
    form.append("file", fileStream, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
      knownLength: fs.statSync(req.file.path).size,
    });
    form.append("reference_text", req.body.reference_text);

    // Gửi request POST sang Flask server
    const flaskRes = await axios.post(
      "http://127.0.0.1:5001/compare-pronunciation",
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        timeout: 30000, // 30 second timeout
      },
    );

    // Xóa file tạm sau khi gửi
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Không thể xóa file tạm:", err);
        else console.log("Đã xóa file tạm:", req.file.path);
      });
    }

    // Trả kết quả về client
    res.status(200).json({
      data: flaskRes.data,
      message: "So sánh phát âm thành công.",
    });
  } catch (error) {
    console.error("Lỗi khi so sánh phát âm:", error);

    // Xóa file tạm khi có lỗi
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Không thể xóa file tạm:", err);
      });
    }

    res.status(500).json({
      error: "Có lỗi xảy ra khi so sánh phát âm.",
      detail: error?.response?.data || error.message,
    });
  }
}

module.exports = {
  promptAnswer,
  speechToText,
  handleNewMessage,
  handleImageAndPrompt,
  comparePronunciation,
};
