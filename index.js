const express = require("express");
const bodyParser = require("body-parser");
const rateLimit = require("express-rate-limit");
const { pool } = require("./config/database");
const routes = require("./routes");
const cookieParser = require("cookie-parser");
const http = require("http");
const cors = require("cors");
require("dotenv").config();
const cloudinary = require("./config/cloudinary");
const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: true, // Hoặc địa chỉ cụ thể của client
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Set-Cookie"],
};

app.use(cors(corsOptions));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // Giới hạn số yêu cầu
  standardHeaders: true,
  legacyHeaders: false,
  message: "Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút",
});

app.use(limiter);
app.use(bodyParser.json());
app.use(cookieParser());

// Simple database connection test before starting server
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database connection test failed:", err);
  } else {
    console.log("✅ Database connection test successful:", res.rows[0].now);
    // Only start the server if the database connection is successful
    startServer();
  }
});

function startServer() {
  // Kiểm tra kết nối Cloudinary
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error("❌ Cloudinary connection failed:", error);
    } else {
      console.log("✅ Cloudinary connection successful");
    }
  });

  routes(app);

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Đã xảy ra lỗi!");
  });

  const PORT = process.env.PORT || 9999;
  server.listen(PORT, () => {
    console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
  });
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  pool.end().then(() => {
    console.log("Pool has ended");
    process.exit(0);
  });
});
