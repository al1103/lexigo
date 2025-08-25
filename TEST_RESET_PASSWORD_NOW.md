# 🚀 TEST RESET PASSWORD NGAY BÂY GIỜ

## ✅ Đã sửa code backend - Thêm detailed logging

Code backend đã được cập nhật để log chi tiết request nhận được. Bây giờ test lại!

---

## 🧪 OPTION 1: Quick Test Script

```bash
node utils/quickDebugResetPassword.js
```

Script này sẽ:

- ✅ Test request với format đúng
- ✅ Show detailed error analysis
- ✅ Hướng dẫn lấy OTP thật
- ✅ Show debug checklist

---

## 🧪 OPTION 2: Manual Test với Curl

### Bước 1: Gửi forgot password để lấy OTP

```bash
curl -X POST http://localhost:3000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"chube2609@gmail.com"}'
```

### Bước 2: Check BACKEND CONSOLE để lấy OTP

Tìm dòng như: `Verification code 123456 for chube2609@gmail.com`

### Bước 3: Reset password với OTP thật

```bash
curl -X POST http://localhost:3000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "chube2609@gmail.com",
    "code": "123456",
    "newPassword": "Zilong2609@"
  }'
```

---

## 🧪 OPTION 3: JavaScript Test

```javascript
const axios = require("axios");

// Test function
async function testResetPassword(otpCode) {
  try {
    const response = await axios.post(
      "http://localhost:3000/api/users/reset-password",
      {
        email: "chube2609@gmail.com",
        code: otpCode, // OTP từ backend console
        newPassword: "Zilong2609@",
      }
    );
    console.log("✅ Success:", response.data);
  } catch (error) {
    console.log("❌ Error:", error.response?.data);
  }
}

// Gọi với OTP thật
testResetPassword("123456"); // Thay 123456 bằng OTP từ console
```

---

## 🔍 BACKEND LOGGING MỚI

Backend giờ sẽ log chi tiết:

```
🔍 Reset Password Request: {
  body: { email: '...', code: '...', newPassword: '...' },
  email: '...',
  code: '...',
  newPassword: '...',
  new_password: '...', // Để debug field name sai
  headers: 'application/json'
}

🔍 Extracted values: { email, code, newPassword }

❌ Missing fields check: {
  emailMissing: false,
  codeMissing: true,  // Nếu thiếu
  newPasswordMissing: false
}
```

---

## 🎯 EXPECTED RESULTS

### ✅ Nếu OTP đúng:

```json
{
  "status": "200",
  "message": "Mật khẩu đã được cập nhật thành công"
}
```

### ❌ Nếu thiếu thông tin:

```json
{
  "status": 400,
  "message": "Thiếu thông tin cần thiết"
}
```

- Backend logs sẽ show field nào bị thiếu

### ❌ Nếu OTP sai:

```json
{
  "status": 400,
  "message": "Mã OTP không chính xác hoặc đã hết hạn"
}
```

---

## 📋 TROUBLESHOOTING

### 1. **Nếu không thấy backend logs:**

- ✅ Server có đang chạy không?
- ✅ Request có đến đúng endpoint không?
- ✅ Check network/firewall

### 2. **Nếu thấy "Missing fields check":**

- ✅ So sánh request sent vs received trong logs
- ✅ Check Content-Type header
- ✅ Check JSON format

### 3. **Nếu OTP sai:**

- ✅ Lấy OTP mới từ forgot-password
- ✅ Copy chính xác từ console logs
- ✅ Test ngay, đừng đợi lâu (15 phút expire)

### 4. **Nếu email không tồn tại:**

- ✅ Email phải có trong database users table
- ✅ Hoặc đăng ký tài khoản trước
- ✅ Hoặc dùng email khác để test

---

## 🔥 RUN TEST NGAY!

```bash
# Method 1: Script tự động
node utils/quickDebugResetPassword.js

# Method 2: Manual debug
node utils/debugResetPassword.js

# Method 3: Full test suite
node utils/testForgotPasswordWithOTP.js
```

---

## 💡 NEXT STEPS

1. **Chạy test script** → Xem backend logs
2. **Identify exact issue** từ logs
3. **Fix request format** nếu cần
4. **Test với OTP thật**
5. **Verify login** với password mới

**🎯 Backend logs sẽ tell us exactly what's wrong!**
