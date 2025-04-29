const express = require("express");
const usersRouter = require("./userRoutes");
const aiRoutes = require("./aiRoutes");

function routes(app) {
  // User management
  app.use("/api/users", usersRouter);
  app.use("/api/ai", aiRoutes);

  // // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.statusCode || 500).json({
      statusCode: 500,
      message: err.message || "Đã xảy ra lỗi!",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      statusCode: 500,
      message: "Không tìm thấy tài nguyên",
    });
  });
}

module.exports = routes;
