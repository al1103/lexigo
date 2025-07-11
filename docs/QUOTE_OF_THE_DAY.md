# Quote of the Day API

Tính năng "Quote of the Day" cung cấp các câu trích dẫn hay và ý nghĩa để truyền cảm hứng cho người học.

## Tính năng chính

### 📅 Quote of the Day

- Mỗi ngày sẽ có một quote đặc biệt
- Quote được chọn ngẫu nhiên nhưng ổn định trong ngày
- Phù hợp cho trang chủ hoặc dashboard

### 🎯 Phân loại theo Category

- `motivation` - Động lực
- `education` - Giáo dục
- `success` - Thành công
- `life` - Cuộc sống
- `dreams` - Ước mơ
- `friendship` - Tình bạn
- `love` - Tình yêu
- `time` - Thời gian
- `goals` - Mục tiêu

### 🌍 Hỗ trợ đa ngôn ngữ

- `en` - Tiếng Anh
- `vi` - Tiếng Việt (có thể mở rộng)

### 📊 Phân cấp độ khó

- `beginner` - Cơ bản
- `intermediate` - Trung bình
- `advanced` - Nâng cao

## API Endpoints

### Public Endpoints (không cần đăng nhập)

#### Lấy Quote of the Day

```
GET /api/quotes/daily
```

Trả về quote đặc biệt của ngày hiện tại.

#### Lấy quote ngẫu nhiên

```
GET /api/quotes/random
GET /api/quotes/random?category=motivation
GET /api/quotes/random?language=en
```

#### Lấy tất cả quotes

```
GET /api/quotes
GET /api/quotes?category=education
GET /api/quotes?language=en
GET /api/quotes?search=success
```

#### Lấy quote theo ID

```
GET /api/quotes/:id
```

#### Lấy quotes theo category

```
GET /api/quotes/category/:category
```

#### Lấy quotes theo ngôn ngữ

```
GET /api/quotes/language/:language
```

#### Tìm kiếm quotes

```
GET /api/quotes/search?q=motivation
```

#### Lấy danh sách categories

```
GET /api/quotes/categories
```

### Protected Endpoints (cần đăng nhập)

#### Tạo quote mới (Admin/Teacher)

```
POST /api/quotes
Content-Type: application/json

{
  "content": "Your quote content here",
  "author": "Author Name",
  "category": "motivation",
  "language": "en",
  "difficulty_level": "intermediate"
}
```

#### Cập nhật quote (Admin/Teacher)

```
PUT /api/quotes/:id
Content-Type: application/json

{
  "content": "Updated quote content",
  "author": "Author Name",
  "category": "education",
  "language": "en",
  "difficulty_level": "advanced"
}
```

#### Xóa quote (Admin only)

```
DELETE /api/quotes/:id
```

## Response Format

### Thành công

```json
{
  "status": 200,
  "message": "Lấy quote of the day thành công",
  "data": {
    "id": 1,
    "content": "The only way to do great work is to love what you do.",
    "author": "Steve Jobs",
    "category": "motivation",
    "language": "en",
    "difficulty_level": "intermediate",
    "created_at": "2023-01-01T00:00:00.000Z"
  }
}
```

### Lỗi

```json
{
  "status": 404,
  "message": "Không tìm thấy quote nào",
  "error": true
}
```

## Cài đặt và sử dụng

### 1. Chạy migration để tạo bảng

```bash
node utils/setupQuotes.js
```

### 2. Khởi động server

```bash
npm run dev
```

### 3. Test API

```bash
# Lấy quote of the day
curl http://localhost:3000/api/quotes/daily

# Lấy quote ngẫu nhiên
curl http://localhost:3000/api/quotes/random

# Lấy tất cả quotes
curl http://localhost:3000/api/quotes
```

## Tích hợp vào Frontend

### React/Vue Example

```javascript
// Lấy quote of the day
const getDailyQuote = async () => {
  try {
    const response = await fetch("/api/quotes/daily");
    const data = await response.json();

    if (data.status === 200) {
      return data.data;
    }
  } catch (error) {
    console.error("Error fetching daily quote:", error);
  }
};

// Component
const QuoteOfTheDay = () => {
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    getDailyQuote().then(setQuote);
  }, []);

  if (!quote) return <div>Loading...</div>;

  return (
    <div className="quote-card">
      <blockquote>"{quote.content}"</blockquote>
      <cite>- {quote.author}</cite>
      <div className="quote-meta">
        <span className="category">{quote.category}</span>
        <span className="level">{quote.difficulty_level}</span>
      </div>
    </div>
  );
};
```

### CSS Example

```css
.quote-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  margin: 1rem 0;
}

.quote-card blockquote {
  font-size: 1.2rem;
  font-style: italic;
  margin: 0 0 1rem 0;
  line-height: 1.6;
}

.quote-card cite {
  font-weight: bold;
  display: block;
  text-align: right;
  margin-bottom: 1rem;
}

.quote-meta {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  opacity: 0.8;
}

.quote-meta span {
  background: rgba(255, 255, 255, 0.2);
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
}
```

## Mở rộng

### Thêm tính năng mới

- **Bookmark quotes**: Cho phép user lưu quotes yêu thích
- **Share quotes**: Chia sẻ quotes lên social media
- **Quote của tuần/tháng**: Mở rộng từ daily quote
- **Vote system**: Cho phép user vote quotes hay nhất
- **Personalized quotes**: Gợi ý quotes dựa trên sở thích user

### Thêm ngôn ngữ mới

```sql
INSERT INTO quotes (content, author, category, language, difficulty_level) VALUES
('Thành công không phải là chìa khóa của hạnh phúc. Hạnh phúc là chìa khóa của thành công.', 'Albert Schweitzer', 'success', 'vi', 'intermediate');
```

### Performance optimization

- Cache daily quote trong Redis
- Index database cho search tốt hơn
- Paginate kết quả khi có nhiều quotes
