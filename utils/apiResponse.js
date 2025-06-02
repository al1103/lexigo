class ApiResponse {
  static success(res, status, message, data = null) {
    return res.status(status).json({
      status,
      message,
      data,
      success: true,
    });
  }

  static error(res, status, message, error = null) {
    return res.status(status).json({
      status,
      message,
      error,
      success: false,
    });
  }
}

module.exports = ApiResponse;
