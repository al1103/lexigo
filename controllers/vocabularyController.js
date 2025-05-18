const vocabularyModel = require('../models/vocabulary_model');

// Initialize database tables
const initializeVocabularyTables = async (req, res) => {
  try {
    await vocabularyModel.createTables();
    res.status(200).json({ success: true, message: 'Vocabulary tables created successfully' });
  } catch (error) {
    console.error('Error initializing vocabulary tables:', error);
    res.status(500).json({ success: false, message: 'Error initializing vocabulary database' });
  }
};

// Add new vocabulary
const addVocabulary = async (req, res) => {
  try {
    const vocabularyData = req.body;
    
    // Basic validation
    if (!vocabularyData.word || !vocabularyData.definition) {
      return res.status(400).json({ 
        success: false, 
        message: 'Word and definition are required' 
      });
    }
    
    const result = await vocabularyModel.addVocabulary(vocabularyData);
    
    res.status(201).json({
      success: true,
      message: 'Vocabulary added successfully',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error adding vocabulary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding vocabulary' 
    });
  }
};

// Get vocabulary by ID
const getVocabularyById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const vocabulary = await vocabularyModel.getVocabularyById(id);
    
    if (!vocabulary) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vocabulary not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      data: vocabulary
    });
  } catch (error) {
    console.error('Error fetching vocabulary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching vocabulary' 
    });
  }
};

// Get all vocabularies with optional filtering
const getAllVocabularies = async (req, res) => {
  try {
    const {
      difficulty_level,
      category_id,
      search,
      limit = 20,
      offset = 0
    } = req.query;
    
    const filters = {
      difficulty_level: difficulty_level ? parseInt(difficulty_level) : null,
      category_id: category_id ? parseInt(category_id) : null,
      search,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };
    
    const vocabularies = await vocabularyModel.getAllVocabularies(filters);
    
    res.status(200).json({
      success: true,
      count: vocabularies.length,
      data: vocabularies
    });
  } catch (error) {
    console.error('Error fetching vocabularies:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching vocabularies' 
    });
  }
};

// Update vocabulary
const updateVocabulary = async (req, res) => {
  try {
    const { id } = req.params;
    const vocabularyData = req.body;
    
    // Check if vocabulary exists
    const existingVocabulary = await vocabularyModel.getVocabularyById(id);
    
    if (!existingVocabulary) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vocabulary not found' 
      });
    }
    
    await vocabularyModel.updateVocabulary(id, vocabularyData);
    
    res.status(200).json({
      success: true,
      message: 'Vocabulary updated successfully'
    });
  } catch (error) {
    console.error('Error updating vocabulary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating vocabulary' 
    });
  }
};

// Delete vocabulary
const deleteVocabulary = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if vocabulary exists
    const existingVocabulary = await vocabularyModel.getVocabularyById(id);
    
    if (!existingVocabulary) {
      return res.status(404).json({ 
        success: false, 
        message: 'Vocabulary not found' 
      });
    }
    
    await vocabularyModel.deleteVocabulary(id);
    
    res.status(200).json({
      success: true,
      message: 'Vocabulary deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting vocabulary:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting vocabulary' 
    });
  }
};

// Category management
const addCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        message: 'Category name is required' 
      });
    }
    
    const result = await vocabularyModel.addCategory(name, description);
    
    res.status(201).json({
      success: true,
      message: 'Category added successfully',
      data: { id: result.id }
    });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error adding category' 
    });
  }
};

const getAllCategories = async (req, res) => {
  try {
    const categories = await vocabularyModel.getAllCategories();
    
    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching categories' 
    });
  }
};

module.exports = {
  initializeVocabularyTables,
  addVocabulary,
  getVocabularyById,
  getAllVocabularies,
  updateVocabulary,
  deleteVocabulary,
  addCategory,
  getAllCategories
}; 