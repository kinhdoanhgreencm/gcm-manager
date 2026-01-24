# Hướng dẫn sửa lỗi "record new has no field permissions"

## Vấn đề
Khi cập nhật nhân sự, xuất hiện lỗi:
```
Error: record "new" has no field "permissions"
Code: 42703
```

## Nguyên nhân
Lỗi này xảy ra do:
1. Cột `permissions` đã được xóa khỏi bảng `users` (đã chuyển sang bảng `permissions` riêng)
2. Nhưng vẫn có trigger/function trong database đang cố truy cập `NEW.permissions` khi UPDATE bảng `users`
3. Khi trigger chạy, nó không tìm thấy field `permissions` trong record `NEW` → lỗi

## Giải pháp

### Bước 1: Chạy SQL Migration
Chạy file `sql/migration_fix_permissions_trigger_final.sql` trong Supabase SQL Editor:

1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Copy toàn bộ nội dung file `sql/migration_fix_permissions_trigger_final.sql`
4. Paste vào SQL Editor và chạy (Run)

File này sẽ:
- ✅ Tìm và liệt kê tất cả trigger trên bảng `users`
- ✅ Xóa tất cả trigger cũ có thể tham chiếu đến `permissions`
- ✅ Tạo lại trigger mới KHÔNG tham chiếu đến `permissions`
- ✅ Xóa cột `permissions` nếu vẫn còn tồn tại
- ✅ Refresh schema cache

### Bước 2: Kiểm tra code đã được cập nhật
Code trong `components/StaffEditPage.tsx` đã được cập nhật để:
- ✅ Không bao gồm `permissions` trong object update
- ✅ Có explicit check để xóa `permissions` nếu vô tình được thêm vào
- ✅ Lưu `permissions` riêng vào bảng `permissions` sau khi update user thành công

### Bước 3: Kiểm tra lại
Sau khi chạy migration:

1. Đợi 1-2 phút để Supabase refresh schema cache
2. Thử cập nhật nhân sự lại
3. Nếu vẫn còn lỗi:
   - Kiểm tra console log để xem data được gửi có chứa `permissions` không
   - Kiểm tra Supabase logs để xem trigger nào đang gây lỗi
   - Có thể cần restart Supabase project

## Cấu trúc dữ liệu

### Bảng `users`
- ❌ KHÔNG có cột `permissions`
- ✅ Chứa thông tin cơ bản: name, email, phone, role, branch, etc.

### Bảng `permissions`
- ✅ Có cột `user_id` (foreign key đến `users.id`)
- ✅ Có cột `permissions` (JSONB) chứa tất cả quyền hạn
- ✅ Mỗi user có 1 record trong bảng này

## Lưu ý quan trọng

1. **KHÔNG BAO GIỜ** gửi `permissions` trong UPDATE/INSERT vào bảng `users`
2. **LUÔN LUÔN** lưu `permissions` vào bảng `permissions` riêng
3. Khi đọc user, cần JOIN với bảng `permissions` để lấy quyền hạn
4. Khi update user, update 2 bước:
   - Bước 1: Update bảng `users` (KHÔNG có permissions)
   - Bước 2: Upsert bảng `permissions` (có permissions)

## Nếu vẫn còn lỗi

1. Kiểm tra Supabase Dashboard → Database → Triggers
   - Xem có trigger nào khác trên bảng `users` không
   - Xem trigger nào đang chạy khi UPDATE

2. Kiểm tra Supabase Dashboard → Database → Functions
   - Xem có function nào tham chiếu đến `permissions` không

3. Kiểm tra code frontend
   - Đảm bảo không có chỗ nào gửi `permissions` trong update
   - Check console log để xem data được gửi

4. Liên hệ support nếu cần
   - Có thể có system trigger từ Supabase extension
   - Có thể cần restart project
