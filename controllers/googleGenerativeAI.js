const { GoogleGenerativeAI } = require("@google/generative-ai");
const OpenAI = require("openai");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
const { uploadImage } = require("../utils/uploadImage");
const SpeakingModel = require("../models/speaking_model");

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
const modelPreventive = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

// Service function để xử lý lưu kết quả speaking
async function saveSpeakingResult(userId, resultData) {
  try {
    const {
      accuracy_level,
      overall_score,
      reference_ipa,
      reference_text,
      spoken_ipa,
      spoken_text,
      word_analysis
    } = resultData;

    // Generate session ID
    const sessionId = `speaking_${Date.now()}_${userId}`;

    const totalWords = word_analysis ? word_analysis.length : 0;
    const correctWords = word_analysis ?
      word_analysis.filter(w => w.status === 'correct').length : 0;

    // Lưu kết quả chính
    const speakingResult = await SpeakingModel.saveSpeakingResult({
      userId,
      sessionId,
      referenceText: reference_text,
      referenceIpa: reference_ipa,
      spokenText: spoken_text,
      spokenIpa: spoken_ipa,
      overallScore: overall_score,
      accuracyLevel: accuracy_level,
      totalWords,
      correctWords
    });

    // Lưu phân tích từng từ
    if (word_analysis && word_analysis.length > 0) {
      await SpeakingModel.saveWordAnalysis(speakingResult.id, word_analysis);
    }

    // Cập nhật thống kê user (bao gồm streak và points)
    const updateResult = await SpeakingModel.updateUserSpeakingStats(userId, overall_score || 0);

    return {
      success: true,
      speakingResultId: speakingResult.id,
      sessionId,
      pointsEarned: updateResult.pointsEarned,
      currentStreak: updateResult.streak
    };
  } catch (error) {
    console.error('Error saving speaking result:', error);
    throw error;
  }
}

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
    return { status: '200', suggestions };
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

    const defaultPrompt = `You are a visual recognition expert.

Your task is to detect **only clearly visible, distinct physical objects** in the image.

Output a valid JSON array, with no extra text or formatting. For each object, return:

- \`name\`: the object's name in clear, simple English (e.g., "vase", "flower", "chair")
- \`score\`: a float confidence score from 0.0 to 1.0
- \`boundingPoly\`: an object with 4 \`vertices\`, each containing \`x\` and \`y\` coordinates (as percentages between 0.0 and 1.0) relative to image width and height

IMPORTANT:
- Return **only objects you are highly confident about (score ≥ 0.85)**
- Do not include background textures, shadows, or ambiguous items
- Each \`boundingPoly.vertices\` must contain 4 points in clockwise order starting from the top-left
- Do not return any object if any x or y coordinate is exactly 1.0

Here is the required format (return your full result in this exact format):
[
  {
    "name": "object name",
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

`;

    // Handling file upload
    if (req.file) {
      prompt = req.body.prompt || defaultPrompt;
      imageData = fs.readFileSync(req.file.path);

      // Upload ảnh lên cloud storage để lấy URL
      try {
        uploadedImageUrl = await uploadImage(req.file.path);
        console.log("Uploaded image URL:", uploadedImageUrl);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        // Vẫn tiếp tục xử lý ngay cả khi upload thất bại
      }
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

        return res.status('200').json({
          message: "Xử lý thành công",
          data: [],
          rawResponse: generatedText,
          imageUrl: uploadedImageUrl
        });
      }

      // Xóa file tạm sau khi xử lý thành công
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Không thể xóa file tạm:", err);
          else console.log("Đã xóa file tạm:", req.file.path);
        });
      }

      res.status('200').json({
        message: "Xử lý thành công",
        data: parsedData,
        imageUrl: uploadedImageUrl
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
          imageUrl: uploadedImageUrl
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

    // System prompt được cải tiến để đảm bảo câu trả lời ngắn gọn
    const systemPrompt = `You are Person A in an English conversation. STRICT RULES:
- ALWAYS reply with EXACTLY ONE sentence (maximum 8 words)
- NEVER ask questions
- NEVER use punctuation except period
- Stay natural and conversational
- Keep responses extremely brief
- If user goes off-topic, gently redirect with a short response

Examples:
User: "Let's talk about food"
You: "I love Italian pasta."

User: "What's your favorite movie?"
You: "I enjoy action movies."

User: "How are you today?"
You: "I'm doing great today."`;

    let formattedPrompt = "";

    if (conversationHistory.length === 0) {
      // Lần đầu tiên: thiết lập topic và system prompt
      formattedPrompt = `${systemPrompt}

Topic: ${prompt}
Give ONE short sentence response to start conversation about this topic.`;
    } else {
      // Các lần sau: duy trì system prompt + lịch sử + user input mới
      const historyText = conversationHistory
        .map((msg) => {
          if (msg.role === "user") return "User: " + msg.content;
          if (msg.role === "assistant") return "You: " + msg.content;
          return msg.content;
        })
        .slice(-6) // Chỉ giữ 6 message gần nhất để tránh context quá dài
        .join("\n");

      formattedPrompt = `${systemPrompt}

Recent conversation:
${historyText}

User: ${prompt}

Remember: Reply with EXACTLY ONE short sentence (max 8 words). No questions.`;
    }
    console.log("Formatted prompt:", formattedPrompt);

    try {
      const result = await model.generateContent(formattedPrompt);
      let answer = result.response.text();

      // Làm sạch response
      answer = answer
        .replace(/\n/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Cắt ngắn nếu quá dài (backup safety)
      const sentences = answer.split(/[.!?]+/);
      if (sentences.length > 1) {
        answer = sentences[0].trim() + ".";
      }

      // Giới hạn độ dài tối đa
      const words = answer.split(" ");
      if (words.length > 10) {
        answer = words.slice(0, 10).join(" ") + ".";
      }

      // Lưu lại câu trả lời vào lịch sử
      conversationHistory.push({ role: "user", content: prompt });
      conversationHistory.push({ role: "assistant", content: answer });

      // Giới hạn lịch sử conversation (chỉ giữ 20 message gần nhất)
      if (conversationHistory.length > 20) {
        conversationHistory = conversationHistory.slice(-20);
      }

      res.status('200').json({
        data: answer,
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
      "https://zilongapi.loca.lt/transcribe",
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
    res.status('200').json({
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

    // Extract optional parameters for database saving
    const userId = req.body.user_id ? parseInt(req.body.user_id) : null;

    // Thêm log để debug
    console.log("File path:", req.file.path);
    console.log("File exists:", fs.existsSync(req.file.path));
    console.log("File size:", fs.statSync(req.file.path).size);
    console.log("Reference text:", req.body.reference_text);
    console.log("User ID:", userId);

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
      "http://127.0.0.1:5000/compare-pronunciation",
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

    const responseData = flaskRes.data;

    // Save to database if user_id is provided
    let dbResult = null;
    if (userId) {
      try {
        dbResult = await saveSpeakingResult(userId, responseData);
        console.log("Speaking result saved to database:", dbResult);
      } catch (dbError) {
        console.error("Error saving to database:", dbError);
        // Continue with response even if database save fails
      }
    }

    // Trả kết quả về client
    res.status('200').json({
      data: responseData,
      message: "So sánh phát âm thành công.",
      saved: dbResult ? true : false,
      sessionId: dbResult?.sessionId
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

// API endpoints để lấy lịch sử và thống kê
async function getSpeakingHistory(req, res) {
  try {
    const userId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;

    const result = await SpeakingModel.getSpeakingHistory(userId, page, limit);

    res.status('200').json({
      message: "Lấy lịch sử speaking thành công",
      ...result
    });
  } catch (error) {
    console.error("Lỗi khi lấy lịch sử speaking:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi lấy lịch sử speaking",
      error: error.message
    });
  }
}

async function getSpeakingStats(req, res) {
  try {
    const userId = req.params.userId;
    const stats = await SpeakingModel.getSpeakingStats(userId);

    if (!stats) {
      return res.status(404).json({
        message: "Không tìm thấy thống kê cho người dùng này"
      });
    }

    res.status('200').json({
      message: "Lấy thống kê speaking thành công",
      data: stats
    });
  } catch (error) {
    console.error("Lỗi khi lấy thống kê speaking:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi lấy thống kê speaking",
      error: error.message
    });
  }
}

async function getVocabularyInfo(req, res) {
  try {
    const { word } = req.body;

    if (!word) {
      return res.status(400).json({
        error: "Vui lòng cung cấp từ vựng cần tra cứu."
      });
    }

    const vocabularyPrompt = `You are an English vocabulary expert. For the word "${word}", provide information in this EXACT JSON format:

{
  "word": "${word}",
  "pronunciations": [
    {
      "ipa": "/IPA transcription/",
      "audio": ""
    }
  ],
  "meanings": [
    {
      "partOfSpeech": "noun/verb/adjective/etc",
      "vietnamese": "Vietnamese translation",
      "definition": "English definition",
      "examples": [
        {
          "english": "Example sentence in English using the word.",
          "vietnamese": "Vietnamese translation of the example sentence."
        }
      ]
    },
    {
      "partOfSpeech": "noun/verb/adjective/etc",
      "vietnamese": "Another Vietnamese meaning if applicable",
      "definition": "Another English definition",
      "examples": [
        {
          "english": "Another example sentence in English using the word.",
          "vietnamese": "Vietnamese translation of the second example sentence."
        }
      ]
    }
  ]
}

IMPORTANT RULES:
- Return ONLY valid JSON, no extra text
- Provide 2 different meanings if the word has multiple meanings
- If the word has only one common meaning, provide 2 different examples for that meaning
- Each example sentence should be natural and practical
- Always include accurate IPA pronunciation
- Use clear, simple Vietnamese translations
- Make example sentences relevant to daily life or common contexts
- Include part of speech for each meaning`;

    let result;
    try {
      result = await model.generateContent(vocabularyPrompt);
    } catch (error) {
      console.log("Switching to preventive model due to error:", error.message);
      result = await modelPreventive.generateContent(vocabularyPrompt);
    }

    let vocabularyInfo = result.response.text().trim();

    // Clean the response from AI
    vocabularyInfo = vocabularyInfo
      .replace(/```json\s*/g, "")
      .replace(/```\s*/g, "")
      .replace(/^[^{]*/, "") // Remove text before first {
      .replace(/[^}]*$/, "") // Remove text after last }
      .trim();

    let parsedData;
    try {
      parsedData = JSON.parse(vocabularyInfo);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      console.error("Failed to parse:", vocabularyInfo);

      // Fallback: return a basic structure if parsing fails
      return res.status('200').json({
        message: "Tra cứu từ vựng thành công",
        data: {
          word: word,
          pronunciations: [{ ipa: "", audio: "" }],
          meanings: [{
            partOfSpeech: "",
            vietnamese: "",
            definition: "",
            examples: [{ english: "", vietnamese: "" }]
          }]
        },
        rawResponse: vocabularyInfo
      });
    }

    res.status('200').json({
      message: "Tra cứu từ vựng thành công",
      word: word,
      data: parsedData
    });

  } catch (error) {
    console.error("Lỗi khi tra cứu từ vựng:", error);
    res.status(500).json({
      message: "Có lỗi xảy ra khi tra cứu từ vựng, vui lòng thử lại sau.",
      error: error.message
    });
  }
}

module.exports = {
  promptAnswer,
  speechToText,
  handleNewMessage,
  handleImageAndPrompt,
  comparePronunciation,
  getVocabularyInfo,
  getSpeakingHistory,
  getSpeakingStats,
};
