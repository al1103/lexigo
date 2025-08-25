# 🔐 Reset Password - Simplified (No OTP Required)

## ✅ **Đã cập nhật:** Bỏ OTP verification, chỉ cần email + newPassword

---

## 🚀 **Quick Start**

### **API Endpoint:**

```
POST /api/users/reset-password
```

### **Request Body:**

```json
{
  "email": "chube2609@gmail.com",
  "newPassword": "Zilong2609@"
}
```

### **Response Success:**

```json
{
  "status": "200",
  "message": "Mật khẩu đã được cập nhật thành công"
}
```

---

## 🧪 **Test Commands**

### **Method 1: Quick Test Script**

```bash
node utils/testResetPasswordSimple.js
```

### **Method 2: cURL**

```bash
curl -X POST http://localhost:3000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "chube2609@gmail.com",
    "newPassword": "Zilong2609@"
  }'
```

### **Method 3: JavaScript**

```javascript
const axios = require("axios");

async function resetPassword() {
  try {
    const response = await axios.post(
      "http://localhost:3000/api/users/reset-password",
      {
        email: "chube2609@gmail.com",
        newPassword: "Zilong2609@",
      }
    );
    console.log("✅ Success:", response.data.message);
  } catch (error) {
    console.log("❌ Error:", error.response?.data?.message);
  }
}

resetPassword();
```

---

## 🔍 **Validation Rules**

### **Required Fields:**

- ✅ `email` - Must exist in database
- ✅ `newPassword` - Must be at least 6 characters

### **Validation Checks:**

1. **Email exists**: Kiểm tra email có trong users table
2. **Password length**: newPassword >= 6 characters
3. **Request format**: Valid JSON with correct field names

---

## 📋 **Error Responses**

### **400 - Missing Information**

```json
{
  "status": 400,
  "message": "Thiếu thông tin cần thiết"
}
```

**Cause:** Missing `email` or `newPassword` in request body

### **400 - Password Too Short**

```json
{
  "status": 400,
  "message": "Mật khẩu phải có ít nhất 6 ký tự"
}
```

**Cause:** `newPassword` length < 6

### **404 - Email Not Found**

```json
{
  "status": 404,
  "message": "Email không tồn tại trong hệ thống"
}
```

**Cause:** Email not found in users table

### **500 - Server Error**

```json
{
  "status": 500,
  "message": "Đã xảy ra lỗi. Vui lòng thử lại sau."
}
```

**Cause:** Database error or server issue

---

## 🔧 **Backend Changes**

### **What was removed:**

- ❌ OTP/code verification
- ❌ verification_codes table lookup
- ❌ Code expiration check
- ❌ forgot-password dependency

### **What was kept:**

- ✅ Email validation
- ✅ Password length validation
- ✅ Plain text password storage (as requested)
- ✅ Database update
- ✅ Detailed logging

### **New validation logic:**

```javascript
// Before (required 3 fields)
const { email, code, newPassword } = req.body;
if (!email || !code || !newPassword) { ... }

// After (required 2 fields)
const { email, newPassword } = req.body;
if (!email || !newPassword) { ... }
```

---

## 🎯 **Frontend Integration Examples**

### **React Example:**

```jsx
const ResetPasswordForm = () => {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("✅ " + data.message);
      } else {
        setMessage("❌ " + data.message);
      }
    } catch (error) {
      setMessage("❌ Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleResetPassword}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="New Password (min 6 chars)"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        required
        minLength={6}
      />
      <button type="submit" disabled={loading}>
        {loading ? "Resetting..." : "Reset Password"}
      </button>
      {message && <p>{message}</p>}
    </form>
  );
};
```

### **Vue.js Example:**

```vue
<template>
  <form @submit.prevent="resetPassword">
    <input v-model="email" type="email" placeholder="Email" required />
    <input
      v-model="newPassword"
      type="password"
      placeholder="New Password"
      required
      minlength="6"
    />
    <button type="submit" :disabled="loading">
      {{ loading ? "Resetting..." : "Reset Password" }}
    </button>
    <p v-if="message">{{ message }}</p>
  </form>
</template>

<script>
export default {
  data() {
    return {
      email: "",
      newPassword: "",
      loading: false,
      message: "",
    };
  },
  methods: {
    async resetPassword() {
      this.loading = true;
      try {
        const response = await fetch("/api/users/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: this.email,
            newPassword: this.newPassword,
          }),
        });
        const data = await response.json();
        this.message = response.ok
          ? "✅ " + data.message
          : "❌ " + data.message;
      } catch (error) {
        this.message = "❌ Network error";
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>
```

---

## 🧪 **Testing Scenarios**

### **Valid Cases:**

- ✅ Existing email + valid password
- ✅ Different password lengths (6+)
- ✅ Special characters in password
- ✅ Different email formats

### **Error Cases:**

- ❌ Non-existent email
- ❌ Missing email field
- ❌ Missing newPassword field
- ❌ Password < 6 characters
- ❌ Empty strings
- ❌ Wrong field names (`new_password` vs `newPassword`)

---

## 📊 **Backend Logging**

The backend now logs detailed information:

```
🔍 Reset Password Request (No OTP): {
  body: { email: 'chube2609@gmail.com', newPassword: 'Zilong2609@' },
  email: 'chube2609@gmail.com',
  newPassword: 'Zilong2609@',
  new_password: undefined,
  headers: 'application/json'
}

🔍 Extracted values: { email: 'chube2609@gmail.com', newPassword: 'Zilong2609@' }

✅ Email found in database, proceeding with password update
✅ Password updated successfully for: chube2609@gmail.com
```

---

## 🎉 **Benefits of Simplified Flow**

### **User Experience:**

- ✅ Faster reset process (1 step vs 3 steps)
- ✅ No need to check email/console for OTP
- ✅ Immediate password change
- ✅ Less chance of user error

### **Developer Experience:**

- ✅ Simpler API integration
- ✅ Fewer API calls required
- ✅ Less state management needed
- ✅ Easier testing and debugging

### **System Benefits:**

- ✅ Reduced database queries
- ✅ No verification_codes table dependency
- ✅ Cleaner code structure
- ✅ Better performance

---

## 🔐 **Security Considerations**

### **Current Security Level:**

- ⚠️ **No email verification** - Anyone can reset password with just email
- ⚠️ **No rate limiting** - Could be vulnerable to brute force
- ⚠️ **Plain text passwords** - As per user requirement

### **Recommendations for Production:**

- 🔒 Add rate limiting
- 🔒 Add IP-based restrictions
- 🔒 Add password strength validation
- 🔒 Consider adding captcha
- 🔒 Log all password reset attempts

---

## 🚀 **Ready to Use!**

```bash
# Test it now:
node utils/testResetPasswordSimple.js

# Or manual test:
curl -X POST http://localhost:3000/api/users/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"chube2609@gmail.com","newPassword":"NewPassword123"}'
```

**🎯 Simple, fast, and effective password reset without OTP complexity!**
