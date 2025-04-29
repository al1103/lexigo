const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Đảm bảo thư mục uploads/temp tồn tại
const uploadDir = path.join(__dirname, "../uploads/temp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Cấu hình storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `img_${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Hàm kiểm tra loại file
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file hình ảnh!"), false);
  }
};

// Cấu hình multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // Giới hạn: 10MB
  },
});

module.exports = upload;
