# Grammar Articles API Documentation

API này cung cấp các endpoint để quản lý và truy xuất các bài viết ngữ pháp tiếng Anh.

## Base URL

```
/api/grammar
```

## Endpoints

### 📚 Public Endpoints (Không cần authentication)

#### 1. Lấy tất cả bài viết ngữ pháp

```
GET /api/grammar
```

**Query Parameters:**

- `page` (number, optional): Số trang, mặc định là 1
- `limit` (number, optional): Số bài viết mỗi trang, mặc định là 10, tối đa 50
- `difficulty` (string, optional): Lọc theo độ khó (`beginner`, `intermediate`, `advanced`)
- `category` (string, optional): Lọc theo danh mục
- `search` (string, optional): Tìm kiếm trong tiêu đề và nội dung

**Response:**

```json
{
  "status": 200,
  "message": "Lấy danh sách bài viết ngữ pháp thành công",
  "data": {
    "articles": [
      {
        "id": 1,
        "title": "Present Simple Tense",
        "content": "Present Simple là thì hiện tại đơn...",
        "difficulty_level": "beginner",
        "category": "Tenses",
        "tags": ["present simple", "basic grammar", "tenses"],
        "reading_time": 5,
        "view_count": 120,
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_items": 45,
      "items_per_page": 10
    }
  }
}
```

#### 2. Lấy bài viết theo ID

```
GET /api/grammar/:id
```

**Response:**

```json
{
  "status": 200,
  "message": "Lấy bài viết ngữ pháp thành công",
  "data": {
    "article": {
      "id": 1,
      "title": "Present Simple Tense",
      "content": "Present Simple là thì hiện tại đơn...",
      "difficulty_level": "beginner",
      "category": "Tenses",
      "tags": ["present simple", "basic grammar", "tenses"],
      "reading_time": 5,
      "view_count": 121,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

#### 3. Lấy bài viết theo danh mục

```
GET /api/grammar/category/:category
```

**Query Parameters:**

- `page` (number, optional): Số trang
- `limit` (number, optional): Số bài viết mỗi trang

**Example:**

```
GET /api/grammar/category/Tenses?page=1&limit=5
```

#### 4. Lấy bài viết theo độ khó

```
GET /api/grammar/difficulty/:difficulty
```

**Difficulty levels:** `beginner`, `intermediate`, `advanced`

**Query Parameters:**

- `page` (number, optional): Số trang
- `limit` (number, optional): Số bài viết mỗi trang

**Example:**

```
GET /api/grammar/difficulty/beginner?page=1&limit=10
```

#### 5. Tìm kiếm bài viết

```
GET /api/grammar/search?keyword=present
```

**Query Parameters:**

- `keyword` (string, required): Từ khóa tìm kiếm
- `page` (number, optional): Số trang
- `limit` (number, optional): Số bài viết mỗi trang

#### 6. Lấy danh sách danh mục

```
GET /api/grammar/categories
```

**Response:**

```json
{
  "status": 200,
  "message": "Lấy danh sách danh mục thành công",
  "data": {
    "categories": ["Tenses", "Modal Verbs", "Conditionals", "Passive Voice"]
  }
}
```

#### 7. Lấy bài viết phổ biến

```
GET /api/grammar/popular?limit=5
```

**Query Parameters:**

- `limit` (number, optional): Số bài viết, mặc định là 5, tối đa 20

---

### 🔐 Admin Endpoints (Cần quyền admin)

#### 8. Tạo bài viết mới

```
POST /api/grammar
```

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**

```json
{
  "title": "Future Perfect Tense",
  "content": "Future Perfect là thì tương lai hoàn thành...",
  "difficulty_level": "intermediate",
  "category": "Tenses",
  "tags": ["future perfect", "tenses", "intermediate"],
  "reading_time": 8,
  "is_published": true
}
```

#### 9. Cập nhật bài viết

```
PUT /api/grammar/:id
```

**Headers:**

```
Authorization: Bearer <admin_token>
Content-Type: application/json
```

**Body:**

```json
{
  "title": "Future Perfect Tense (Updated)",
  "content": "Future Perfect là thì tương lai hoàn thành...",
  "difficulty_level": "intermediate",
  "category": "Tenses",
  "tags": ["future perfect", "tenses", "intermediate"],
  "reading_time": 8,
  "is_published": true
}
```

#### 10. Xóa bài viết

```
DELETE /api/grammar/:id
```

**Headers:**

```
Authorization: Bearer <admin_token>
```

---

## Error Responses

### 400 Bad Request

```json
{
  "status": 400,
  "message": "ID bài viết không hợp lệ"
}
```

### 401 Unauthorized

```json
{
  "status": 401,
  "message": "Xác thức không hợp lệ"
}
```

### 403 Forbidden

```json
{
  "status": 403,
  "message": "Không có quyền truy cập. Yêu cầu quyền quản trị viên."
}
```

### 404 Not Found

```json
{
  "status": 404,
  "message": "Không tìm thấy bài viết ngữ pháp"
}
```

### 500 Internal Server Error

```json
{
  "status": 500,
  "message": "Lỗi server khi lấy danh sách bài viết ngữ pháp"
}
```

---

## Database Setup

Để sử dụng API này, bạn cần chạy script SQL sau để tạo bảng trong database:

```sql
-- Chạy file này trước tiên
psql -d your_database < database/grammar_articles_table.sql
```

Hoặc chạy manual:

```sql
-- Xem nội dung trong file database/grammar_articles_table.sql
```

---

## Examples

### Lấy tất cả bài viết level beginner

```bash
curl "http://localhost:3000/api/grammar?difficulty=beginner&page=1&limit=5"
```

### Tìm kiếm bài viết về "present"

```bash
curl "http://localhost:3000/api/grammar/search?keyword=present&page=1&limit=10"
```

### Tạo bài viết mới (cần admin token)

```bash
curl -X POST "http://localhost:3000/api/grammar" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Passive Voice",
    "content": "Passive Voice được sử dụng khi...",
    "difficulty_level": "intermediate",
    "category": "Grammar Structures",
    "tags": ["passive voice", "grammar"],
    "reading_time": 10
  }'
```
