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

// EJS setup
const expressLayouts = require('express-ejs-layouts');

// Admin routes
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

const corsOptions = {
  origin: '*', // Cho phép tất cả origin trong dev
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Set-Cookie"],
  exposedHeaders: ['set-cookie', 'Set-Cookie']
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
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Health check route không cần auth
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    clientIP: req.ip,
    headers: req.headers
  });
});

// EJS view engine setup
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(expressLayouts);
app.set('layout', 'admin/layout');

// Cấu hình trust proxy cho cloudflared/ngrok
// Tin cậy tất cả proxy trong dev
app.enable('trust proxy');


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

async function startServer() {
  try {
    // Initialize database models
    if (process.env.INITIALIZE_DB === "true") {
      console.log("Initializing database models...");
      console.log("Database models initialized successfully!");
    }

    // Check Cloudinary connection
    cloudinary.api.ping((error, result) => {
      if (error) {
        console.error("❌ Cloudinary connection failed:", error);
      } else {
        console.log("✅ Cloudinary connection successful");
      }
    });

    // Mount Admin routes
    app.use('/admin', adminRoutes);

    // Mount API routes
    routes(app);

    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).send("Đã xảy ra lỗi!");
    });

    const PORT = process.env.PORT || 9999;
    const HOST = process.env.HOST || '127.0.0.1'; // Sử dụng IP từ environment hoặc mặc định localhost
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server đang chạy trên ${HOST}:${PORT}`);
      console.log(`📊 Admin dashboard: http://${HOST}:${PORT}/admin`);
      console.log(`🔐 Default admin: admin@lexigo.com / admin123`);
    });
  } catch (error) {
    console.error("❌ Error starting server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down gracefully...");
  pool.end().then(() => {
    console.log("Pool has ended");
    process.exit(0);
  });
});
