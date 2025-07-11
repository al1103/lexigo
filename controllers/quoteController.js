const QuoteModel = require('../models/quote_model');
const ApiResponse = require('../utils/apiResponse');

class QuoteController {
  // Lấy quote of the day - mỗi ngày sẽ có một quote khác nhau
  static async getDailyQuote(req, res) {
    try {
      const quote = await QuoteModel.getDailyQuote();

      if (!quote) {
        return ApiResponse.error(res, '404', 'Không tìm thấy quote nào');
      }

      return ApiResponse.success(res, '200', 'Lấy quote of the day thành công', quote);
    } catch (error) {
      console.error('Error in getDailyQuote:', error);
      return ApiResponse.error(res, '500', 'Lỗi server khi lấy quote of the day');
    }
  }

  // ADMIN: Lấy tất cả quotes
  static async getAllQuotes(req, res) {
    try {
      const quotes = await QuoteModel.getAllQuotes();
      return ApiResponse.success(res, '200', 'Lấy danh sách quote thành công', quotes);
    } catch (error) {
      return ApiResponse.error(res, '500', 'Không thể lấy danh sách quote', error.message);
    }
  }

  // ADMIN: Thêm quote mới
  static async createQuote(req, res) {
    try {
      const { content, author } = req.body;
      const quote = await QuoteModel.createQuote({ content, author });
      return ApiResponse.success(res, '200', 'Tạo quote thành công', quote);
    } catch (error) {
      return ApiResponse.error(res, '500', 'Không thể tạo quote', error.message);
    }
  }

  // ADMIN: Sửa quote
  static async updateQuote(req, res) {
    try {
      const { id } = req.params;
      const { content, author } = req.body;
      const updated = await QuoteModel.updateQuote(id, { content, author });
      if (updated) {
        return ApiResponse.success(res, '200', 'Cập nhật quote thành công', updated);
      } else {
        return ApiResponse.error(res, '404', 'Quote không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, '500', 'Không thể cập nhật quote', error.message);
    }
  }

  // ADMIN: Xóa quote
  static async deleteQuote(req, res) {
    try {
      const { id } = req.params;
      const deleted = await QuoteModel.deleteQuote(id);
      if (deleted) {
        return ApiResponse.success(res, '200', 'Đã xóa quote', deleted);
      } else {
        return ApiResponse.error(res, '404', 'Quote không tồn tại');
      }
    } catch (error) {
      return ApiResponse.error(res, '500', 'Không thể xóa quote', error.message);
    }
  }
}

module.exports = QuoteController;
