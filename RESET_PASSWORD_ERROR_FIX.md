# Fix Lỗi Reset Password API

## 🐛 Lỗi gặp phải:

```json
{
  "status": 400,
  "message": "Thiếu thông tin cần thiết"
}
```

**Request gửi (SAI):**

```json
{
  "email": "chube2609@gmail.com",
  "new_password": "Zilong2609@"
}
```

## ✅ Cách sửa:

### 1. **Quy trình đầy đủ (3 bước):**

#### **Bước 1: Gửi OTP**

```bash
curl -X POST http://localhost:3000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"chube2609@gmail.com"}'
```

#### **Bước 2: Lấy OTP từ console server**

- Check console server để lấy mã OTP (ví dụ: `123456`)
- Hoặc check email nếu đã cấu hình SMTP

#### **Bước 3: Reset password với đầy đủ thông tin**

```bash
curl -X POST http://localhost:3000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "chube2609@gmail.com",
    "code": "123456",
    "newPassword": "Zilong2609@"
  }'
```

### 2. **Sửa lỗi cụ thể:**

| Lỗi                          | Sửa                       |
| ---------------------------- | ------------------------- |
| Thiếu field `code`           | Thêm `"code": "123456"`   |
| Tên field sai `new_password` | Đổi thành `"newPassword"` |

### 3. **Frontend JavaScript fix:**

```javascript
// ❌ SAI - Thiếu code và tên field sai
const wrongRequest = {
  email: "chube2609@gmail.com",
  new_password: "Zilong2609@", // SAI
};

// ✅ ĐÚNG - Đầy đủ thông tin
const correctRequest = {
  email: "chube2609@gmail.com",
  code: "123456", // THÊM field này
  newPassword: "Zilong2609@", // SỬA tên field
};

const response = await fetch("/api/users/reset-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(correctRequest),
});
```

## 🔍 Validation chi tiết:

API `/reset-password` yêu cầu **3 fields bắt buộc**:

```javascript
const { email, code, newPassword } = req.body;

if (!email || !code || !newPassword) {
  return res.status(400).json({
    status: 400,
    message: "Thiếu thông tin cần thiết",
  });
}
```

## 🎯 Quy trình khuyến nghị:

### **Option 1: Quy trình mới (với verify-otp)**

```bash
# 1. Gửi OTP
POST /api/users/forgot-password
{"email": "chube2609@gmail.com"}

# 2. Verify OTP (optional - cho UX tốt hơn)
POST /api/users/verify-otp
{
  "email": "chube2609@gmail.com",
  "code": "123456",
  "type": "password_reset"
}

# 3. Reset password
POST /api/users/reset-password
{
  "email": "chube2609@gmail.com",
  "code": "123456",
  "newPassword": "Zilong2609@"
}
```

### **Option 2: Quy trình cũ (direct)**

```bash
# 1. Gửi OTP
POST /api/users/forgot-password
{"email": "chube2609@gmail.com"}

# 2. Reset password trực tiếp
POST /api/users/reset-password
{
  "email": "chube2609@gmail.com",
  "code": "123456",
  "newPassword": "Zilong2609@"
}
```

## 🧪 Test nhanh:

```bash
# Chạy script test để xem workflow đúng
node utils/quickTestForgotPasswordOTP.js

# Hoặc mở demo UI
# Mở file: examples/forgotPasswordWithOTP.html
```

## 📋 Checklist debug:

- ✅ Email đúng format và tồn tại trong DB
- ✅ Code OTP đúng (check console server)
- ✅ Field name: `newPassword` (không phải `new_password`)
- ✅ Mã OTP chưa hết hạn (15 phút)
- ✅ Đầy đủ 3 fields: email, code, newPassword

## 💡 Lưu ý:

- **OTP code** lấy từ console server (trong development)
- **Field naming** phải chính xác: `newPassword` không phải `new_password`
- **Thời gian hết hạn** OTP là 15 phút
- **Mật khẩu mới** phải ít nhất 6 ký tự
