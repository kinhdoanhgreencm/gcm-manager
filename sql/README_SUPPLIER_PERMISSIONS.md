# Hướng dẫn thêm phân quyền chi tiết cho nhà cung cấp

## Tổng quan

File migration này thêm 6 permission mới cho module nhà cung cấp để có thể phân quyền chi tiết hơn:

1. **supplierBasicInfo** - Xem thông tin cơ bản (tên, loại, số xe, nhân viên phụ trách)
2. **supplierFinancialInfo** - Xem thông tin tài chính (giá trị nhập, công nợ)
3. **supplierLegalInfo** - Xem thông tin pháp lý (MST, CCCD, người đại diện)
4. **supplierVehicles** - Xem danh sách xe đã nhập từ nhà cung cấp
5. **supplierPaymentHistory** - Xem lịch sử thanh toán
6. **supplierDebtHistory** - Xem lịch sử nợ

## Cách chạy migration

### Bước 1: Mở Supabase Dashboard
1. Đăng nhập vào Supabase Dashboard
2. Chọn project của bạn
3. Vào **SQL Editor**

### Bước 2: Chạy file migration
1. Mở file `sql/migration_add_supplier_detailed_permissions.sql`
2. Copy toàn bộ nội dung
3. Paste vào SQL Editor
4. Click **Run** hoặc nhấn `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

### Bước 3: Kiểm tra kết quả
Sau khi chạy, bạn sẽ thấy thông báo:
- ✅ Migration hoàn tất!
- 📊 Thống kê về số users đã được cập nhật

## Sau khi chạy migration

1. **Tất cả users hiện có** sẽ có 6 permission mới được thêm vào (mặc định là `false`)
2. **Các user mới** sẽ tự động có đầy đủ permission mới khi được tạo
3. **Admin cần cập nhật permissions** cho các users trong trang quản lý nhân sự để cấp quyền xem các thông tin chi tiết

## Cách cấp quyền cho users

1. Vào trang **Quản lý nhân sự** (`/staff`)
2. Chọn user cần cấp quyền
3. Click **Sửa** hoặc tạo user mới
4. Trong phần **Phân quyền nghiệp vụ**, tìm mục **Nhà cung cấp**
5. Bật các permission chi tiết cần thiết:
   - ✅ Xem thông tin cơ bản
   - ✅ Xem thông tin tài chính
   - ✅ Xem thông tin pháp lý
   - ✅ Xem danh sách xe đã nhập
   - ✅ Xem lịch sử thanh toán
   - ✅ Xem lịch sử nợ

## Lưu ý

- Migration này **an toàn** và không xóa dữ liệu hiện có
- Tất cả permission mới được set mặc định là `false` để đảm bảo bảo mật
- Nếu có lỗi, hãy kiểm tra lại log trong SQL Editor

## Troubleshooting

### Lỗi: "relation permissions does not exist"
- Chạy file `sql/migration_create_permissions_table.sql` trước

### Lỗi: "duplicate key value violates unique constraint"
- File migration đã xử lý bằng `ON CONFLICT`, nên lỗi này không ảnh hưởng

### Sau khi chạy migration, permissions vẫn chưa hoạt động
- Kiểm tra xem user đã đăng xuất và đăng nhập lại chưa
- Kiểm tra trong database xem permissions đã được cập nhật chưa:
  ```sql
  SELECT user_id, permissions->'supplierBasicInfo' as supplierBasicInfo
  FROM permissions
  LIMIT 5;
  ```
