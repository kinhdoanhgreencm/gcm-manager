# Hướng dẫn chạy Migration cho Notifications

## Vấn đề
Bảng `notifications` trong database có thể chưa có các cột `is_read` và `read_at` để lưu trạng thái đã đọc.

## Giải pháp

### Cách 1: Migration đơn giản (Khuyến nghị)
Chạy file `migration_add_notifications_read_columns.sql` trong Supabase SQL Editor:

1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Copy nội dung file `sql/migration_add_notifications_read_columns.sql`
4. Paste và chạy (Run)

### Cách 2: Migration tổng hợp (Đầy đủ)
Chạy file `migration_ensure_notifications_read_columns.sql` nếu muốn đảm bảo toàn bộ cấu trúc:

1. Mở Supabase Dashboard
2. Vào SQL Editor
3. Copy nội dung file `sql/migration_ensure_notifications_read_columns.sql`
4. Paste và chạy (Run)

## Các cột sẽ được thêm

- `is_read`: BOOLEAN DEFAULT FALSE - Trạng thái đã đọc
- `read_at`: TIMESTAMPTZ - Thời điểm đánh dấu đã đọc

## Kiểm tra kết quả

Sau khi chạy migration, kiểm tra bằng SQL:

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'notifications'
AND column_name IN ('is_read', 'read_at');
```

Kết quả mong đợi:
- `is_read`: data_type = 'boolean', is_nullable = 'NO', column_default = 'false'
- `read_at`: data_type = 'timestamp with time zone', is_nullable = 'YES'

## Lưu ý

- Migration sẽ không làm mất dữ liệu hiện có
- Tất cả thông báo hiện có sẽ được đặt `is_read = FALSE` mặc định
- Migration có thể chạy nhiều lần an toàn (idempotent)
