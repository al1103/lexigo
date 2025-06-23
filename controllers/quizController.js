const quizModel = require('../models/quiz_model');
const LevelModel = require('../models/level_model'); // Thêm import
const ApiResponse = require('../utils/apiResponse');

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
            // Lấy câu hỏi còn lại
            questions = await quizModel.getRemainingQuestions(
              activeSession.id,
              level.level_code,
              remainingNeeded
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

        // Lấy câu hỏi mới
        const requestedCount = Math.min(question_count, totalAvailableQuestions);
        questions = await quizModel.getQuestionsByLevel(level.level_code, requestedCount);

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
        current_progress: currentProgress,
        remaining_questions: questions.length,

        contents: questions.map(q => ({
          question_id: q.question_id,
          question_text: q.question_text,
          word: q.word,
          meaning: q.meaning,
          pronunciation: q.pronunciation,
          example_sentence: q.example_sentence,
          options: q.options,
          points: q.points
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

  // Submit câu trả lời
  submitAnswer: async (req, res) => {
    try {
      const { session_id, question_id, selected_option_id, response_time = 0 } = req.body;

      if (!session_id || !question_id || !selected_option_id) {
        return ApiResponse.error(res, 400, 'Missing required fields');
      }

      const result = await quizModel.submitAnswer(
        session_id,
        question_id,
        selected_option_id,
        response_time
      );

      return ApiResponse.success(res, '200', 'Answer submitted successfully', {
        is_correct: result.is_correct,
        response_id: result.id
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      return ApiResponse.error(res, 500, 'Failed to submit answer');
    }
  },

  // Hoàn thành quiz
  completeQuiz: async (req, res) => {
    try {
      const { session_id } = req.body;

      if (!session_id) {
        return ApiResponse.error(res, 400, 'Session ID is required');
      }

      const result = await quizModel.completeQuizSession(session_id);

      return ApiResponse.success(res, '200', 'Quiz completed successfully', {
        session_id: result.id,
        total_questions: result.total_questions,
        correct_answers: result.correct_answers,
        score: result.score,
        completed_at: result.completed_at
      });
    } catch (error) {
      console.error('Error completing quiz:', error);
      return ApiResponse.error(res, 500, 'Failed to complete quiz');
    }
  },

  // Bookmark từ
  bookmarkWord: async (req, res) => {
    try {
      const { word_id, notes } = req.body;
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
  }
};

module.exports = quizController;
