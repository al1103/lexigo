# Quy Trình Quên Mật Khẩu Với Xác Nhận OTP

Hướng dẫn chi tiết sử dụng endpoint `/verify-otp` để xác nhận OTP trong quá trình quên mật khẩu.

## 🔄 Quy Trình Hoàn Chỉnh

### Bước 1: Gửi yêu cầu quên mật khẩu

```bash
POST /api/users/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response:**

```json
{
  "status": "200",
  "message": "Mã xác nhận đã được gửi đến email của bạn"
}
```

### Bước 2: Xác nhận OTP (KHÔNG đổi mật khẩu ngay)

```bash
POST /api/users/verify-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "type": "password_reset"
}
```

**Response thành công:**

```json
{
  "status": 200,
  "message": "Mã OTP đã được xác thực thành công",
  "data": {
    "email": "user@example.com",
    "type": "password_reset",
    "verified": true,
    "verifiedAt": "2024-01-15T10:30:00.000Z"
    // Không có userData vì type="password_reset" (bảo mật)
  }
}
```

**Response lỗi:**

```json
{
  "status": 400,
  "message": "Mã OTP không chính xác hoặc đã hết hạn"
}
```

### Bước 3: Đặt lại mật khẩu (sau khi OTP đã được xác nhận)

```bash
POST /api/users/reset-password
Content-Type: application/json

{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

**Response:**

```json
{
  "status": "200",
  "message": "Mật khẩu đã được cập nhật thành công"
}
```

---

## 🎯 Lợi Ích Của Quy Trình Này

### 1. **Tách biệt Logic**

- **Verify OTP**: Chỉ kiểm tra mã có đúng không
- **Reset Password**: Thực hiện đổi mật khẩu thật

### 2. **Better UX**

- Frontend có thể hiển thị trạng thái "OTP hợp lệ"
- User biết mã đúng trước khi nhập mật khẩu mới
- Có thể show form mật khẩu sau khi OTP valid

### 3. **Security**

- Không trả về userData nhạy cảm cho `password_reset`
- Kiểm tra OTP riêng biệt với việc đổi password
- Log riêng các bước để audit

### 4. **Frontend Workflow**

```javascript
// Step 1: Request forgot password
const forgotResponse = await fetch("/api/users/forgot-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: userEmail }),
});

// Step 2: Verify OTP first
const verifyResponse = await fetch("/api/users/verify-otp", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: userEmail,
    code: otpCode,
    type: "password_reset",
  }),
});

if (verifyResponse.ok) {
  // Show success message: "Mã OTP hợp lệ"
  // Enable password input form
  showPasswordResetForm();
} else {
  // Show error: "Mã OTP không đúng"
  showOtpError();
}

// Step 3: Reset password after OTP verified
const resetResponse = await fetch("/api/users/reset-password", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: userEmail,
    code: otpCode,
    newPassword: newPassword,
  }),
});
```

---

## 🧪 Test Examples

### Test với curl:

```bash
# 1. Request OTP
curl -X POST http://localhost:3000/api/users/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 2. Verify OTP (không đổi password)
curl -X POST http://localhost:3000/api/users/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "code":"123456",
    "type":"password_reset"
  }'

# 3. Reset password (sau khi OTP verified)
curl -X POST http://localhost:3000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "code":"123456",
    "newPassword":"newpass123"
  }'
```

### Test với Postman:

**Collection: Forgot Password with OTP Verification**

1. **Request 1: Send OTP**

   - Method: POST
   - URL: `{{baseUrl}}/api/users/forgot-password`
   - Body: `{"email":"{{testEmail}}"}`

2. **Request 2: Verify OTP**

   - Method: POST
   - URL: `{{baseUrl}}/api/users/verify-otp`
   - Body: `{"email":"{{testEmail}}","code":"{{otpCode}}","type":"password_reset"}`
   - Test: Check status = 200

3. **Request 3: Reset Password**
   - Method: POST
   - URL: `{{baseUrl}}/api/users/reset-password`
   - Body: `{"email":"{{testEmail}}","code":"{{otpCode}}","newPassword":"newpass123"}`

---

## 🔒 Đặc Điểm Bảo Mật

### 1. **Không trả userData**

```json
// Response của verify-otp với type="password_reset"
{
  "status": 200,
  "data": {
    "email": "user@example.com",
    "type": "password_reset",
    "verified": true,
    "verifiedAt": "2024-01-15T10:30:00.000Z"
    // Không có userData để bảo mật
  }
}
```

### 2. **Double Verification**

- OTP được verify 2 lần: trong `/verify-otp` và `/reset-password`
- Đảm bảo mã vẫn hợp lệ khi reset password

### 3. **Expire Check**

- Mã OTP có thể hết hạn giữa 2 lần check
- Frontend nên handle trường hợp này

---

## 🎨 Frontend Implementation

### React Example:

```jsx
function ForgotPasswordFlow() {
  const [step, setStep] = useState("email"); // email, otp, password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);

  const handleSendOtp = async () => {
    await fetch("/api/users/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setStep("otp");
  };

  const handleVerifyOtp = async () => {
    const response = await fetch("/api/users/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: otp,
        type: "password_reset",
      }),
    });

    if (response.ok) {
      setOtpVerified(true);
      setStep("password"); // Show password form
    } else {
      alert("Mã OTP không đúng");
    }
  };

  const handleResetPassword = async (newPassword) => {
    const response = await fetch("/api/users/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        code: otp,
        newPassword,
      }),
    });

    if (response.ok) {
      alert("Đổi mật khẩu thành công!");
      // Redirect to login
    }
  };

  return (
    <div>
      {step === "email" && <EmailForm onSubmit={handleSendOtp} />}
      {step === "otp" && (
        <OtpForm onSubmit={handleVerifyOtp} verified={otpVerified} />
      )}
      {step === "password" && otpVerified && (
        <NewPasswordForm onSubmit={handleResetPassword} />
      )}
    </div>
  );
}
```

---

## 💡 Tips & Best Practices

1. **Cache OTP verification result** trong frontend để tránh verify lại
2. **Set timeout** cho OTP verification (15 phút)
3. **Show clear states**: "Đang gửi...", "OTP hợp lệ", "Đang đổi mật khẩu..."
4. **Handle edge cases**: OTP hết hạn, email không tồn tại, etc.
5. **Auto-focus** vào field tiếp theo sau khi verify OTP thành công

---

## 🔍 Troubleshooting

### Lỗi thường gặp:

1. **"Mã OTP không chính xác hoặc đã hết hạn"**

   - Check OTP code chính xác
   - Check thời gian hết hạn (15 phút)
   - Check email đúng

2. **"Không tìm thấy tài khoản với email này"**

   - Email không tồn tại trong hệ thống
   - Check trong step forgot-password

3. **"Database column not found"**
   - Chạy `node utils/quickFixDatabase.js` để fix schema

---

## 🎉 Kết Luận

Quy trình mới này cho phép:

- ✅ **Better UX**: User biết OTP đúng trước khi nhập password
- ✅ **Better Security**: Tách biệt logic verify và reset
- ✅ **Better Control**: Frontend kiểm soát flow tốt hơn
- ✅ **Better Debugging**: Dễ debug từng bước riêng biệt

**Sử dụng `/verify-otp` cho một trải nghiệm quên mật khẩu tốt hơn!**
