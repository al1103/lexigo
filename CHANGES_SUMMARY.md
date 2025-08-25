# Thay đổi xử lý mật khẩu trong hệ thống

## Tóm tắt thay đổi

Đã xóa tất cả các chức năng hash mật khẩu trong hệ thống. Bây giờ mật khẩu được lưu trữ dưới dạng plain text theo yêu cầu.

## Các file đã được thay đổi:

### 1. `controllers/userController.js`

#### Chức năng Đăng ký (`register`):

- **Trước**: `const hashedPassword = await bcrypt.hash(password, saltRounds)`
- **Sau**: `const plainPassword = password`

#### Chức năng Xác thực đăng ký (`verifyRegistration`):

- **Trước**: `const password_hash = await bcrypt.hash(password, saltRounds)`
- **Sau**: `const password_hash = password`

#### Chức năng Đặt lại mật khẩu (`resetPassword`):

- **Trước**: `const hashedPassword = await bcrypt.hash(newPassword, saltRounds)`
- **Sau**: `const plainPassword = newPassword`

#### Các thay đổi log messages:

- Thay đổi `"[HASHED]"` thành `"[PLAIN]"` trong các log messages

### 3. `models/user_model.js`

#### Chức năng Tạo user (`create`):

- **Trước**: `const password_hash = await bcrypt.hash(password, saltRounds)`
- **Sau**: `const password_hash = password`

#### Chức năng Đăng nhập (`login`):

- **Trước**: `// const isPasswordValid = await bcrypt.compare(password, user.password_hash)` (bị comment)
- **Sau**: `const isPasswordValid = password === user.password_hash` (uncomment và sử dụng so sánh trực tiếp)

#### Chức năng Đổi mật khẩu (`changePassword`):

- **Trước**: `const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash)`
- **Sau**: `const isCurrentPasswordValid = currentPassword === userResult.rows[0].password_hash`
- **Trước**: `const newPasswordHash = await bcrypt.hash(newPassword, saltRounds)`
- **Sau**: `const newPasswordHash = newPassword`

### 2. `docs/FORGOT_PASSWORD_API.md`

#### Cập nhật tài liệu:

- **Lưu ý bảo mật**: Thay đổi từ "Mật khẩu mới được hash bằng bcrypt" thành "Mật khẩu được lưu dưới dạng plain text"
- **Quy trình sử dụng**: Thay đổi từ "Mật khẩu được hash và lưu vào database" thành "Mật khẩu được lưu trực tiếp vào database"

## Ảnh hưởng bảo mật

⚠️ **CẢNH BÁO QUAN TRỌNG**:

Việc lưu trữ mật khẩu dưới dạng plain text có thể gây ra rủi ro bảo mật nghiêm trọng:

1. **Rủi ro data breach**: Nếu database bị xâm nhập, tất cả mật khẩu người dùng sẽ bị lộ
2. **Không tuân thủ best practices**: Các tiêu chuẩn bảo mật khuyến nghị luôn hash mật khẩu
3. **Rủi ro pháp lý**: Có thể vi phạm các quy định về bảo vệ dữ liệu cá nhân

## Khuyến nghị

Đây có thể chỉ là thay đổi tạm thời cho mục đích phát triển hoặc testing. Trong môi trường production, nên:

1. Sử dụng bcrypt hoặc argon2 để hash mật khẩu
2. Implement salt cho mỗi mật khẩu
3. Thường xuyên update security practices

## Các chức năng bị ảnh hưởng

- ✅ Đăng ký tài khoản
- ✅ Xác thực đăng ký
- ✅ Đặt lại mật khẩu (forgot password)
- ✅ Đăng nhập (đã được kích hoạt lại với plain text validation)
- ✅ Đổi mật khẩu (đã được cập nhật cho plain text)

## Testing

Hãy test lại toàn bộ flow để đảm bảo:

1. Đăng ký → Xác thực → Đăng nhập hoạt động bình thường
2. Forgot password → Reset → Đăng nhập với password mới
3. Các chức năng khác không bị ảnh hưởng

---

**Ngày thay đổi**: $(date)
**Thực hiện bởi**: AI Assistant
**Lý do**: Theo yêu cầu của người dùng
