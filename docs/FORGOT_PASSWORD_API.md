# API Quên Mật Khẩu

Hệ thống đã được tích hợp đầy đủ chức năng quên mật khẩu với 2 endpoint chính:

## 1. Gửi mã xác nhận quên mật khẩu

**POST** `/api/users/forgot-password`

### Request Body:

```json
{
  "email": "user@example.com"
}
```

### Response thành công (200):

```json
{
  "status": "200",
  "message": "Mã xác nhận đã được gửi đến email của bạn"
}
```

### Response lỗi:

- **400**: Email là bắt buộc
- **404**: Không tìm thấy tài khoản với email này
- **500**: Lỗi server hoặc gửi email thất bại

## 2. Đặt lại mật khẩu

**POST** `/api/users/reset-password`

### Request Body:

```json
{
  "email": "user@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

### Response thành công (200):

```json
{
  "status": "200",
  "message": "Mật khẩu đã được cập nhật thành công"
}
```

### Response lỗi:

- **400**: Thiếu thông tin cần thiết / Mật khẩu phải có ít nhất 6 ký tự / Mã xác nhận không hợp lệ hoặc đã hết hạn
- **404**: Không tìm thấy tài khoản với email này
- **500**: Lỗi server

## Quy trình sử dụng:

1. **Người dùng quên mật khẩu**: Gọi endpoint `/forgot-password` với email
2. **Hệ thống gửi mã**: Mã xác nhận 6 chữ số được gửi qua email (hiệu lực 15 phút)
3. **Người dùng nhập mã**: Gọi endpoint `/reset-password` với email, mã xác nhận và mật khẩu mới
4. **Hệ thống cập nhật**: Mật khẩu được lưu trực tiếp vào database

## Lưu ý bảo mật:

- Mã xác nhận có hiệu lực 15 phút
- Mật khẩu được lưu dưới dạng plain text (không hash)
- Mã xác nhận bị xóa sau khi sử dụng thành công
- Chỉ có thể có 1 mã xác nhận active cho mỗi email

## Cấu hình email:

Đảm bảo các biến môi trường sau được thiết lập trong file `.env`:

```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

## Test thủ công:

1. Gọi API forgot-password với email tồn tại
2. Kiểm tra console log để thấy mã xác nhận (trong môi trường dev)
3. Gọi API reset-password với mã vừa nhận được
4. Thử đăng nhập với mật khẩu mới
