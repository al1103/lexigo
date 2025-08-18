const quizModel = require('../models/quiz_model');
const LevelModel = require('../models/level_model'); // Thêm import
const ApiResponse = require('../utils/apiResponse');
const UserModel = require('../models/user_model');

const quizController = {
  // Bắt đầu quiz session mới hoặc tiếp tục session đang có
  startQuizSession: async (req, res) => {
    try {
      console.log('🎯 Starting quiz session with body:', req.body);

      const { level_id, question_count = 10, force_new = false } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        console.log('❌ No user ID found');
        return ApiResponse.error(res, 401, 'User authentication required');
      }

      if (!level_id) {
        console.log('❌ No level ID provided');
        return ApiResponse.error(res, 400, 'Level ID is required');
      }

      console.log('👤 User ID:', userId, 'Level ID:', level_id, 'Force new:', force_new);

      // Lấy thông tin level từ database
      const level = await LevelModel.getLevelById(level_id);

      if (!level) {
        console.log('❌ Level not found for ID:', level_id);
        return ApiResponse.error(res, 404, 'Level not found');
      }

      console.log('✅ Level found:', level.level_code, '-', level.level_name);

      // Kiểm tra có questions không cho level này
      const totalAvailableQuestions = await quizModel.checkQuestionsExist(level.level_code);

      if (totalAvailableQuestions === 0) {
        console.log('❌ No questions found for level:', level.level_code);
        return ApiResponse.error(res, 404, `No questions found for ${level.level_name} level`);
      }

      let session = null;
      let questions = [];
      let isResuming = false;
      let currentProgress = 0;

      // Kiểm tra session đang active (nếu không force_new)
      if (!force_new) {
        const activeSession = await quizModel.getActiveSession(userId, level_id);

        if (activeSession) {
          console.log('🔄 Found active session:', activeSession.id);
          console.log('📊 Progress:', activeSession.answered_questions, '/', activeSession.total_questions);

          session = { id: activeSession.id };
          isResuming = true;
          currentProgress = activeSession.answered_questions;

          // Tính số câu hỏi còn lại cần thiết
          const targetTotal = activeSession.total_questions || question_count;
          const remainingNeeded = targetTotal - activeSession.answered_questions;

          if (remainingNeeded > 0) {
            // Lấy câu hỏi còn lại VỚI BOOKMARK STATUS
            questions = await quizModel.getRemainingQuestions(
              activeSession.id,
              level.level_code,
              remainingNeeded,
              userId // Thêm userId parameter
            );

            // Nếu session chưa có total_questions, cập nhật nó
            if (!activeSession.total_questions) {
              const newTotal = activeSession.answered_questions + questions.length;
              await quizModel.updateSessionTotalQuestions(activeSession.id, newTotal);
              console.log('📝 Updated session total questions to:', newTotal);
            }
          } else {
            // Session đã hoàn thành
            console.log('✅ Session already completed');
            return ApiResponse.success(res, '200', 'Quiz session already completed', {
              session_id: activeSession.id,
              is_completed: true,
              total_questions: activeSession.total_questions,
              answered_questions: activeSession.answered_questions,
              message: 'You have already completed this quiz. Set force_new=true to start a new session.'
            });
          }
        }
      }

      // Tạo session mới nếu không có active session hoặc force_new
      if (!session) {
        console.log('🆕 Creating new session...');
        session = await quizModel.createQuizSession(userId, level_id, level.level_code);

        // Lấy câu hỏi mới VỚI BOOKMARK STATUS
        const requestedCount = Math.min(question_count, totalAvailableQuestions);
        questions = await quizModel.getQuestionsByLevel(
          level.level_code,
          requestedCount,
          userId // Thêm userId parameter
        );

        // Cập nhật total_questions cho session mới
        if (questions.length > 0) {
          await quizModel.updateSessionTotalQuestions(session.id, questions.length);
        }
      }

      if (questions.length === 0) {
        return ApiResponse.error(res, 404, 'No more questions available for this level');
      }

      const responseMessage = isResuming
        ? `Continuing quiz from question ${currentProgress + 1}`
        : 'Quiz session started successfully';

      console.log(`✅ Quiz ${isResuming ? 'resumed' : 'started'} with ${questions.length} questions for level: ${level.level_name}`);

      return ApiResponse.success(res, '200', responseMessage, {
        session_id: session.id,
        session_info: {
          is_resuming: isResuming,
          current_progress: currentProgress,
          remaining_questions: questions.length,
          total_available_questions: totalAvailableQuestions
        },
        contents: questions.map(q => ({
          question_id: q.question_id,
          question_text: q.question_text,
          question_type: q.question_type,
          points: q.points,
          word: {
            id: q.word_id,
            word: q.word,
            pronunciation: q.pronunciation,
            meaning: q.meaning,
            definition: q.definition,
            example_sentence: q.example_sentence,
            audio_url: q.audio_url,
            image_url: q.image_url,
            // BOOKMARK INFORMATION (simplified)
            is_bookmarked: q.is_bookmarked,
            bookmark_notes: q.bookmark_notes
            // Loại bỏ bookmarked_at vì không có column này
          },
          options: q.options
        }))
      });
    } catch (error) {
      console.error('❌ Error starting quiz session:', error);
      return ApiResponse.error(res, 500, 'Failed to start quiz session: ' + error.message);
    }
  },

  // Cập nhật getQuizSetupInfo để trả về level_id
  getQuizSetupInfo: async (req, res) => {
    try {
      console.log('🔍 Getting quiz setup information...');

      // Lấy levels từ database với stats
      const levels = await LevelModel.getLevelsWithStats();

      // Chỉ lấy levels có questions
      const availableLevels = levels.filter(level => level.question_count > 0);

      const setupInfo = {
        available_levels: availableLevels.map(level => ({
          id: level.id, // Thêm ID
          level_code: level.level_code,
          name: level.level_name,
          name_vi: level.level_name_vi,
          description: level.description,
          description_vi: level.description_vi,
          total_questions: level.question_count,
          total_words: level.word_count,
          user_count: level.user_count,
          color: level.color,
          icon: level.icon,
          min_score: level.min_score,
          max_score: level.max_score,
          sort_order: level.sort_order
        })),

        question_count_options: [5, 10, 15, 20, 25],

        default_settings: {
          level_id: availableLevels.length > 0 ? availableLevels[0].id : null,
          question_count: 10
        },

        total_levels: availableLevels.length
      };

      return ApiResponse.success(res, '200', 'Quiz setup info retrieved successfully', setupInfo);
    } catch (error) {
      console.error('❌ Error getting quiz setup info:', error);
      return ApiResponse.error(res, 500, 'Failed to get quiz setup info');
    }
  },

  // Submit câu trả lời - CẬP NHẬT để tính điểm
  submitAnswer: async (req, res) => {
    try {
      const { session_id, question_id, selected_option_id, response_time = 0 } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!session_id || !question_id || !selected_option_id) {
        return ApiResponse.error(res, 400, 'Missing required fields');
      }

      const result = await quizModel.submitAnswer(
        session_id,
        question_id,
        selected_option_id,
        response_time
      );

      // NẾU ĐÚNG: Update điểm ngay lập tức cho weekly/monthly tracking
      if (result.is_correct && userId) {
        try {
          // Lấy điểm của câu hỏi
          const points = 10; // Default 10 điểm

          // Update total points và weekly/monthly points với error handling
          try {
            await UserModel.updateUserPoints(userId, points, 'quiz_completion');
            console.log(`✅ Added ${points} points to user ${userId} for correct answer`);
          } catch (pointsError) {
            console.error('Points update error (continuing):', pointsError.message);
            // Tiếp tục thực hiện các tác vụ khác
          }

          // Update words mastered nếu trả lời đúng
          try {
            // Lấy word_id từ question
            const questionInfo = await quizModel.getQuestionInfo(question_id);
            if (questionInfo && questionInfo.word_id) {
              const isNewWord = await UserModel.updateWordsMastered(userId, questionInfo.word_id);
              if (isNewWord) {
                console.log(`📚 User ${userId} mastered new word: ${questionInfo.word_id}`);
              }
            }
          } catch (wordsError) {
            console.error('Words mastered update error (continuing):', wordsError.message);
            // Tiếp tục thực hiện
          }

          // Update user activity để tăng streak (mỗi ngày chỉ tăng 1 lần)
          try {
            console.log(`🔥 Updated activity/streak for user ${userId}`);
          } catch (streakError) {
            if (streakError.code === '42P01') {
              console.log('ℹ️ User stats tables not yet created. Run: node utils/setupUserStats.js');
            } else {
              console.error('Streak update error (continuing):', streakError.message);
            }
            // Tiếp tục thực hiện
          }

        } catch (pointError) {
          console.error('Error in post-answer processing:', pointError);
          // Không throw error vì submit answer đã thành công
        }
      }

      // 🆕 UPDATE QUIZ ANSWER STATISTICS & STREAK
      if (userId) {
        try {
          await UserModel.updateQuizAnswer(userId, result.is_correct);
          console.log(`📊 Updated quiz answer stats for user ${userId}, correct: ${result.is_correct}`);

          // 🔥 Update streak cho mọi hoạt động quiz (không chỉ khi đúng)
          await UserModel.updateStreak(userId);
        } catch (statsError) {
          console.error('Quiz answer stats update error (continuing):', statsError.message);
          // Tiếp tục thực hiện
        }
      }

      return ApiResponse.success(res, '200', 'Answer submitted successfully', {
        is_correct: result.is_correct,
        response_id: result.id,
        points_earned: result.is_correct ? ( 10) : 0
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      return ApiResponse.error(res, 500, 'Failed to submit answer');
    }
  },

  // Hoàn thành quiz - CẬP NHẬT để tính tổng điểm
  completeQuiz: async (req, res) => {
    try {
      const { session_id } = req.body;
      const userId = req.user?.userId || req.user?.id;

      if (!session_id) {
        return ApiResponse.error(res, 400, 'Session ID is required');
      }

      const result = await quizModel.completeQuizSession(session_id);

      // Update điểm bonus cho việc hoàn thành quiz
      if (userId && result.score > 0) {
        try {
          // Bonus điểm dựa trên tỷ lệ đúng
          const correctPercentage = (result.correct_answers / result.total_questions) * 100;
          let bonusPoints = 0;

          if (correctPercentage >= 90) {
            bonusPoints = 50; // Excellent bonus
          } else if (correctPercentage >= 70) {
            bonusPoints = 30; // Good bonus
          } else if (correctPercentage >= 50) {
            bonusPoints = 15; // Fair bonus
          }

          if (bonusPoints > 0) {
            await UserModel.updateUserPoints(userId, bonusPoints, 'quiz_completion');
            console.log(`🎉 Added ${bonusPoints} bonus points to user ${userId} for quiz completion`);
          }

          // Streak đã được update trong submitAnswer, không cần update lại
          // Chỉ log thông báo hoàn thành
          console.log(`🎯 Quiz completed by user ${userId} with ${correctPercentage.toFixed(1)}% accuracy`);

        } catch (pointError) {
          console.error('Error updating completion bonus:', pointError);
        }
      }

      // 🆕 UPDATE QUIZ COMPLETION STATISTICS
      if (userId) {
        try {
          const quizzesCompleted = await UserModel.updateQuizCompletion(userId);
          console.log(`🎯 Updated quiz completion count to ${quizzesCompleted} for user ${userId}`);
        } catch (statsError) {
          console.error('Quiz completion stats update error (continuing):', statsError.message);
          // Tiếp tục thực hiện
        }
      }

      // Lấy rank hiện tại của user sau khi update điểm
      let currentRankings = null;
      if (userId) {
        try {
          const rankings = {};
          for (const type of ['global', 'weekly', 'monthly']) {
            const rankInfo = await UserModel.getUserRank(userId, type);
            rankings[type] = {
              rank: rankInfo?.rank || null,
              points: rankInfo?.points || 0
            };
          }
          currentRankings = rankings;
        } catch (rankError) {
          console.error('Error getting updated rankings:', rankError);
        }
      }

      return ApiResponse.success(res, '200', 'Quiz completed successfully', {
        session_id: result.id,
        total_questions: result.total_questions,
        correct_answers: result.correct_answers,
        score: result.score,
        completed_at: result.completed_at,
        performance: {
          accuracy: Math.round((result.correct_answers / result.total_questions) * 100),
          bonus_points: result.correct_answers > 0 ? Math.round(result.score / result.correct_answers) : 0
        },
        current_rankings: currentRankings
      });
    } catch (error) {
      console.error('Error completing quiz:', error);
      return ApiResponse.error(res, 500, 'Failed to complete quiz');
    }
  },

  // Bookmark từ
  bookmarkWord: async (req, res) => {
    try {
      const word_id = req.query.word_id || req.query.id || req.body.word_id;
      const notes = req.query.notes || req.body.notes;
      const userId = req.user?.userId || req.user?.id;

      if (!userId || !word_id) {
        return ApiResponse.error(res, 400, 'User ID and word ID are required');
      }

      const bookmark = await quizModel.bookmarkWord(userId, word_id, notes);

      return ApiResponse.success(res, '200', 'Word bookmarked successfully', bookmark);
    } catch (error) {
      console.error('Error bookmarking word:', error);
      return ApiResponse.error(res, 500, 'Failed to bookmark word');
    }
  },

  // Lấy bookmarks
  getBookmarks: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 401, 'User authentication required');
      }

      const result = await quizModel.getUserBookmarks(userId, parseInt(page), parseInt(limit));

      return ApiResponse.success(res, '200', 'Bookmarks retrieved successfully', result);
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return ApiResponse.error(res, 500, 'Failed to get bookmarks');
    }
  },

  // Lấy lịch sử quiz
  getQuizHistory: async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const userId = req.user?.userId || req.user?.id;

      if (!userId) {
        return ApiResponse.error(res, 401, 'User authentication required');
      }

      const result = await quizModel.getQuizHistory(userId, parseInt(page), parseInt(limit));

      return ApiResponse.success(res, '200', 'Quiz history retrieved successfully', result);
    } catch (error) {
      console.error('Error getting quiz history:', error);
      return ApiResponse.error(res, 500, 'Failed to get quiz history');
    }
  },

  // Xóa bookmark từ vựng
  deleteBookmark: async (req, res) => {
    try {
      const word_id = req.query.word_id || req.query.id;
      const userId = req.user?.userId || req.user?.id;
      console.log('🔍 Deleting bookmark for user:', userId, 'word:', word_id);

      if (!userId || !word_id) {
        return ApiResponse.error(res, 400, 'User ID và word ID là bắt buộc');
      }
      console.log('🔍 Deleting bookmark for user:', userId, 'word:', word_id);

      const deleted = await quizModel.deleteBookmark(userId, word_id);
      if (deleted) {
        return ApiResponse.success(res, '200', 'Đã xóa bookmark thành công', deleted);
      } else {
        return ApiResponse.error(res, 404, 'Bookmark không tồn tại');
      }
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      return ApiResponse.error(res, 500, 'Xóa bookmark thất bại');
    }
  },

  // ADMIN: Lấy tất cả quiz sessions
  getAllQuizSessions: async (req, res) => {
    try {
      const sessions = await quizModel.getAllQuizSessions();
      return ApiResponse.success(res, '200', 'Lấy tất cả quiz sessions thành công', sessions);
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể lấy quiz sessions', error.message);
    }
  },

  // ADMIN: Xóa quiz session
  deleteQuizSession: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await quizModel.deleteQuizSession(id);
      if (deleted) {
        return ApiResponse.success(res, '200', 'Đã xóa quiz session', deleted);
      } else {
        return ApiResponse.error(res, 404, 'Quiz session không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể xóa quiz session', error.message);
    }
  },

  // ADMIN: Thêm câu hỏi mới
  createQuestion: async (req, res) => {
    try {
      const question = await quizModel.createQuestion(req.body);
      return ApiResponse.success(res, '200', 'Tạo câu hỏi thành công', question);
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể tạo câu hỏi', error.message);
    }
  },

  // ADMIN: Sửa câu hỏi
  updateQuestion: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await quizModel.updateQuestion(id, req.body);
      if (updated) {
        return ApiResponse.success(res, '200', 'Cập nhật câu hỏi thành công', updated);
      } else {
        return ApiResponse.error(res, 404, 'Câu hỏi không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể cập nhật câu hỏi', error.message);
    }
  },

  // ADMIN: Xóa câu hỏi
  deleteQuestion: async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await quizModel.deleteQuestion(id);
      if (deleted) {
        return ApiResponse.success(res, '200', 'Đã xóa câu hỏi', deleted);
      } else {
        return ApiResponse.error(res, 404, 'Câu hỏi không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, 500, 'Không thể xóa câu hỏi', error.message);
    }
  },
};

module.exports = quizController;
