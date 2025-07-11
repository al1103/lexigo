# Quote of the Day API

Tính năng "Quote of the Day" cung cấp một câu trích dẫn hay và ý nghĩa mỗi ngày để truyền cảm hứng cho người học.

## Tính năng chính

### 📅 Quote of the Day

- Mỗi ngày sẽ có một quote khác nhau
- Quote được chọn dựa trên ngày hiện tại làm seed
- Cùng một ngày sẽ luôn trả về cùng một quote
- Phù hợp cho trang chủ hoặc dashboard

## API Endpoint

### Lấy Quote of the Day

```
GET /api/quotes/daily
```

Trả về quote đặc biệt của ngày hiện tại.

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

## Cách hoạt động

### Thuật toán chọn quote

1. Lấy ngày hiện tại (YYYY-MM-DD)
2. Sử dụng hàm hash với ngày + ID quote làm seed
3. Sắp xếp theo giá trị hash và lấy quote đầu tiên
4. Nếu lỗi, fallback sang random

### Ưu điểm

- **Ổn định**: Cùng một ngày luôn có cùng quote
- **Đa dạng**: Mỗi ngày sẽ có quote khác nhau
- **Đơn giản**: Chỉ 1 endpoint duy nhất
- **Performance**: Query nhanh, ít resource

## Database Schema

```sql
CREATE TABLE quotes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    author VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    language VARCHAR(10) DEFAULT 'en',
    difficulty_level VARCHAR(20) DEFAULT 'intermediate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```
