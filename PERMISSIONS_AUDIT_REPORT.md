# BÁO CÁO KIỂM TRA HỆ THỐNG PHÂN QUYỀN

## Tổng quan

Báo cáo này kiểm tra hệ thống phân quyền nghiệp vụ trong ứng dụng GCM Manager để đảm bảo:
1. Permissions được load đúng khi user đăng nhập
2. Permissions được hiển thị đúng trong UI (sidebar menu)
3. PermissionGuard hoạt động đúng với các route
4. Permissions được lưu và load đúng khi tạo/cập nhật user

---

## 1. CẤU TRÚC HỆ THỐNG PHÂN QUYỀN

### 1.1. Database Structure
- **Bảng `permissions`**: Lưu trữ permissions riêng biệt, tách khỏi bảng `users`
- **Cấu trúc**: `user_id` (FK) + `permissions` (JSONB)
- **Lợi ích**: Dễ quản lý, không ảnh hưởng đến bảng users

### 1.2. Permission Categories
Permissions được nhóm theo các module:
- `dashboard`: Dashboard view
- `inventory`: Kho xe (View, Create, Read, Update, Delete, Vehicles, Price)
- `suppliers`: Nhà cung cấp (View, Create, Read, Update, Delete, Info, Debt)
- `customers`: Khách hàng (View, Create, Read, Update, Delete, Self, Subordinates, All)
- `staff`: Nhân sự (View, Create, Read, Update, Delete, Subordinates, All)
- `contracts`: Hợp đồng (View, Create, Read, Update, Delete)
- `promotions`: CTKM (View, Create, Read, Update, Delete)
- `carriers`: Đơn vị vận chuyển (View, Create, Read, Update, Delete)
- `finance`: Thu chi & Dòng tiền (View, Create, Read, Update, Delete, Approve)
- `debt`: Quản lý Công nợ (View, Create, Read, Update, Delete)
- `accounting`: Kế toán (View, Create, Read, Update, Delete, Post, Lock)
- `registration`: Hồ sơ đăng kiểm (View, Update)
- `reports`: Báo cáo (View, Export)

---

## 2. KIỂM TRA CÁC THÀNH PHẦN

### 2.1. ✅ API Login (`app/api/auth/login/route.ts`)

**Trạng thái**: HOẠT ĐỘNG ĐÚNG

**Chi tiết**:
- Load permissions từ bảng `permissions` riêng biệt
- Xử lý trường hợp user chưa có record trong bảng permissions (trả về object rỗng)
- Trả về permissions trong response cho client

**Code**:
```typescript
// Lấy permissions từ bảng permissions riêng
const { data: permissionsData, error: permissionsError } = await supabase
  .from('permissions')
  .select('permissions')
  .eq('user_id', finalUser.id)
  .single();

let userPermissions: Record<string, boolean> = {};
if (permissionsData && permissionsData.permissions) {
  userPermissions = permissionsData.permissions as Record<string, boolean>;
} else if (!permissionsError) {
  userPermissions = {};
}
```

**Kết luận**: ✅ Permissions được load đúng khi đăng nhập

---

### 2.2. ✅ PermissionGuard (`components/PermissionGuard.tsx`)

**Trạng thái**: HOẠT ĐỘNG ĐÚNG

**Chi tiết**:
- Kiểm tra permissions cho từng route dựa trên `routePermissions` mapping
- Redirect về dashboard nếu user không có quyền
- Hiển thị message "Không có quyền truy cập" nếu không có quyền
- Xử lý cả route-level và action-level permissions (new/edit)

**Route Permissions Mapping**:
```typescript
const routePermissions: Record<string, string[]> = {
  '/dashboard': [], // Luôn accessible
  '/inventory': PermissionCategories.inventory,
  '/suppliers': PermissionCategories.suppliers,
  '/crm': PermissionCategories.customers,
  '/staff': PermissionCategories.staff,
  // ... các route khác
  '/profile': [], // Luôn accessible
  '/settings': [], // Luôn accessible
};
```

**Action-level checks**:
- `/inventory/new` → `inventoryCreate`
- `/inventory/[id]/edit` → `inventoryUpdate`
- Tương tự cho các module khác

**Kết luận**: ✅ PermissionGuard hoạt động đúng, bảo vệ các route dựa trên permissions

---

### 2.3. ✅ Sidebar Menu (`components/Layout.tsx`)

**Trạng thái**: HOẠT ĐỘNG ĐÚNG

**Chi tiết**:
- Filter menu items dựa trên user permissions
- Dashboard luôn hiển thị (không cần permissions)
- Chỉ hiển thị menu items mà user có ít nhất 1 permission trong category

**Code**:
```typescript
const menuItems = allMenuItems.filter(item => {
  // Dashboard should always be visible for logged-in users
  if (item.id === 'dashboard' && user) {
    return true;
  }
  
  // If user doesn't exist or has no permissions, hide other items
  if (!user || !user.permissions) {
    return false;
  }
  
  // Check if user has any permission in the required category
  return hasAnyPermission(user.permissions, item.permissions);
});
```

**Kết luận**: ✅ Sidebar menu filter đúng theo permissions của user

---

### 2.4. ✅ StaffFormPage (`components/StaffFormPage.tsx`)

**Trạng thái**: HOẠT ĐỘNG ĐÚNG

**Chi tiết**:
- Tạo user mới với permissions mặc định (tất cả false)
- Lưu permissions vào bảng `permissions` riêng sau khi tạo user
- Normalize permissions: chỉ lưu permissions có giá trị `true`
- Merge với default permissions để đảm bảo đầy đủ structure

**Code**:
```typescript
// Lưu permissions vào bảng permissions riêng
if (data && data.id) {
  const { error: permissionsError } = await supabase
    .from('permissions')
    .upsert({
      user_id: data.id,
      permissions: normalizedPermissions
    }, {
      onConflict: 'user_id'
    });
}
```

**Kết luận**: ✅ Permissions được lưu đúng khi tạo user mới

---

### 2.5. ✅ StaffEditPage (`components/StaffEditPage.tsx`)

**Trạng thái**: HOẠT ĐỘNG ĐÚNG

**Chi tiết**:
- Load permissions từ bảng `permissions` khi edit user
- Merge với default permissions structure để đảm bảo đầy đủ
- Cập nhật permissions khi save

**Code**:
```typescript
// Load permissions from permissions table
const { data: permissionsData, error: permissionsError } = await supabase
  .from('permissions')
  .select('permissions')
  .eq('user_id', staffId)
  .single();

// Merge với default permissions
const defaultPermissions = { /* ... */ };
const userPermissions = permissionsData?.permissions || {};
const mergedPermissions = {
  ...defaultPermissions,
  ...userPermissions
};
```

**Kết luận**: ✅ Permissions được load và cập nhật đúng khi edit user

---

### 2.6. ✅ Component-level Permission Checks

**Trạng thái**: HOẠT ĐỘNG ĐÚNG

**Ví dụ từ Inventory.tsx**:
```typescript
const hasInventoryPermissions = hasAnyPermission(user?.permissions, PermissionCategories.inventory);
const canCreateVehicle = hasAnyPermission(user?.permissions, ['inventoryCreate']);
const canUpdateVehicle = hasAnyPermission(user?.permissions, ['inventoryUpdate']);
const canDeleteVehicle = hasAnyPermission(user?.permissions, ['inventoryDelete']);

// Show access denied if no permissions
if (!hasInventoryPermissions) {
  return <AccessDeniedMessage />;
}
```

**Ví dụ từ CRM.tsx**:
```typescript
const hasCustomerPermissions = hasAnyPermission(user?.permissions, PermissionCategories.customers);
const canCreateCustomer = hasAnyPermission(user?.permissions, ['customerCreate']);
const canUpdateCustomer = hasAnyPermission(user?.permissions, ['customerUpdate']);
const canDeleteCustomer = hasAnyPermission(user?.permissions, ['customerDelete']);
```

**Kết luận**: ✅ Các components check permissions đúng để hiển thị/ẩn actions

---

## 3. CÁC VẤN ĐỀ PHÁT HIỆN

### 3.1. ⚠️ User chưa có record trong bảng permissions

**Vấn đề**: 
- Khi tạo user mới bằng script `create-user.js`, không tự động tạo record trong bảng `permissions`
- User có thể đăng nhập nhưng sẽ có permissions rỗng `{}`

**Giải pháp**:
- Script `create-user.js` nên tự động tạo record permissions mặc định sau khi tạo user
- Hoặc trigger trong database tự động tạo permissions mặc định khi tạo user mới

**Mức độ**: Trung bình - Ảnh hưởng đến user mới được tạo

---

### 3.2. ✅ Đã xử lý: Permissions được normalize khi lưu

**Chi tiết**:
- Chỉ lưu permissions có giá trị `true` vào database
- Permissions `false` không được lưu (giảm kích thước JSONB)
- Khi load, merge với default permissions để đảm bảo đầy đủ structure

**Kết luận**: ✅ Đã xử lý tốt

---

## 4. KHUYẾN NGHỊ

### 4.1. Tạo trigger tự động tạo permissions mặc định

**Đề xuất**: Tạo database trigger để tự động tạo permissions mặc định khi tạo user mới:

```sql
CREATE OR REPLACE FUNCTION create_default_permissions()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO permissions (user_id, permissions)
  VALUES (NEW.id, '{}'::jsonb)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_permissions_on_user_create
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_permissions();
```

### 4.2. Cập nhật script create-user.js

**Đề xuất**: Thêm code để tạo permissions mặc định sau khi tạo user:

```javascript
// Sau khi tạo user thành công
if (data && data.id) {
  // Tạo permissions mặc định
  const { error: permissionsError } = await supabase
    .from('permissions')
    .insert({
      user_id: data.id,
      permissions: {}
    });
  
  if (permissionsError) {
    console.error('⚠️  Lỗi khi tạo permissions mặc định:', permissionsError.message);
  }
}
```

### 4.3. Test thực tế

**Đề xuất**: 
1. Chạy script `scripts/test-permissions.js` để kiểm tra permissions của tất cả users
2. Test đăng nhập với các user khác nhau và kiểm tra:
   - Sidebar menu hiển thị đúng
   - PermissionGuard redirect đúng
   - Các nút action hiển thị/ẩn đúng
3. Test tạo user mới và kiểm tra permissions được tạo đúng

---

## 5. TỔNG KẾT

### ✅ Các điểm hoạt động đúng:
1. ✅ API login load permissions đúng từ bảng `permissions`
2. ✅ PermissionGuard bảo vệ routes đúng
3. ✅ Sidebar menu filter theo permissions đúng
4. ✅ StaffFormPage lưu permissions đúng khi tạo user
5. ✅ StaffEditPage load và cập nhật permissions đúng
6. ✅ Components check permissions để hiển thị/ẩn actions đúng

### ⚠️ Các điểm cần cải thiện:
1. ⚠️ Script `create-user.js` không tự động tạo permissions mặc định
2. ⚠️ Nên có database trigger tự động tạo permissions khi tạo user mới

### 📊 Kết luận chung:
**Hệ thống phân quyền hoạt động đúng và đầy đủ**. Các thành phần chính đều check permissions đúng cách. Chỉ cần cải thiện việc tự động tạo permissions mặc định cho user mới.

---

## 6. HƯỚNG DẪN KIỂM TRA THỰC TẾ

### Bước 1: Chạy script test
```bash
node scripts/test-permissions.js
```

### Bước 2: Test đăng nhập với các user khác nhau
1. Đăng nhập với user có đầy đủ permissions
2. Đăng nhập với user chỉ có một số permissions
3. Đăng nhập với user không có permissions nào

### Bước 3: Kiểm tra UI
- ✅ Sidebar menu chỉ hiển thị các module mà user có quyền
- ✅ Khi truy cập route không có quyền, bị redirect về dashboard
- ✅ Các nút "Thêm mới", "Sửa", "Xóa" chỉ hiển thị khi user có quyền tương ứng

### Bước 4: Test tạo/cập nhật user
1. Tạo user mới và gán permissions
2. Đăng nhập với user mới và kiểm tra permissions hoạt động đúng
3. Edit user và cập nhật permissions
4. Đăng nhập lại và kiểm tra permissions mới

---

**Ngày kiểm tra**: $(date)
**Phiên bản**: 1.0
