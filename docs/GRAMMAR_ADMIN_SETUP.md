# Grammar Articles Admin Setup Guide

## 📋 Tổng quan

Hệ thống quản lý bài viết ngữ pháp tiếng Anh cho phép admin tạo, chỉnh sửa, và quản lý các bài viết ngữ pháp với giao diện web thân thiện.

## 🚀 Cài đặt

### 1. Setup Database

Chạy script để tạo bảng và dữ liệu mẫu:

```bash
node scripts/setupGrammarArticles.js
```

Hoặc chạy manual SQL:

```bash
psql -d your_database < database/grammar_articles_table.sql
```

### 2. Restart Server

Restart server để load routes mới:

```bash
npm run dev
# hoặc
nodemon
```

## 🎯 Tính năng

### 📱 Public API (không cần authentication)

- **GET** `/api/grammar` - Lấy tất cả bài viết (có phân trang, lọc, tìm kiếm)
- **GET** `/api/grammar/:id` - Lấy bài viết theo ID
- **GET** `/api/grammar/category/:category` - Lấy bài viết theo danh mục
- **GET** `/api/grammar/difficulty/:difficulty` - Lấy bài viết theo độ khó
- **GET** `/api/grammar/search?keyword=...` - Tìm kiếm bài viết
- **GET** `/api/grammar/categories` - Lấy danh sách danh mục
- **GET** `/api/grammar/popular` - Lấy bài viết phổ biến

### 🔐 Admin Interface (cần quyền admin)

- **Danh sách bài viết**: `/admin/grammar`

  - Xem tất cả bài viết
  - Lọc theo độ khó, danh mục
  - Tìm kiếm bài viết
  - Phân trang
  - Preview bài viết
  - Xóa bài viết

- **Thêm bài viết**: `/admin/grammar/add`

  - Form đầy đủ với validation
  - Preview real-time
  - Word counter
  - Auto-suggest reading time
  - Tag management

- **Chỉnh sửa bài viết**: `/admin/grammar/:id/edit`
  - Form pre-filled
  - Thông tin meta (views, created date)
  - Preview trước khi save

### 🔐 Admin API (cần quyền admin)

- **POST** `/api/grammar` - Tạo bài viết mới
- **PUT** `/api/grammar/:id` - Cập nhật bài viết
- **DELETE** `/api/grammar/:id` - Xóa bài viết

## 📊 Cấu trúc dữ liệu

```sql
CREATE TABLE grammar_articles (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced
    category VARCHAR(100), -- Tenses, Modal Verbs, etc.
    tags TEXT[], -- Array of tags
    reading_time INTEGER, -- Estimated reading time in minutes
    is_published BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🎨 Giao diện Admin

### Dashboard

- Thống kê tổng số bài viết
- Quick action để truy cập Grammar Articles
- Card hiển thị số lượng bài viết đã publish

### Grammar Management

- **Sidebar Menu**: "Grammar Articles" với icon spell-check
- **Responsive Design**: Tương thích mobile và desktop
- **Filtering**: Dropdown cho difficulty và category
- **Search**: Tìm kiếm real-time
- **Table View**: Hiển thị thông tin quan trọng
  - ID, Title, Category, Difficulty
  - Reading time, Views, Status
  - Actions (Edit, Preview, Delete)

### Add/Edit Forms

- **Rich Editor**: Hỗ trợ Markdown formatting
- **Live Preview**: Xem trước bài viết
- **Statistics**: Word count, character count, estimated reading time
- **Writing Tips**: Sidebar với hướng dẫn viết
- **Tag System**: Nhập tags phân cách bằng dấu phẩy
- **Category Datalist**: Gợi ý category có sẵn

## 📱 API Usage Examples

### Lấy tất cả bài viết

```bash
curl "http://localhost:3000/api/grammar?page=1&limit=10"
```

### Lọc theo độ khó

```bash
curl "http://localhost:3000/api/grammar?difficulty=beginner"
```

### Tìm kiếm

```bash
curl "http://localhost:3000/api/grammar/search?keyword=present"
```

### Tạo bài viết mới (cần admin token)

```bash
curl -X POST "http://localhost:3000/api/grammar" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Future Perfect Tense",
    "content": "Detailed explanation...",
    "difficulty_level": "intermediate",
    "category": "Tenses",
    "tags": ["future perfect", "tenses"],
    "reading_time": 8
  }'
```

## 🛠️ Quản lý

### Truy cập Admin

1. Đăng nhập với tài khoản admin: `/admin/login`
2. Truy cập Grammar Management: `/admin/grammar`

### Tạo bài viết mới

1. Click "Add New Article" trên `/admin/grammar`
2. Điền form với thông tin:
   - **Title**: Tiêu đề bài viết (required)
   - **Content**: Nội dung bài viết, hỗ trợ Markdown (required)
   - **Difficulty**: beginner/intermediate/advanced (required)
   - **Category**: Danh mục (optional)
   - **Tags**: Nhập phân cách bằng dấu phẩy (optional)
   - **Reading Time**: Thời gian đọc ước tính (optional, auto-calculated)
   - **Published**: Checkbox để publish ngay (default: checked)
3. Sử dụng "Preview" để xem trước
4. Click "Save Article"

### Chỉnh sửa bài viết

1. Trong danh sách, click icon "Edit" (pencil)
2. Chỉnh sửa thông tin
3. Click "Update Article"

### Xóa bài viết

1. Trong danh sách, click icon "Delete" (trash)
2. Confirm trong popup
3. Bài viết sẽ bị xóa vĩnh viễn

## 🎯 Best Practices

### Viết nội dung

- Sử dụng Markdown formatting cho tiêu đề và nhấn mạnh
- Bắt đầu với giải thích rõ ràng
- Bao gồm ví dụ và cách sử dụng
- Sử dụng ngôn ngữ đơn giản, dễ hiểu

### Phân loại

- **Beginner**: Ngữ pháp cơ bản (Present Simple, Past Simple...)
- **Intermediate**: Cấu trúc phức tạp (Past Continuous, Passive Voice...)
- **Advanced**: Sử dụng tinh tế (Conditionals, Modal Verbs...)

### Tags

- Sử dụng tags phù hợp để dễ tìm kiếm
- Bao gồm tên thì/cấu trúc ngữ pháp
- Thêm level như "basic grammar", "intermediate grammar"

### Categories

- Sử dụng categories nhất quán: "Tenses", "Modal Verbs", "Conditionals"
- Tạo category mới khi cần thiết
- Giữ tên category ngắn gọn và rõ ràng

## 🔍 Troubleshooting

### Lỗi database

```bash
# Kiểm tra table có tồn tại không
psql -d your_database -c "\dt grammar_articles"

# Tạo lại table nếu cần
node scripts/setupGrammarArticles.js
```

### Lỗi permission

- Đảm bảo tài khoản có role "admin"
- Kiểm tra JWT token hợp lệ

### Lỗi routes

- Restart server sau khi thêm routes mới
- Kiểm tra routes đã được import đúng trong `routes/index.js`

## 🚀 Deployment

### Production checklist

1. ✅ Database table created
2. ✅ Sample data inserted
3. ✅ Routes configured
4. ✅ Admin permissions set
5. ✅ Server restarted

### Monitoring

- Check admin dashboard stats
- Monitor API response times
- Track article view counts
- Review user feedback

## 📚 Documentation

- **API Documentation**: `docs/GRAMMAR_API.md`
- **Database Schema**: `database/grammar_articles_table.sql`
- **Setup Script**: `scripts/setupGrammarArticles.js`

---

🎉 **Hoàn tất!** Grammar Articles Admin đã sẵn sàng sử dụng!
