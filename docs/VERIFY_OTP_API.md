# API Xác Thực OTP (Verify OTP)

API tổng quát để xác thực mã OTP/verification code cho nhiều mục đích khác nhau.

## Endpoint

**POST** `/api/users/verify-otp`

## Mục đích sử dụng

- ✅ Xác thực đăng ký tài khoản
- ✅ Xác thực quên mật khẩu
- ✅ Xác thức OTP tổng quát
- ✅ Kiểm tra mã xác nhận còn hiệu lực

## Request

### Request Body:

```json
{
  "email": "user@example.com",
  "code": "123456",
  "type": "registration"
}
```

### Parameters:

- **email** (string, required): Email nhận mã OTP
- **code** (string, required): Mã OTP 6 chữ số
- **type** (string, optional): Loại xác thực
  - `"registration"` - Đăng ký tài khoản
  - `"password_reset"` - Đặt lại mật khẩu
  - `"general"` - Xác thực tổng quát (default)

## Response

### Response thành công (200):

```json
{
  "status": 200,
  "message": "Mã OTP đã được xác thực thành công",
  "data": {
    "email": "user@example.com",
    "type": "registration",
    "verified": true,
    "verifiedAt": "2024-01-15T10:30:00.000Z",
    "userData": {
      "username": "testuser",
      "email": "user@example.com",
      "fullName": "Test User",
      "password": "[HIDDEN]"
    }
  }
}
```

### Response lỗi:

#### 400 - Bad Request:

```json
{
  "status": 400,
  "message": "Email là bắt buộc"
}
```

```json
{
  "status": 400,
  "message": "Mã OTP là bắt buộc"
}
```

```json
{
  "status": 400,
  "message": "Mã OTP không chính xác hoặc đã hết hạn"
}
```

#### 500 - Server Error:

```json
{
  "status": 500,
  "message": "Đã xảy ra lỗi trong quá trình xác thực OTP",
  "error": "Chi tiết lỗi..."
}
```

## Sự khác biệt với các API khác

### So với `/verify-registration`:

- **verify-otp**: Chỉ xác thực mã, **không tạo tài khoản**
- **verify-registration**: Xác thực mã **và tạo tài khoản** luôn

### So với `/reset-password`:

- **verify-otp**: Chỉ xác thực mã, **không thay đổi mật khẩu**
- **reset-password**: Xác thực mã **và cập nhật mật khẩu** luôn

## Quy trình sử dụng

### 1. Xác thực đăng ký:

```bash
POST /api/users/register
# Gửi mã qua email

POST /api/users/verify-otp
{
  "email": "user@example.com",
  "code": "123456",
  "type": "registration"
}
# Chỉ xác thực, chưa tạo tài khoản

POST /api/users/verify-registration
# Tạo tài khoản sau khi xác thực OTP
```

### 2. Xác thực quên mật khẩu:

```bash
POST /api/users/forgot-password
# Gửi mã qua email

POST /api/users/verify-otp
{
  "email": "user@example.com",
  "code": "123456",
  "type": "password_reset"
}
# Chỉ xác thực, chưa đổi mật khẩu

POST /api/users/reset-password
# Đổi mật khẩu sau khi xác thực OTP
```

### 3. Xác thực tổng quát:

```bash
# Gửi OTP qua email (từ endpoint khác)

POST /api/users/verify-otp
{
  "email": "user@example.com",
  "code": "123456",
  "type": "general"
}
# Chỉ kiểm tra mã có hợp lệ không
```

## Đặc điểm kỹ thuật

### Bảo mật:

- ✅ Tự động detect tên column database (`expiration_time` / `expires_at`)
- ✅ Kiểm tra thời gian hết hạn của mã
- ✅ Ẩn password trong response (`"[HIDDEN]"`)
- ✅ Log chi tiết để debug
- ✅ Validation đầu vào chặt chẽ

### Tương thích:

- ✅ Hoạt động với mọi cấu trúc bảng `verification_codes`
- ✅ Parse được `user_data` dạng string hoặc JSON
- ✅ Detect `type` từ data hoặc request
- ✅ Fallback graceful khi thiếu data

### Response data:

- **userData**: Chỉ trả về khi `type !== 'password_reset'` (bảo mật)
- **type**: Ưu tiên từ database, fallback từ request
- **verifiedAt**: Timestamp xác thực thành công

## Examples

### Test với curl:

```bash
# Test OTP đăng ký
curl -X POST http://localhost:3000/api/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "type": "registration"
  }'

# Test OTP quên mật khẩu
curl -X POST http://localhost:3000/api/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "code": "123456",
    "type": "password_reset"
  }'
```

### Test với JavaScript:

```javascript
const response = await fetch("/api/users/verify-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: "test@example.com",
    code: "123456",
    type: "registration",
  }),
});

const result = await response.json();
if (result.status === 200) {
  console.log("OTP verified:", result.data);
} else {
  console.log("Error:", result.message);
}
```

## Lưu ý quan trọng

1. **Không tự động xóa mã**: API này chỉ xác thực, không xóa mã khỏi database
2. **Không thực hiện hành động**: Chỉ xác thực, không tạo user hay đổi password
3. **Tương thích cũ**: Vẫn hoạt động với `/verify-registration` và `/reset-password`
4. **Bảo mật cao**: Ẩn sensitive data trong response
