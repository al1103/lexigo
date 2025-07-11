# Lexigo Admin Dashboard

AdminJS dashboard để quản lý hệ thống Lexigo Learning Platform.

## 🚀 Cài đặt và khởi chạy

### 1. Cài đặt dependencies

```bash
npm install adminjs @adminjs/express @adminjs/sql @adminjs/upload bcrypt express-session
```

### 2. Thiết lập admin user đầu tiên

```bash
npm run setup:admin
```

Lệnh này sẽ tạo admin user với thông tin mặc định:

- **Email**: admin@lexigo.com
- **Password**: admin123
- **Role**: admin

### 3. Khởi chạy server

```bash
npm start
# hoặc
npm run dev
```

### 4. Truy cập Admin Dashboard

Mở trình duyệt và truy cập:

```
http://localhost:9999/admin
```

## 📊 Tính năng Admin Dashboard

### User Management

- ✅ Quản lý danh sách users
- ✅ Phân quyền admin/customer
- ✅ Reset password cho users
- ✅ Xem thống kê users
- ✅ Export danh sách users

### Learning System

- ✅ Quản lý levels (cấp độ học)
- ✅ Quản lý từ vựng (words)
- ✅ Quản lý danh mục (categories)
- ✅ Phân loại theo độ khó
- ✅ Upload audio/hình ảnh

### Quiz Management

- ✅ Quản lý quiz sessions
- ✅ Quản lý questions và options
- ✅ Theo dõi điểm số và kết quả
- ✅ Thống kê completion rate

### Speaking Management

- ✅ Quản lý speaking sessions
- ✅ Quản lý kết quả phát âm
- ✅ Xem feedback và scores
- ✅ Thống kê speaking performance

### Content Management

- ✅ Quản lý quotes (quote of the day)
- ✅ Upload và quản lý files
- ✅ Quản lý nội dung hệ thống

### Analytics & Rankings

- ✅ Xem user statistics
- ✅ Theo dõi points và rankings
- ✅ Phân tích user activity
- ✅ Export báo cáo

## 🔧 Custom Actions

### Export Data

- Xuất dữ liệu từ bất kỳ bảng nào sang file CSV
- Có thể lọc và tùy chỉnh dữ liệu xuất

### View Statistics

- Xem thống kê chi tiết cho mỗi module
- Biểu đồ và số liệu quan trọng
- Phân tích xu hướng

### Reset Password

- Reset password cho users (chỉ áp dụng cho bảng users)
- Tạo password mới tự động
- Thông báo password mới

### Bulk Delete

- Xóa nhiều records cùng lúc
- Có xác nhận trước khi xóa
- Áp dụng cho tất cả bảng

## 🛡️ Bảo mật

### Authentication

- Chỉ users có role 'admin' mới được truy cập
- Session-based authentication
- Secure cookie configuration

### Authorization

- Phân quyền theo role
- Một số actions chỉ dành cho admin
- Validation dữ liệu đầu vào

### Data Protection

- Password được hash bằng bcrypt
- Ẩn sensitive fields trong list view
- Validation cho email và required fields

## 📁 Cấu trúc Files

```
admin/
├── adminjs.config.js    # Cấu hình chính AdminJS
├── actions.js           # Custom actions
└── README.md           # Tài liệu hướng dẫn

scripts/
└── setupAdmin.js       # Script tạo admin user

package.json            # Thêm script setup:admin
index.js               # Tích hợp AdminJS vào main server
```

## 🔧 Cấu hình Environment Variables

Thêm vào file `.env`:

```env
# AdminJS Configuration
ADMIN_COOKIE_SECRET=your-secret-cookie-password-here
ADMIN_SESSION_SECRET=your-secret-session-key-here

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/lexigo

# Server
PORT=9999
NODE_ENV=development
```

## 📋 Database Tables được quản lý

1. **users** - Quản lý người dùng
2. **levels** - Cấp độ học tập
3. **words** - Từ vựng
4. **categories** - Danh mục từ vựng
5. **quotes** - Quote of the day
6. **quiz_sessions** - Phiên quiz
7. **questions** - Câu hỏi quiz
8. **speaking_sessions** - Phiên speaking
9. **speaking_results** - Kết quả speaking
10. **bookmarks** - Bookmark từ vựng
11. **user_stats** - Thống kê người dùng

## 🚨 Troubleshooting

### Lỗi kết nối database

```bash
# Kiểm tra PostgreSQL có chạy không
sudo service postgresql status

# Kiểm tra connection string trong .env
echo $DATABASE_URL
```

### Lỗi authentication

```bash
# Tạo lại admin user
npm run setup:admin

# Kiểm tra role trong database
psql -d lexigo -c "SELECT email, role FROM users WHERE role = 'admin';"
```

### Lỗi dependencies

```bash
# Cài đặt lại dependencies
npm install

# Clear cache
npm cache clean --force
```

## 📞 Hỗ trợ

Nếu gặp vấn đề, vui lòng:

1. Kiểm tra logs trong console
2. Verify database connection
3. Đảm bảo có admin user trong database
4. Kiểm tra environment variables

## 🔄 Updates

Để cập nhật AdminJS:

```bash
npm update adminjs @adminjs/express @adminjs/sql
```

Sau khi cập nhật, khởi động lại server:

```bash
npm restart
```
