const express = require("express");
const usersRouter = require("./userRoutes");
const aiRoutes = require("./aiRoutes");
const vocabRoutes = require("./vocabRoutes");
const lessonRoutes = require("./lessonRoutes");
const statsRoutes = require("./statsRoutes");
const uploadRoutes = require("./uploadRoutes");

function routes(app) {
  // User management
  app.use("/api/users", usersRouter);
  app.use("/api/ai", aiRoutes);

  // English learning API routes
  app.use("/api/vocabulary", vocabRoutes);
  app.use("/api/lessons", lessonRoutes);
  app.use("/api/stats", statsRoutes);
  app.use("/api/uploads", uploadRoutes);

  // Error handling middleware
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
      statusCode: 404,
      message: "Không tìm thấy tài nguyên",
    });
  });
}

module.exports = routes;
