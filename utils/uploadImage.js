// Sử dụng cấu hình Cloudinary từ file config
const cloudinary = require("../config/cloudinary");

/**
 * Upload ảnh lên Cloudinary
 * @param {string} imagePath - Đường dẫn tới file ảnh hoặc URL hoặc base64
 * @param {Object} options - Tùy chọn cho việc upload
 * @returns {Promise<Object>} - Kết quả từ Cloudinary
 */
const uploadImage = async (imagePath, customOptions = {}) => {
  // Các tùy chọn mặc định
  const options = {
    use_filename: true,
    unique_filename: true,
    overwrite: true,
    folder: "food_api/images", // Thư mục lưu trữ trên Cloudinary
    ...customOptions, // Ghi đè bằng tùy chọn tùy chỉnh nếu có
  };

  try {
    // Upload ảnh
    const result = await cloudinary.uploader.upload(imagePath, options);
    return {
      public_id: result.public_id,
      url: result.secure_url,
      format: result.format,
      width: result.width,
      height: result.height,
      resource_type: result.resource_type,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error(`Lỗi khi upload ảnh: ${error.message}`);
  }
};

/**
 * Lấy thông tin chi tiết của ảnh đã upload
 * @param {string} publicId - Public ID của ảnh trên Cloudinary
 * @param {Object} options - Tùy chọn bổ sung
 * @returns {Promise<Object>} - Thông tin chi tiết về ảnh
 */
const getAssetInfo = async (publicId, customOptions = {}) => {
  const options = {
    colors: true,
    ...customOptions,
  };

  try {
    const result = await cloudinary.api.resource(publicId, options);
    return result;
  } catch (error) {
    console.error("Cloudinary resource fetch error:", error);
    throw new Error(`Lỗi khi lấy thông tin ảnh: ${error.message}`);
  }
};

/**
 * Tạo URL ảnh với các biến đổi (transformation)
 * @param {string} publicId - Public ID của ảnh
 * @param {Array} transformations - Mảng các biến đổi
 * @returns {string} - URL ảnh đã được biến đổi
 */
const generateImageUrl = (publicId, transformations = []) => {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: transformations,
  });
};

/**
 * Xóa ảnh trên Cloudinary
 * @param {string} publicId - Public ID của ảnh cần xóa
 * @returns {Promise<Object>} - Kết quả từ việc xóa
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    throw new Error(`Lỗi khi xóa ảnh: ${error.message}`);
  }
};

module.exports = {
  uploadImage,
  getAssetInfo,
  generateImageUrl,
  deleteImage,
};
