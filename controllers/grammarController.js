const GrammarModel = require('../models/grammar_model');
const ApiResponse = require('../utils/apiResponse');

const grammarController = {
  // Lấy tất cả bài viết ngữ pháp
  getAllArticles: async (req, res) => {
    try {
      const {
        page = 1,
        limit = 10,
        difficulty,
        category,
        search
      } = req.query;

      // Validate page và limit
      const validPage = Math.max(1, parseInt(page));
      const validLimit = Math.min(50, Math.max(1, parseInt(limit))); // Giới hạn tối đa 50 items

      const options = {
        page: validPage,
        limit: validLimit,
        difficulty,
        category,
        search
      };

      const result = await GrammarModel.getAll(options);

      return ApiResponse.success(res, '200' , 'Lấy danh sách bài viết ngữ pháp thành công', result);
    } catch (error) {
      console.error('Error in getAllArticles:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi lấy danh sách bài viết ngữ pháp', error.message);
    }
  },

  // Lấy bài viết theo ID
  getArticleById: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, '400', 'ID bài viết không hợp lệ');
      }

      const article = await GrammarModel.getById(parseInt(id));

      if (!article) {
        return ApiResponse.error(res, '404', 'Không tìm thấy bài viết ngữ pháp');
      }

      return ApiResponse.success(res, '200', 'Lấy bài viết ngữ pháp thành công', { article });
    } catch (error) {
      console.error('Error in getArticleById:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi lấy bài viết ngữ pháp', error.message);
    }
  },

  // Lấy bài viết theo danh mục
  getArticlesByCategory: async (req, res) => {
    try {
      const { category } = req.params;
      const { page = 1, limit = 10 } = req.query;

      if (!category) {
        return ApiResponse.error(res, '400', 'Danh mục không được để trống');
      }

      const validPage = Math.max(1, parseInt(page));
      const validLimit = Math.min(50, Math.max(1, parseInt(limit)));

      const options = {
        page: validPage,
        limit: validLimit
      };

      const result = await GrammarModel.getByCategory(category, options);

      return ApiResponse.success(res, '200', `Lấy bài viết ngữ pháp theo danh mục "${category}" thành công`, result);
    } catch (error) {
      console.error('Error in getArticlesByCategory:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi lấy bài viết theo danh mục', error.message);
    }
  },

  // Lấy bài viết theo độ khó
  getArticlesByDifficulty: async (req, res) => {
    try {
      const { difficulty } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Validate difficulty level
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];
      if (!validDifficulties.includes(difficulty)) {
        return ApiResponse.error(res, '400', 'Độ khó không hợp lệ. Chỉ chấp nhận: beginner, intermediate, advanced');
      }

      const validPage = Math.max(1, parseInt(page));
      const validLimit = Math.min(50, Math.max(1, parseInt(limit)));

      const options = {
        page: validPage,
        limit: validLimit
      };

      const result = await GrammarModel.getByDifficulty(difficulty, options);

      return ApiResponse.success(res, '200', `Lấy bài viết ngữ pháp mức độ "${difficulty}" thành công`, result);
    } catch (error) {
      console.error('Error in getArticlesByDifficulty:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi lấy bài viết theo độ khó', error.message);
    }
  },

  // Tìm kiếm bài viết
  searchArticles: async (req, res) => {
    try {
      const { keyword } = req.query;
      const { page = 1, limit = 10 } = req.query;

      if (!keyword || keyword.trim().length === 0) {
        return ApiResponse.error(res, '400', 'Từ khóa tìm kiếm không được để trống');
      }

      const validPage = Math.max(1, parseInt(page));
      const validLimit = Math.min(50, Math.max(1, parseInt(limit)));

      const options = {
        page: validPage,
        limit: validLimit
      };

      const result = await GrammarModel.search(keyword.trim(), options);

      return ApiResponse.success(res, '200', `Tìm kiếm bài viết với từ khóa "${keyword}" thành công`, result);
    } catch (error) {
      console.error('Error in searchArticles:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi tìm kiếm bài viết', error.message);
    }
  },

  // Lấy danh sách các danh mục
  getCategories: async (req, res) => {
    try {
      const categories = await GrammarModel.getCategories();

      return ApiResponse.success(res, '200', 'Lấy danh sách danh mục thành công', { categories });
    } catch (error) {
      console.error('Error in getCategories:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi lấy danh sách danh mục', error.message);
    }
  },

  // Lấy bài viết phổ biến
  getPopularArticles: async (req, res) => {
    try {
      const { limit = 5 } = req.query;
      const validLimit = Math.min(20, Math.max(1, parseInt(limit))); // Giới hạn tối đa 20 items

      const articles = await GrammarModel.getPopular(validLimit);

      return ApiResponse.success(res, '200', 'Lấy bài viết phổ biến thành công', { articles });
    } catch (error) {
      console.error('Error in getPopularArticles:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi lấy bài viết phổ biến', error.message);
    }
  },

  // === ADMIN ONLY ENDPOINTS ===

  // Tạo bài viết mới (chỉ dành cho admin)
  createArticle: async (req, res) => {
    try {
      const {
        title,
        content,
        difficulty_level = 'beginner',
        category,
        tags = [],
        reading_time,
        is_published = true
      } = req.body;

      // Validate required fields
      if (!title || !content) {
        return ApiResponse.error(res, '400', 'Tiêu đề và nội dung bài viết là bắt buộc');
      }

      // Validate difficulty level
      const validDifficulties = ['beginner', 'intermediate', 'advanced'];
      if (!validDifficulties.includes(difficulty_level)) {
        return ApiResponse.error(res, '400', 'Độ khó không hợp lệ. Chỉ chấp nhận: beginner, intermediate, advanced');
      }

      const articleData = {
        title: title.trim(),
        content: content.trim(),
        difficulty_level,
        category: category ? category.trim() : null,
        tags: Array.isArray(tags) ? tags : [],
        reading_time: reading_time ? parseInt(reading_time) : null,
        is_published: Boolean(is_published)
      };

      const newArticle = await GrammarModel.create(articleData);

      return ApiResponse.success(res, '201', 'Tạo bài viết ngữ pháp thành công', { article: newArticle });
    } catch (error) {
      console.error('Error in createArticle:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi tạo bài viết ngữ pháp', error.message);
    }
  },

  // Cập nhật bài viết (chỉ dành cho admin)
  updateArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        content,
        difficulty_level,
        category,
        tags,
        reading_time,
        is_published
      } = req.body;

      // Validate ID
      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, '400', 'ID bài viết không hợp lệ');
      }

      // Validate required fields
      if (!title || !content) {
        return ApiResponse.error(res, '400', 'Tiêu đề và nội dung bài viết là bắt buộc');
      }

      // Validate difficulty level
      if (difficulty_level) {
        const validDifficulties = ['beginner', 'intermediate', 'advanced'];
        if (!validDifficulties.includes(difficulty_level)) {
          return ApiResponse.error(res, '400', 'Độ khó không hợp lệ. Chỉ chấp nhận: beginner, intermediate, advanced');
        }
      }

      const articleData = {
        title: title.trim(),
        content: content.trim(),
        difficulty_level,
        category: category ? category.trim() : null,
        tags: Array.isArray(tags) ? tags : [],
        reading_time: reading_time ? parseInt(reading_time) : null,
        is_published: Boolean(is_published)
      };

      const updatedArticle = await GrammarModel.update(parseInt(id), articleData);

      if (!updatedArticle) {
        return ApiResponse.error(res, '404', 'Không tìm thấy bài viết để cập nhật');
      }

      return ApiResponse.success(res, '200', 'Cập nhật bài viết ngữ pháp thành công', { article: updatedArticle });
    } catch (error) {
      console.error('Error in updateArticle:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi cập nhật bài viết ngữ pháp', error.message);
    }
  },

  // Xóa bài viết (chỉ dành cho admin)
  deleteArticle: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ID
      if (!id || isNaN(parseInt(id))) {
        return ApiResponse.error(res, '400', 'ID bài viết không hợp lệ');
      }

      const deletedArticle = await GrammarModel.delete(parseInt(id));

      if (!deletedArticle) {
        return ApiResponse.error(res, '404', 'Không tìm thấy bài viết để xóa');
      }

      return ApiResponse.success(res, '200', 'Xóa bài viết ngữ pháp thành công', { deleted_id: deletedArticle.id });
    } catch (error) {
      console.error('Error in deleteArticle:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi xóa bài viết ngữ pháp', error.message);
    }
  }
};

module.exports = grammarController;
