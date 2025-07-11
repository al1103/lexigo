const speakingModel = require('../models/speaking_model');
const ApiResponse = require('../utils/apiResponse');
const UserModel = require('../models/user_model');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const speakingController = {
  // Lấy từ vựng cho speaking
  getWordsForSpeaking: async (req, res) => {
    try {
      const {
        difficulty_level = 'easy',
        category_id,
        limit = 20
      } = req.query;

      const words = await speakingModel.getWordsForSpeaking(
        difficulty_level,
        category_id ? parseInt(category_id) : null,
        parseInt(limit)
      );

      return ApiResponse.success(res, '200', 'Words retrieved successfully', {
        contents: words,
        total: words.length,
        difficulty_level,
        category_id
      });
    } catch (error) {
      console.error('Error getting words for speaking:', error);
      return ApiResponse.error(res, 500, 'Failed to get words for speaking');
    }
  },

  // Lấy danh sách levels cho speaking
  getSpeakingLevels: async (req, res) => {
    try {
      const { include_stats = false } = req.query;
      const userId = req.user?.userId || req.user?.id;

      let levels;

      if (include_stats === 'true' && userId) {
        // Lấy levels với thống kê của user
        levels = await speakingModel.getUserSpeakingLevelStats(userId);
      } else {
        // Chỉ lấy danh sách levels
        levels = await speakingModel.getSpeakingLevels();
      }

      if (levels.length === 0) {
        return ApiResponse.error(res, 404, 'No speaking levels found');
      }

      return ApiResponse.success(res, '200', 'Speaking levels retrieved successfully', {
        contents: levels,
        total_levels: levels.length,
        user_stats_included: include_stats === 'true' && userId ? true : false
      });
    } catch (error) {
      console.error('Error getting speaking levels:', error);
      return ApiResponse.error(res, 500, 'Failed to get speaking levels: ' + error.message);
    }
  },

  // Lấy chi tiết level với words
  getSpeakingLevelDetail: async (req, res) => {
    try {
      const { level_code } = req.params;
      const { limit = 20 } = req.query;

      if (!level_code) {
        return ApiResponse.error(res, 400, 'Level code is required');
      }

      // Kiểm tra level có tồn tại không
      const wordCount = await speakingModel.checkLevelHasWords(level_code);

      if (wordCount === 0) {
        return ApiResponse.error(res, 404, 'No words found for this level');
      }

      // Lấy words cho level này
      const words = await speakingModel.getWordsForSpeaking(level_code, parseInt(limit));

      return ApiResponse.success(res, '200', 'Level details retrieved successfully', {
        level_code: level_code,
        total_words: wordCount,
        contents: words,
        current_batch: words.length
      });
    } catch (error) {
      console.error('Error getting speaking level detail:', error);
      return ApiResponse.error(res, 500, 'Failed to get level details: ' + error.message);
    }
  },

  // Bắt đầu hoặc tiếp tục speaking session
  startSpeakingSession: async (req, res) => {
    try {
      const { level_code, word_count = 10, session_type = 'practice', force_new = false } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 401, 'User authentication required');
      }

      if (!level_code) {
        return ApiResponse.error(res, 400, 'Level code is required');
      }

      console.log('👤 User ID:', userId, 'Level:', level_code, 'Force new:', force_new);

      // Kiểm tra level có words không
      const totalAvailableWords = await speakingModel.checkLevelHasWords(level_code);

      if (totalAvailableWords === 0) {
        return ApiResponse.error(res, 404, 'No words available for this level');
      }

      let session = null;
      let words = [];
      let isResuming = false;
      let currentProgress = 0;

      // Kiểm tra session đang active (nếu không force_new)
      if (!force_new) {
        const activeSession = await speakingModel.getActiveSpeakingSession(userId, level_code);

        if (activeSession) {
          console.log('🔄 Found active speaking session:', activeSession.id);
          console.log('📊 Progress:', activeSession.completed_words, '/', activeSession.total_words);

          session = { id: activeSession.id };
          isResuming = true;
          currentProgress = activeSession.completed_words;

          // Tính số từ còn lại cần thiết
          const targetTotal = activeSession.total_words || word_count;
          const remainingNeeded = targetTotal - activeSession.completed_words;

          if (remainingNeeded > 0) {
            // Lấy từ còn lại
            words = await speakingModel.getRemainingWordsForSpeaking(
              activeSession.id,
              level_code,
              remainingNeeded
            );

            // Nếu session chưa có total_words, cập nhật nó
            if (!activeSession.total_words) {
              const newTotal = activeSession.completed_words + words.length;
              await speakingModel.updateSessionTotalWords(activeSession.id, newTotal);
              console.log('📝 Updated session total words to:', newTotal);
            }
          } else {
            // Session đã hoàn thành
            console.log('✅ Speaking session already completed');
            return ApiResponse.success(res, '200', 'Speaking session already completed', {
              session_id: activeSession.id,
              is_completed: true,
              total_words: activeSession.total_words,
              completed_words: activeSession.completed_words,
              message: 'You have already completed this speaking session. Set force_new=true to start a new session.'
            });
          }
        }
      }

      // Tạo session mới nếu không có active session hoặc force_new
      if (!session) {
        console.log('🆕 Creating new speaking session...');
        session = await speakingModel.createSpeakingSession(userId, session_type, level_code);

        // Lấy từ mới
        const requestedCount = Math.min(word_count, totalAvailableWords);
        words = await speakingModel.getWordsForSpeaking(level_code, requestedCount);

        // Cập nhật total_words cho session mới
        if (words.length > 0) {
          await speakingModel.updateSessionTotalWords(session.id, words.length);
        }
      }

      if (words.length === 0) {
        return ApiResponse.error(res, 404, 'No more words available for this level');
      }

      const responseMessage = isResuming
        ? `Continuing speaking practice from word ${currentProgress + 1}`
        : 'Speaking session started successfully';

      console.log(`✅ Speaking ${isResuming ? 'resumed' : 'started'} with ${words.length} words for level: ${level_code}`);

      return ApiResponse.success(res, '201', responseMessage, {
        session_id: session.id,
        level_code: level_code,
        session_type: session_type,
        is_resuming: isResuming,
        current_progress: currentProgress,
        remaining_words: words.length,
        total_available_words: totalAvailableWords,
        session_info: isResuming ? {
          completed_words: currentProgress,
          progress_message: `Continuing from word ${currentProgress + 1}`
        } : null,
        words: words.map(word => ({
          word_id: word.id,
          word: word.word,
          pronunciation: word.pronunciation,
          meaning: word.meaning,
          definition: word.definition,
          example_sentence: word.example_sentence,
          audio_url: word.audio_url,
          image_url: word.image_url
        }))
      });
    } catch (error) {
      console.error('Error starting speaking session:', error);
      return ApiResponse.error(res, 500, 'Failed to start speaking session: ' + error.message);
    }
  },

  // Submit speaking result - ĐÃ CẬP NHẬT (statistics được xử lý trong speaking_model)
  submitSpeakingResult: async (req, res) => {
    try {
      const { session_id, word_id, spoken_text, overall_score, audio_url, feedback_text } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!userId || !session_id || !word_id) {
        return ApiResponse.error(res, 400, 'Missing required fields');
      }

      const resultData = {
        sessionId: session_id,
        userId: userId,
        wordId: word_id,
        spokenText: spoken_text,
        overallScore: overall_score || 0,
        audioUrl: audio_url,
        feedbackText: feedback_text
      };

      // 🆕 speaking_model.saveSpeakingResult sẽ tự động xử lý:
      // - Update speaking answer stats & XP
      // - Update words mastered (nếu score >= 70)
      // - Update user points
      // - Update streak
      const result = await speakingModel.saveSpeakingResult(resultData);

      const scoreThreshold = 70;
      const isGoodScore = overall_score >= scoreThreshold;

      return ApiResponse.success(res, '201', 'Speaking result saved successfully', {
        result_id: result.id,
        session_id: session_id,
        word_id: word_id,
        overall_score: overall_score,
        points_earned: isGoodScore ? Math.round(overall_score / 10) : 0,
        words_mastered_updated: isGoodScore
      });
    } catch (error) {
      console.error('Error submitting speaking result:', error);
      return ApiResponse.error(res, 500, 'Failed to submit speaking result: ' + error.message);
    }
  },

  // Hoàn thành speaking session - ĐÃ CẬP NHẬT (statistics được xử lý trong speaking_model)
  completeSpeakingSession: async (req, res) => {
    try {
      const { session_id } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!session_id) {
        return ApiResponse.error(res, 400, 'Session ID is required');
      }

      // 🆕 speaking_model.completeSpeakingSession sẽ tự động xử lý:
      // - Update speaking completion count
      // - Calculate và add bonus points
      // - Update legacy speaking statistics
      const result = await speakingModel.completeSpeakingSession(session_id);

      // Tính bonus points để hiển thị trong response
      const averageScore = result.average_score;
      let bonusPoints = 0;

      if (averageScore >= 85) {
        bonusPoints = 50; // Excellent bonus
      } else if (averageScore >= 70) {
        bonusPoints = 30; // Good bonus
      } else if (averageScore >= 55) {
        bonusPoints = 15; // Fair bonus
      }

      return ApiResponse.success(res, '200', 'Speaking session completed successfully', {
        session_id: result.id,
        total_words: result.total_words,
        total_score: result.total_score,
        average_score: result.average_score,
        session_duration: result.session_duration,
        completed_at: result.completed_at,
        performance: {
          accuracy_percentage: result.average_score ? Math.round(result.average_score) : 0,
          bonus_points: bonusPoints
        }
      });
    } catch (error) {
      console.error('Error completing speaking session:', error);
      return ApiResponse.error(res, 500, 'Failed to complete speaking session');
    }
  },

  // Lấy lịch sử speaking
  getSpeakingHistory: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 401, 'User authentication required');
      }

      const result = await speakingModel.getSpeakingHistory(userId, parseInt(page), parseInt(limit));

      return ApiResponse.success(res, '200', 'Speaking history retrieved successfully', result);
    } catch (error) {
      console.error('Error getting speaking history:', error);
      return ApiResponse.error(res, 500, 'Failed to get speaking history');
    }
  },

  // Lấy thống kê speaking
  getSpeakingStats: async (req, res) => {
    try {
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 401, 'User authentication required');
      }

      const stats = await speakingModel.getSpeakingStats(userId);

      if (!stats) {
        return ApiResponse.error(res, 404, 'Speaking statistics not found');
      }

      return ApiResponse.success(res, '200', 'Speaking statistics retrieved successfully', stats);
    } catch (error) {
      console.error('Error getting speaking stats:', error);
      return ApiResponse.error(res, 500, 'Failed to get speaking statistics');
    }
  },

  // So sánh phát âm với API transcribe
  comparePronunciation: async (req, res) => {
    try {
      const { word_id, reference_text } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 401, 'User authentication required');
      }

      if (!word_id || !reference_text) {
        return ApiResponse.error(res, 400, 'Word ID and reference text are required');
      }

      if (!req.file) {
        return ApiResponse.error(res, 400, 'Audio file is required');
      }

      console.log(`🎤 Comparing pronunciation for user ${userId}, word: "${reference_text}"`);

      try {
        // Tạo FormData để gửi audio file đến API transcribe
        const formData = new FormData();
        formData.append('audio', fs.createReadStream(req.file.path), {
          filename: req.file.filename,
          contentType: req.file.mimetype
        });
        formData.append('reference_text', reference_text);

        // Call API transcribe
        const transcribeResponse = await axios.post('http://192.168.31.225:5000/transcribe', formData, {
          headers: {
            ...formData.getHeaders(),
            'Content-Type': 'multipart/form-data'
          },
          timeout: 30000 // 30 seconds timeout
        });

        console.log('📊 Transcribe API response:', transcribeResponse.data);

        // Xóa file tạm sau khi sử dụng
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        // Parse kết quả từ API
        const apiResult = transcribeResponse.data;

        // Chuẩn hóa response format
        const result = {
          reference_text: reference_text,
          transcribed_text: apiResult.transcribed_text || apiResult.text || '',
          overall_score: apiResult.overall_score || apiResult.score || 0,
          pronunciation_score: apiResult.pronunciation_score || apiResult.overall_score || 0,
          accuracy_score: apiResult.accuracy_score || apiResult.overall_score || 0,
          fluency_score: apiResult.fluency_score || apiResult.overall_score || 0,
          confidence_score: apiResult.confidence_score || 100,
          feedback: apiResult.feedback || apiResult.message || 'Pronunciation analysis completed',
          word_analysis: apiResult.word_analysis || [],
          similarity_score: apiResult.similarity_score || apiResult.overall_score || 0
        };

        // Tính điểm tổng thể (0-100)
        const finalScore = Math.round(result.overall_score);

        // Tạo feedback chi tiết
        let detailedFeedback = result.feedback;
        if (finalScore >= 90) {
          detailedFeedback = 'Excellent pronunciation! Your speech is very clear and accurate.';
        } else if (finalScore >= 80) {
          detailedFeedback = 'Great pronunciation! Minor improvements can be made.';
        } else if (finalScore >= 70) {
          detailedFeedback = 'Good pronunciation! Keep practicing to improve clarity.';
        } else if (finalScore >= 60) {
          detailedFeedback = 'Fair pronunciation. Focus on clearer articulation.';
        } else {
          detailedFeedback = 'Needs improvement. Practice speaking more slowly and clearly.';
        }

        console.log(`✅ Pronunciation analysis completed. Score: ${finalScore}/100`);

        return ApiResponse.success(res, '200', 'Pronunciation comparison completed', {
          word_id: word_id,
          reference_text: result.reference_text,
          transcribed_text: result.transcribed_text,
          scores: {
            overall: finalScore,
            pronunciation: Math.round(result.pronunciation_score),
            accuracy: Math.round(result.accuracy_score),
            fluency: Math.round(result.fluency_score),
            confidence: Math.round(result.confidence_score),
            similarity: Math.round(result.similarity_score)
          },
          feedback: {
            summary: detailedFeedback,
            detailed: result.feedback,
            word_analysis: result.word_analysis
          },
          match_quality: finalScore >= 70 ? 'good' : finalScore >= 50 ? 'fair' : 'needs_improvement'
        });

      } catch (apiError) {
        console.error('❌ Error calling transcribe API:', apiError.message);

        // Xóa file tạm nếu có lỗi
        if (req.file && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }

        // Kiểm tra loại lỗi
        if (apiError.code === 'ECONNREFUSED') {
          return ApiResponse.error(res, 503, 'Transcribe service is unavailable. Please try again later.');
        } else if (apiError.code === 'ETIMEDOUT') {
          return ApiResponse.error(res, 408, 'Request timeout. Please try with a shorter audio file.');
        } else {
          return ApiResponse.error(res, 500, 'Failed to process pronunciation analysis: ' + apiError.message);
        }
      }

    } catch (error) {
      console.error('Error in comparePronunciation:', error);

      // Cleanup file nếu có lỗi
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      return ApiResponse.error(res, 500, 'Failed to compare pronunciation: ' + error.message);
    }
  },

  // ADMIN: Lấy tất cả speaking sessions
  getAllSpeakingSessions: async (req, res) => {
    try {
      const sessions = await speakingModel.getAllSpeakingSessions();
      return ApiResponse.success(res, '200', 'Lấy tất cả speaking sessions thành công', sessions);
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể lấy speaking sessions', error.message);
    }
  },

  // ADMIN: Xóa speaking session
  deleteSpeakingSession: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await speakingModel.deleteSpeakingSession(id);
      if (deleted) {
        return ApiResponse.success(res, '200', 'Đã xóa speaking session', deleted);
      } else {
        return ApiResponse.error(res, 404, 'Speaking session không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể xóa speaking session', error.message);
    }
  },

  // ADMIN: Thêm từ mới
  createWord: async (req, res) => {
    try {
      const word = await speakingModel.createWord(req.body);
      return ApiResponse.success(res, '200', 'Tạo từ mới thành công', word);
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể tạo từ mới', error.message);
    }
  },

  // ADMIN: Sửa từ
  updateWord: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await speakingModel.updateWord(id, req.body);
      if (updated) {
        return ApiResponse.success(res, '200', 'Cập nhật từ thành công', updated);
      } else {
        return ApiResponse.error(res, 404, 'Từ không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể cập nhật từ', error.message);
    }
  },

  // ADMIN: Xóa từ
  deleteWord: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await speakingModel.deleteWord(id);
      if (deleted) {
        return ApiResponse.success(res, '200', 'Đã xóa từ', deleted);
      } else {
        return ApiResponse.error(res, 404, 'Từ không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể xóa từ', error.message);
    }
  },
};

module.exports = speakingController;
