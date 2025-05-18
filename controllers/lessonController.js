const lessonModel = require('../models/lesson_model');
const userStatsModel = require('../models/user_stats_model');

// Initialize database tables
const initializeLessonTables = async (req, res) => {
  try {
    await lessonModel.createTables();
    res.status(200).json({ success: true, message: 'Lesson tables created successfully' });
  } catch (error) {
    console.error('Error initializing lesson tables:', error);
    res.status(500).json({ success: false, message: 'Error initializing lesson database' });
  }
};

// Lesson CRUD operations
const createLesson = async (req, res) => {
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
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ success: false, message: 'Error creating lesson' });
  }
};

const getLessonById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const lesson = await lessonModel.getLessonById(id);
    
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: lesson
    });
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ success: false, message: 'Error fetching lesson' });
  }
};

const getAllLessons = async (req, res) => {
  try {
    const {
      level,
      category_id,
      search,
      limit = 20,
      offset = 0
    } = req.query;
    
    const filters = {
      level: level ? parseInt(level) : null,
      category_id: category_id ? parseInt(category_id) : null,
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
};

const updateLesson = async (req, res) => {
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
    
    await lessonModel.updateLesson(id, lessonData);
    
    res.status(200).json({
      success: true,
      message: 'Lesson updated successfully'
    });
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ success: false, message: 'Error updating lesson' });
  }
};

const deleteLesson = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if lesson exists
    const lesson = await lessonModel.getLessonById(id);
    if (!lesson) {
      return res.status(404).json({ 
        success: false, 
        message: 'Lesson not found' 
      });
    }
    
    await lessonModel.deleteLesson(id);
    
    res.status(200).json({
      success: true,
      message: 'Lesson deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ success: false, message: 'Error deleting lesson' });
  }
};

// Lesson section operations
const addLessonSection = async (req, res) => {
  try {
    const sectionData = req.body;
    
    // Basic validation
    if (!sectionData.lesson_id || !sectionData.content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lesson ID and content are required' 
      });
    }
    
    const result = await lessonModel.addLessonSection(sectionData);
    
    res.status(201).json({
      success: true,
      message: 'Lesson section added successfully',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error adding lesson section:', error);
    res.status(500).json({ success: false, message: 'Error adding lesson section' });
  }
};

const updateLessonSection = async (req, res) => {
  try {
    const { id } = req.params;
    const sectionData = req.body;
    
    await lessonModel.updateLessonSection(id, sectionData);
    
    res.status(200).json({
      success: true,
      message: 'Lesson section updated successfully'
    });
  } catch (error) {
    console.error('Error updating lesson section:', error);
    res.status(500).json({ success: false, message: 'Error updating lesson section' });
  }
};

const deleteLessonSection = async (req, res) => {
  try {
    const { id } = req.params;
    
    await lessonModel.deleteLessonSection(id);
    
    res.status(200).json({
      success: true,
      message: 'Lesson section deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting lesson section:', error);
    res.status(500).json({ success: false, message: 'Error deleting lesson section' });
  }
};

// Quiz operations
const createQuiz = async (req, res) => {
  try {
    const quizData = req.body;
    
    // Basic validation
    if (!quizData.lesson_id || !quizData.title) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lesson ID and quiz title are required' 
      });
    }
    
    const result = await lessonModel.createQuiz(quizData);
    
    res.status(201).json({
      success: true,
      message: 'Quiz created successfully',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error creating quiz:', error);
    res.status(500).json({ success: false, message: 'Error creating quiz' });
  }
};

const getQuizById = async (req, res) => {
  try {
    const { id } = req.params;
    const { include_answers } = req.query;
    
    const includeAnswers = include_answers === 'true' || include_answers === true;
    
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
};

// User progress operations
const updateUserProgress = async (req, res) => {
  try {
    const { userId, lessonId } = req.params;
    const progressData = req.body;
    
    await lessonModel.updateUserProgress(parseInt(userId), parseInt(lessonId), progressData);
    
    // If lesson was completed, update user stats
    if (progressData.completed) {
      await userStatsModel.trackLessonCompletion(parseInt(userId), parseInt(lessonId));
      
      // Award XP for completing a lesson
      await userStatsModel.awardXP(parseInt(userId), 50, 'Completed lesson');
    }
    
    res.status(200).json({
      success: true,
      message: 'User progress updated successfully'
    });
  } catch (error) {
    console.error('Error updating user progress:', error);
    res.status(500).json({ success: false, message: 'Error updating user progress' });
  }
};

const getUserProgress = async (req, res) => {
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
};

// Quiz attempt operations
const startQuizAttempt = async (req, res) => {
  try {
    const { userId, quizId } = req.params;
    
    const result = await lessonModel.createQuizAttempt(parseInt(userId), parseInt(quizId));
    
    res.status(201).json({
      success: true,
      message: 'Quiz attempt started',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error starting quiz attempt:', error);
    res.status(500).json({ success: false, message: 'Error starting quiz attempt' });
  }
};

const submitQuizResponse = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answerId, isCorrect } = req.body;
    
    await lessonModel.saveQuizResponse(
      parseInt(attemptId), 
      parseInt(questionId), 
      parseInt(answerId), 
      isCorrect
    );
    
    res.status(200).json({
      success: true,
      message: 'Response recorded successfully'
    });
  } catch (error) {
    console.error('Error saving quiz response:', error);
    res.status(500).json({ success: false, message: 'Error saving quiz response' });
  }
};

const completeQuizAttempt = async (req, res) => {
  try {
    const { attemptId } = req.params;
    const { userId, quizId } = req.query;
    const { score, passed } = req.body;
    
    await lessonModel.completeQuizAttempt(parseInt(attemptId), score, passed);
    
    // Update user stats if quiz was passed
    if (passed && userId && quizId) {
      await userStatsModel.trackQuizCompletion(
        parseInt(userId),
        parseInt(quizId),
        passed
      );
      
      // Award XP for passing a quiz
      await userStatsModel.awardXP(parseInt(userId), 100, 'Passed quiz');
    }
    
    res.status(200).json({
      success: true,
      message: 'Quiz attempt completed successfully'
    });
  } catch (error) {
    console.error('Error completing quiz attempt:', error);
    res.status(500).json({ success: false, message: 'Error completing quiz attempt' });
  }
};

const getUserQuizResults = async (req, res) => {
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
};

module.exports = {
  initializeLessonTables,
  createLesson,
  getLessonById,
  getAllLessons,
  updateLesson,
  deleteLesson,
  addLessonSection,
  updateLessonSection,
  deleteLessonSection,
  createQuiz,
  getQuizById,
  updateUserProgress,
  getUserProgress,
  startQuizAttempt,
  submitQuizResponse,
  completeQuizAttempt,
  getUserQuizResults
}; 