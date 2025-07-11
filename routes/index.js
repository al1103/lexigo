const express = require("express");
const usersRouter = require("./userRoutes");
const aiRoutes = require("./aiRoutes");
const quizRoutes = require("./quizRoutes");
const speakingRoutes = require("./speakingRoutes");
const levelRoutes = require("./levelRoutes"); // Thêm dòng này
const RankRouter = require("./ranking");
const quoteRoutes = require("./quoteRoutes");

function routes(app) {
  // User management
  app.use("/api", usersRouter);
  app.use("/api/ai", aiRoutes);

  // Main features
  app.use("/api/quiz", quizRoutes);
  app.use("/api/speaking", speakingRoutes);
  app.use("/api/ranking", RankRouter);
  app.use("/api/levels", levelRoutes); // Thêm dòng này
  app.use("/api/quotes", quoteRoutes);

  // Test connection route
  app.get('/test', (req, res) => {
    console.log("Test connection route hit");
    res.json({ message: "API is working!" });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(err.status || 500).json({
      status: 500,
      message: err.message || "Đã xảy ra lỗi!",
      ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      status: 404,
      message: "Không tìm thấy tài nguyên",
    });
  });
}

module.exports = routes;
