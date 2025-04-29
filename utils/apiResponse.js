class ApiResponse {
  static success(res, statusCode, message, data = null) {
    return res.status(statusCode).json({
      statusCode,
      message,
      data,
      success: true,
    });
  }

  static error(res, statusCode, message, error = null) {
    return res.status(statusCode).json({
      statusCode,
      message,
      error,
      success: false,
    });
  }
}

module.exports = ApiResponse;
