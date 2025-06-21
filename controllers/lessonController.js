const { pool } = require('../config/database');
const lessonModel = require('../models/lessonModel');

const lessonController = {
  // Initialize database tables
  initializeLessonTables: async (req, res) => {
    try {
      const result = await lessonModel.createTables();
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
      });
    } catch (error) {
      console.error('Error initializing lesson tables:', error);
      res.status(500).json({ success: false, message: 'Error initializing lesson database' });
    }
  },

  // Lesson CRUD operations
  createLesson: async (req, res) => {
    try {
      const lessonData = req.body;

      // Basic validation
      if (!lessonData.title) {
        return res.status(400).json({
          success: false,
          message: 'Lesson title is required'
        });
      }

      const result = await lessonModel.createLesson(lessonData);

      res.status(201).json({
        success: true,
        message: 'Lesson created successfully',
        data: result
      });
    } catch (error) {
      console.error('Error creating lesson:', error);
      res.status(500).json({ success: false, message: 'Error creating lesson' });
    }
  },

  getLessonById: async (req, res) => {
    try {
      const { id } = req.params;

      // Luôn lấy lesson với questions và answers
      const result = await lessonModel.getLessonWithQuestionsAndAnswers(id);

      if (!result) {
        return res.status(404).json({
          status: 'error',
          message: 'Lesson not found'
        });
      }

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Error getting lesson:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get lesson'
      });
    }
  },

  getAllLessons: async (req, res) => {
    try {
      const {
        level,
        search,
        limit = 20,
        offset = 0
      } = req.query;

      const filters = {
        level: level ? parseInt(level) : null,
        search,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };

      const lessons = await lessonModel.getAllLessons(filters);

      res.status(200).json({
        success: true,
        count: lessons.length,
        data: lessons
      });
    } catch (error) {
      console.error('Error fetching lessons:', error);
      res.status(500).json({ success: false, message: 'Error fetching lessons' });
    }
  },

  updateLesson: async (req, res) => {
    try {
      const { id } = req.params;
      const lessonData = req.body;

      // Check if lesson exists
      const lesson = await lessonModel.getLessonById(id);
      if (!lesson) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      const result = await lessonModel.updateLesson(id, lessonData);

      res.status(200).json({
        success: true,
        message: 'Lesson updated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error updating lesson:', error);
      res.status(500).json({ success: false, message: 'Error updating lesson' });
    }
  },

  deleteLesson: async (req, res) => {
    try {
      const { id } = req.params;

      const result = await lessonModel.deleteLesson(id);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Lesson not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Lesson deleted successfully',
        data: result
      });
    } catch (error) {
      console.error('Error deleting lesson:', error);
      res.status(500).json({ success: false, message: 'Error deleting lesson' });
    }
  },

  // Submit quiz (simple approach)
  submitQuiz: async (req, res) => {
    try {
      const { lesson_id, answers, bookmarked_questions } = req.body;
      const user_id = req.user?.id || 1; // From auth middleware or default

      if (!lesson_id || !answers || !Array.isArray(answers)) {
        return res.status(400).json({
          status: 'error',
          message: 'lesson_id and answers array are required'
        });
      }

      const result = await lessonModel.submitQuiz(user_id, lesson_id, answers, bookmarked_questions);

      res.status(200).json({
        status: 'success',
        message: 'Quiz submitted successfully',
        data: result
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to submit quiz'
      });
    }
  },

  // Lesson section operations (placeholders)
  addLessonSection: async (req, res) => {
    try {
      const result = await lessonModel.addLessonSection(req.body);
      res.status(201).json({
        success: true,
        message: 'Lesson section added successfully (placeholder)',
        data: result
      });
    } catch (error) {
      console.error('Error adding lesson section:', error);
      res.status(500).json({ success: false, message: 'Error adding lesson section' });
    }
  },

  updateLessonSection: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await lessonModel.updateLessonSection(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Lesson section updated successfully (placeholder)',
        data: result
      });
    } catch (error) {
      console.error('Error updating lesson section:', error);
      res.status(500).json({ success: false, message: 'Error updating lesson section' });
    }
  },

  deleteLessonSection: async (req, res) => {
    try {
      const { id } = req.params;
      const result = await lessonModel.deleteLessonSection(id);
      res.status(200).json({
        success: true,
        message: 'Lesson section deleted successfully (placeholder)',
        data: result
      });
    } catch (error) {
      console.error('Error deleting lesson section:', error);
      res.status(500).json({ success: false, message: 'Error deleting lesson section' });
    }
  },

  // Quiz operations
  createQuiz: async (req, res) => {
    try {
      const quizData = req.body;

      if (!quizData.lesson_id) {
        return res.status(400).json({
          success: false,
          message: 'Lesson ID is required'
        });
      }

      const result = await lessonModel.createQuiz(quizData);

      res.status(201).json({
        success: true,
        message: 'Quiz created successfully',
        data: result
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      res.status(500).json({ success: false, message: 'Error creating quiz' });
    }
  },

  getQuizById: async (req, res) => {
    try {
      const { id } = req.params;
      const { include_answers } = req.query;

      const includeAnswers = include_answers === 'true';
      const quiz = await lessonModel.getQuizById(id, includeAnswers);

      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }

      res.status(200).json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Error fetching quiz:', error);
      res.status(500).json({ success: false, message: 'Error fetching quiz' });
    }
  },

  // User progress operations
  updateUserProgress: async (req, res) => {
    try {
      const { userId, lessonId } = req.params;
      const progressData = req.body;

      const result = await lessonModel.updateUserProgress(parseInt(userId), parseInt(lessonId), progressData);

      res.status(200).json({
        success: true,
        message: 'User progress updated successfully',
        data: result
      });
    } catch (error) {
      console.error('Error updating user progress:', error);
      res.status(500).json({ success: false, message: 'Error updating user progress' });
    }
  },

  getUserProgress: async (req, res) => {
    try {
      const { userId, lessonId } = req.params;

      const progress = await lessonModel.getUserProgress(parseInt(userId), lessonId ? parseInt(lessonId) : null);

      res.status(200).json({
        success: true,
        data: progress
      });
    } catch (error) {
      console.error('Error fetching user progress:', error);
      res.status(500).json({ success: false, message: 'Error fetching user progress' });
    }
  },

  // Quiz attempt operations
  startQuizAttempt: async (req, res) => {
    try {
      const { userId, quizId } = req.params;

      const result = await lessonModel.createQuizAttempt(parseInt(userId), parseInt(quizId));

      res.status(201).json({
        success: true,
        message: 'Quiz attempt started',
        data: result
      });
    } catch (error) {
      console.error('Error starting quiz attempt:', error);
      res.status(500).json({ success: false, message: 'Error starting quiz attempt' });
    }
  },

  submitQuizResponse: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { questionId, answerId, isCorrect } = req.body;

      const result = await lessonModel.saveQuizResponse(
        parseInt(attemptId),
        parseInt(questionId),
        parseInt(answerId),
        isCorrect
      );

      res.status(200).json({
        success: true,
        message: 'Response recorded successfully',
        data: result
      });
    } catch (error) {
      console.error('Error saving quiz response:', error);
      res.status(500).json({ success: false, message: 'Error saving quiz response' });
    }
  },

  completeQuizAttempt: async (req, res) => {
    try {
      const { attemptId } = req.params;
      const { score, passed } = req.body;

      const result = await lessonModel.completeQuizAttempt(parseInt(attemptId), score, passed);

      res.status(200).json({
        success: true,
        message: 'Quiz attempt completed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error completing quiz attempt:', error);
      res.status(500).json({ success: false, message: 'Error completing quiz attempt' });
    }
  },

  getUserQuizResults: async (req, res) => {
    try {
      const { userId } = req.params;
      const { quizId } = req.query;

      const results = await lessonModel.getUserQuizResults(
        parseInt(userId),
        quizId ? parseInt(quizId) : null
      );

      res.status(200).json({
        success: true,
        data: results
      });
    } catch (error) {
      console.error('Error fetching user quiz results:', error);
      res.status(500).json({ success: false, message: 'Error fetching user quiz results' });
    }
  },

  // Get user bookmarks
  getUserBookmarks: async (req, res) => {
    try {
      const { userId } = req.params;
      const { lessonId } = req.query;

      const bookmarks = await lessonModel.getUserBookmarks(parseInt(userId), lessonId ? parseInt(lessonId) : null);

      res.status(200).json({
        success: true,
        data: bookmarks
      });
    } catch (error) {
      console.error('Error fetching user bookmarks:', error);
      res.status(500).json({ success: false, message: 'Error fetching user bookmarks' });
    }
  },

  // Remove bookmark
  removeBookmark: async (req, res) => {
    try {
      const { userId, questionId } = req.params;

      const result = await lessonModel.removeBookmark(parseInt(userId), parseInt(questionId));

      res.status(200).json({
        success: true,
        message: 'Bookmark removed successfully',
        data: result
      });
    } catch (error) {
      console.error('Error removing bookmark:', error);
      res.status(500).json({ success: false, message: 'Error removing bookmark' });
    }
  },

  // Get multiple lessons by IDs
  getLessonsByIds: async (req, res) => {
    try {
      const { lesson_ids } = req.body;

      if (!lesson_ids || !Array.isArray(lesson_ids) || lesson_ids.length === 0) {
        return res.status(400).json({
          status: 'error',
          message: 'lesson_ids array is required and cannot be empty'
        });
      }

      const result = await lessonModel.getLessonsByIds(lesson_ids);

      res.status(200).json({
        status: 'success',
        data: result
      });
    } catch (error) {
      console.error('Error getting lessons:', error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to get lessons'
      });
    }
  },
};

module.exports = lessonController;
