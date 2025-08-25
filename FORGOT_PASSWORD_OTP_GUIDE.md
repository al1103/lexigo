# 🔑 Hướng Dẫn Xác Nhận OTP Cho Quên Mật Khẩu

## 🚀 Quy Trình Mới (3 Bước)

### 1. **Gửi OTP** → `POST /api/users/forgot-password`

```json
{
  "email": "user@example.com"
}
```

### 2. **Xác nhận OTP** → `POST /api/users/verify-otp` ⭐ **MỚI**

```json
{
  "email": "user@example.com",
  "code": "123456",
  "type": "password_reset"
}
```

**✅ Response thành công:**

```json
{
  "status": 200,
  "message": "Mã OTP đã được xác thực thành công",
  "data": {
    "email": "user@example.com",
    "type": "password_reset",
    "verified": true,
    "verifiedAt": "2024-01-15T10:30:00.000Z"
    // 🔒 Không có userData (bảo mật)
  }
}
```

### 3. **Đổi mật khẩu** → `POST /api/users/reset-password`

```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

---

## 🎯 Lợi Ích Của Quy Trình Mới

| Trước                                | Sau                                       |
| ------------------------------------ | ----------------------------------------- |
| Gửi OTP → Đổi password luôn          | Gửi OTP → **Xác nhận OTP** → Đổi password |
| User không biết OTP đúng chưa        | **User biết OTP đúng trước**              |
| UX kém: Nhập sai phải làm lại từ đầu | **UX tốt**: Feedback tức thì              |

### **Cho Frontend Developer:**

- 🎯 **Better UX**: Hiển thị "OTP hợp lệ" trước khi user nhập password mới
- 🔄 **Progressive**: Show form password chỉ khi OTP đúng
- 📱 **Mobile-friendly**: Tránh user phải re-type nhiều lần

### **Cho Backend:**

- 🛡️ **Security**: Tách biệt logic verify và reset
- 📊 **Logging**: Track riêng verify và reset actions
- 🔧 **Debugging**: Debug từng bước độc lập

---

## 🧪 Test Ngay

### **Option 1: Quick Test**

```bash
node utils/quickTestForgotPasswordOTP.js
```

### **Option 2: Full Test Suite**

```bash
node utils/testForgotPasswordWithOTP.js
```

### **Option 3: Visual Demo**

Mở file: `examples/forgotPasswordWithOTP.html` trong browser

### **Option 4: Manual Test với Curl**

```bash
# 1. Gửi OTP
curl -X POST http://localhost:3000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Verify OTP (lấy mã từ console server)
curl -X POST http://localhost:3000/api/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456","type":"password_reset"}'

# 3. Reset password
curl -X POST http://localhost:3000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","code":"123456","newPassword":"newpass123"}'
```

---

## 🔒 Đặc Điểm Bảo Mật

- ✅ **No Sensitive Data**: `/verify-otp` không trả userData cho `password_reset`
- ✅ **Double Check**: OTP được verify 2 lần (trong verify-otp và reset-password)
- ✅ **Expiration**: Mã OTP có thể hết hạn giữa các bước
- ✅ **Column Detection**: Tự động detect database schema

---

## 📱 Frontend Implementation

### **React Example:**

```jsx
const [step, setStep] = useState("email"); // email, otp, password
const [otpVerified, setOtpVerified] = useState(false);

// Step 1: Send OTP
const handleSendOtp = async () => {
  await fetch("/api/users/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  setStep("otp");
};

// Step 2: Verify OTP
const handleVerifyOtp = async () => {
  const response = await fetch("/api/users/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: otp, type: "password_reset" }),
  });

  if (response.ok) {
    setOtpVerified(true);
    setStep("password"); // Show password form
  }
};

// Step 3: Reset password
const handleResetPassword = async (newPassword) => {
  await fetch("/api/users/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: otp, newPassword }),
  });
};
```

### **Vanilla JS Example:**

```javascript
// Step 2: Verify OTP
const verifyOTP = async () => {
  const response = await fetch("/api/users/verify-otp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: userEmail,
      code: otpCode,
      type: "password_reset",
    }),
  });

  if (response.ok) {
    showMessage("OTP hợp lệ! Có thể nhập mật khẩu mới.", "success");
    showPasswordForm(); // Enable password input
  }
};
```

---

## 📚 Tài Liệu Chi Tiết

- 📖 **API Docs**: `docs/FORGOT_PASSWORD_WITH_OTP_VERIFICATION.md`
- 🧪 **Test Suite**: `utils/testForgotPasswordWithOTP.js`
- ⚡ **Quick Test**: `utils/quickTestForgotPasswordOTP.js`
- 🎨 **Visual Demo**: `examples/forgotPasswordWithOTP.html`
- 🔧 **Database Fix**: `utils/quickFixDatabase.js`

---

## 🔄 So Sánh API

| Endpoint               | Mục đích           | Action                    |
| ---------------------- | ------------------ | ------------------------- |
| `/forgot-password`     | Gửi OTP            | Gửi email                 |
| `/verify-otp` ⭐       | **Chỉ verify OTP** | **Không làm gì thêm**     |
| `/reset-password`      | Đổi password       | Verify OTP + Đổi password |
| `/verify-registration` | Tạo tài khoản      | Verify OTP + Tạo user     |

---

## 🎉 Kết Luận

**🔥 Endpoint `/verify-otp` mang lại:**

- ✅ **Better UX**: User feedback tức thì
- ✅ **Better Security**: Logic tách biệt
- ✅ **Better Control**: Frontend kiểm soát flow
- ✅ **Better Debug**: Dễ debug từng bước

**🚀 Sẵn sàng sử dụng trong production!**

---

## 🆘 Troubleshooting

**Lỗi thường gặp:**

1. **"column expiration_time does not exist"**

   ```bash
   node utils/quickFixDatabase.js
   ```

2. **"Mã OTP không chính xác hoặc đã hết hạn"**

   - Check OTP từ console server
   - Check email đúng chưa
   - Check thời gian (15 phút)

3. **"Email không tồn tại"**
   - Thay testEmail bằng email có trong DB
   - Hoặc tạo user test trước

**📞 Need help? Check console logs cho chi tiết!**
