# Hướng dẫn thiết lập hệ thống tài khoản

## 1. Tạo bảng users trong Supabase

Chạy file `database_setup_users.sql` trong SQL Editor của Supabase Dashboard:

1. Vào Supabase Dashboard > SQL Editor
2. Copy toàn bộ nội dung file `database_setup_users.sql`
3. Paste vào SQL Editor và chạy (Run)

## 2. Cài đặt dependencies

```bash
npm install
```

Các package cần thiết:
- `bcryptjs`: Để hash và verify password
- `dotenv`: Để load biến môi trường trong script

## 3. Tạo user đầu tiên (Admin)

### Cách 1: Sử dụng script (Khuyến nghị)

```bash
node scripts/create-user.js
```

Script sẽ hỏi bạn:
- Tên đăng nhập (username)
- Email
- Mật khẩu
- Họ và tên
- Số điện thoại (tùy chọn)
- Vai trò (MANAGER/SALES/ACCOUNTANT/INVENTORY/LEGAL)
- Chi nhánh

### Cách 2: Tạo trực tiếp trong SQL Editor

```sql
-- Hash password "admin123" bằng bcrypt
-- Bạn có thể sử dụng online tool hoặc Node.js để hash
-- Ví dụ: bcrypt.hashSync('admin123', 10)

INSERT INTO users (
  username, 
  email, 
  password_hash, 
  full_name, 
  phone, 
  role, 
  branch, 
  status,
  permissions
) VALUES (
  'admin',
  'admin@gcm.vn',
  '$2a$10$rOzJqKqKqKqKqKqKqKqKqOqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqK', -- Thay bằng hash thực tế
  'Sử Duy Linh',
  '0901234567',
  'MANAGER',
  'GCM-Tổng',
  'ACTIVE',
  '{
    "canManageContract": true,
    "canApproveFinance": true,
    "canViewReports": true,
    "canManageInventory": true,
    "canManageStaff": true
  }'::jsonb
);
```

**Lưu ý**: Bạn cần hash password trước khi insert. Có thể dùng:

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('admin123', 10);
console.log(hash);
```

## 4. Cấu trúc bảng users

### Các trường chính:

- `id`: UUID (Primary Key)
- `username`: Tên đăng nhập (unique)
- `email`: Email (unique)
- `password_hash`: Mật khẩu đã hash bằng bcrypt
- `full_name`: Họ và tên
- `phone`: Số điện thoại
- `role`: Vai trò (MANAGER, SALES, ACCOUNTANT, INVENTORY, LEGAL)
- `branch`: Chi nhánh
- `status`: Trạng thái (ACTIVE, INACTIVE)
- `manager_id`: ID người quản lý trực tiếp
- `permissions`: Quyền hạn (JSONB)
- `avatar_url`: URL ảnh đại diện
- `last_login_at`: Thời gian đăng nhập lần cuối
- `created_at`, `updated_at`: Timestamps

### Permissions (JSONB):

```json
{
  "canManageContract": boolean,
  "canApproveFinance": boolean,
  "canViewReports": boolean,
  "canManageInventory": boolean,
  "canManageStaff": boolean
}
```

## 5. Vai trò và quyền mặc định

### MANAGER (Quản lý)
- Tất cả quyền: true

### SALES (Kinh doanh)
- canManageContract: true
- Các quyền khác: false

### ACCOUNTANT (Kế toán)
- canApproveFinance: true
- canViewReports: true
- Các quyền khác: false

### INVENTORY (Kho)
- canManageInventory: true
- Các quyền khác: false

### LEGAL (Hồ sơ)
- Các quyền tùy chỉnh

## 6. Sử dụng trong ứng dụng

### Đăng nhập

1. Vào trang `/login`
2. Nhập username hoặc email
3. Nhập mật khẩu
4. Click "Đăng nhập"

### API Endpoint

**POST** `/api/auth/login`

Request body:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

Response (success):
```json
{
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "admin@gcm.vn",
    "full_name": "Sử Duy Linh",
    "role": "MANAGER",
    ...
  },
  "message": "Đăng nhập thành công"
}
```

Response (error):
```json
{
  "error": "Tên đăng nhập hoặc mật khẩu không đúng"
}
```

## 7. Bảo mật

- ✅ Password được hash bằng bcrypt (cost factor 10)
- ✅ Password không bao giờ được trả về trong API response
- ✅ User được lưu trong localStorage (có thể nâng cấp lên httpOnly cookie)
- ✅ RLS (Row Level Security) đã được cấu hình (có thể disable nếu quản lý ở application layer)

## 8. Troubleshooting

### Lỗi: "Tên đăng nhập hoặc mật khẩu không đúng"
- Kiểm tra username/email và password
- Kiểm tra user có status = 'ACTIVE' không
- Kiểm tra password_hash đã được hash đúng chưa

### Lỗi: "relation 'users' does not exist"
- Chạy lại file `database_setup_users.sql` trong Supabase

### Lỗi: "bcrypt.compare is not a function"
- Đảm bảo đã cài đặt `bcryptjs`: `npm install bcryptjs`

## 9. Tạo thêm users

Sử dụng script:
```bash
node scripts/create-user.js
```

Hoặc tạo trực tiếp trong Supabase Dashboard > Table Editor > users

