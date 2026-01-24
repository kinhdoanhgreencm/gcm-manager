# Luồng Vận Hành Dự Án GCM Manager

## Tổng Quan Dự Án

**GCM Manager** là hệ thống quản lý đại lý VinFast được xây dựng bằng Next.js 16 với TypeScript, sử dụng Supabase làm backend database và tích hợp Google Gemini AI cho các insights thông minh.

---

## 1. Luồng Xác Thực và Bảo Mật

### 1.1. Đăng Nhập
```
User truy cập trang chủ (/) 
  → Kiểm tra localStorage có user không?
    ├─ Có → Redirect đến /dashboard
    └─ Không → Redirect đến /login
```

**Quy trình đăng nhập:**
1. User nhập `username` và `password` tại `/login`
2. Frontend gọi API `/api/auth/login` (POST)
3. Backend kiểm tra:
   - Tìm user theo `username` hoặc `email` trong bảng `users`
   - Xác thực mật khẩu (plain text comparison)
   - Kiểm tra `status = 'ACTIVE'`
4. Nếu thành công:
   - Cập nhật `last_login_at` trong database
   - Kiểm tra `must_change_password` hoặc đăng nhập lần đầu
   - Trả về thông tin user kèm `permissions` từ bảng `permissions`
5. Frontend lưu user vào `localStorage`
6. Redirect:
   - Nếu `must_change_password = true` → `/change-password`
   - Ngược lại → `/dashboard`

### 1.2. Bảo Vệ Route
```
ProtectedRoute Component:
  ├─ Kiểm tra user đã đăng nhập?
  │   ├─ Chưa → Redirect /login
  │   └─ Có → Tiếp tục
  ├─ Kiểm tra must_change_password?
  │   ├─ Có → Redirect /change-password
  │   └─ Không → Tiếp tục
  └─ PermissionGuard Component:
      ├─ Lấy required permissions cho route hiện tại
      ├─ Kiểm tra user có quyền?
      │   ├─ Không → Hiển thị "Không có quyền truy cập"
      │   └─ Có → Render children
```

### 1.3. Idle Timeout
- Tự động logout sau **15 phút** không hoạt động
- Reset timer khi có các sự kiện: `mousedown`, `mousemove`, `keypress`, `scroll`, `touchstart`, `click`

---

## 2. Cấu Trúc Layout và Navigation

### 2.1. Layout Hierarchy
```
RootLayout (app/layout.tsx)
  ├─ AuthProvider (Context quản lý user state)
  ├─ SidebarProvider (Context quản lý sidebar state)
  ├─ ConditionalHeader (Hiển thị header tùy route)
  └─ Children

DashboardLayout (app/(dashboard)/layout.tsx)
  ├─ ProtectedRoute (Bảo vệ route)
  ├─ PermissionGuard (Kiểm tra quyền)
  └─ AppLayout (Layout chính với sidebar)
      ├─ Sidebar (Menu điều hướng)
      └─ Main Content Area
```

### 2.2. Sidebar Navigation
- **Responsive**: Tự động ẩn trên mobile/tablet (< 1024px)
- **Dynamic Menu**: Chỉ hiển thị menu items mà user có quyền truy cập
- **Menu Items**:
  - Tổng quan (`/dashboard`)
  - Kho xe (`/inventory`)
  - Nhà cung cấp (`/suppliers`)
  - Khách hàng (`/crm`)
  - Nhân sự (`/staff`)
  - Quản lý Công nợ (`/debt`)
  - Thu chi & Dòng tiền (`/finance`)
  - Kế toán (`/accounting`)
  - Hợp đồng (`/contracts`)
  - CTKM (`/promotions`)
  - Đơn vị vận chuyển (`/carriers`)
  - Hồ sơ đăng kiểm (`/registration`)
  - Báo cáo (`/reports`)

---

## 3. Hệ Thống Phân Quyền

### 3.1. Cấu Trúc Permissions
- Mỗi user có một record trong bảng `permissions` với JSON object chứa các quyền
- Permissions được nhóm theo module:
  - **Inventory**: `inventoryView`, `inventoryCreate`, `inventoryRead`, `inventoryUpdate`, `inventoryDelete`, `inventoryPrice`
  - **Suppliers**: `supplierView`, `supplierCreate`, `supplierRead`, `supplierUpdate`, `supplierDelete`, `supplierBasicInfo`, `supplierFinancialInfo`, `supplierLegalInfo`, `supplierVehicles`, `supplierPaymentHistory`, `supplierDebtHistory`
  - **Customers**: `customerView`, `customerCreate`, `customerRead`, `customerUpdate`, `customerDelete`, `customerSelf`, `customerSubordinates`, `customerAll`
  - **Staff**: `staffView`, `staffCreate`, `staffRead`, `staffUpdate`, `staffDelete`, `staffSubordinates`, `staffAll`
  - **Contracts**: `contractsView`, `contractsCreate`, `contractsRead`, `contractsUpdate`, `contractsDelete`
  - **Finance**: `financeView`, `financeCreate`, `financeRead`, `financeUpdate`, `financeDelete`, `financeApprove`
  - **Debt**: `debtManagementView`, `debtManagementCreate`, `debtManagementRead`, `debtManagementUpdate`, `debtManagementDelete`
  - **Accounting**: `accountingView`, `accountingCreate`, `accountingRead`, `accountingUpdate`, `accountingDelete`, `accountingPost`, `accountingLock`
  - Và các module khác...

### 3.2. Kiểm Tra Quyền
- **Route Level**: `PermissionGuard` kiểm tra quyền khi vào route
- **Action Level**: Kiểm tra quyền cụ thể cho từng action (create/edit)
- **Component Level**: Ẩn/hiện UI elements dựa trên quyền

### 3.3. Phân Cấp Dữ Liệu
- **customerSelf**: Chỉ xem khách hàng của mình
- **customerSubordinates**: Xem khách hàng của mình + cấp dưới
- **customerAll**: Xem tất cả khách hàng trong hệ thống
- Tương tự cho `staffSubordinates` và `staffAll`

---

## 4. Luồng Dữ Liệu

### 4.1. Kiến Trúc Dữ Liệu
```
Frontend Components
  ↓ (API calls)
Next.js API Routes (/app/api/*)
  ↓ (Supabase Client)
Supabase Database
  ├─ Tables (vehicles, customers, suppliers, contracts, transactions, etc.)
  ├─ Row Level Security (RLS) policies
  └─ Triggers & Functions
```

### 4.2. Quy Trình CRUD Điển Hình

**Ví dụ: Tạo xe mới**

1. **User truy cập** `/inventory/new`
2. **PermissionGuard** kiểm tra quyền `inventoryCreate`
3. **Component** (`VehicleFormPage`) render form
4. **User điền form** và submit
5. **Validation**:
   - Kiểm tra VIN đã tồn tại chưa
   - Validate các trường bắt buộc
   - Kiểm tra quyền (ví dụ: inventory staff không thể sửa giá)
6. **Upload files** (nếu có): Ảnh xe, tài liệu
7. **Insert vào database**:
   ```typescript
   const { data, error } = await supabase
     .from('vehicles')
     .insert({ ...formData })
     .select()
   ```
8. **Database triggers** tự động:
   - Tạo mã xe (code) theo format CTGF-XXXX
   - Cập nhật `updated_by` từ user hiện tại
   - Cập nhật thống kê liên quan
9. **Success**: Redirect đến `/inventory` hoặc `/inventory/[id]`
10. **Error**: Hiển thị thông báo lỗi

### 4.3. Row Level Security (RLS)
- Supabase RLS policies đảm bảo user chỉ truy cập được dữ liệu được phép
- Policies dựa trên:
  - User role
  - User permissions
  - User branch
  - Manager-subordinate relationships

---

## 5. Các Module Chính

### 5.1. Kho Xe (Inventory)
**Luồng:**
- **Xem danh sách**: `/inventory` → Fetch từ `vehicles` table
- **Thêm xe mới**: `/inventory/new` → Form → Insert → Auto-generate code
- **Chi tiết xe**: `/inventory/[id]` → View/Edit
- **Cập nhật trạng thái**: Available → Reserved → Sold → Delivered
- **Quản lý giá**: Giá nhập, Giá bán (có quyền `inventoryPrice`)

### 5.2. Nhà Cung Cấp (Suppliers)
**Luồng:**
- **Xem danh sách**: `/suppliers` → Filter theo type, status
- **Thêm nhà cung cấp**: `/suppliers/new` → Assign staff phụ trách
- **Chi tiết**: `/suppliers/[id]` → 
  - Thông tin cơ bản
  - Thông tin tài chính (công nợ, giá trị nhập)
  - Thông tin pháp lý (MST, CCCD)
  - Danh sách xe đã nhập
  - Lịch sử thanh toán
- **Quản lý công nợ**: Tự động tính từ transactions

### 5.3. Khách Hàng (CRM)
**Luồng:**
- **Xem danh sách**: `/crm` → Filter theo status, source, assigned staff
- **Thêm khách hàng**: `/crm/new` → Auto-assign current user
- **Chi tiết**: `/crm/[id]` → 
  - Thông tin cá nhân/doanh nghiệp
  - Lịch sử hợp đồng
  - Công nợ
  - Thống kê mua hàng
- **Phân quyền dữ liệu**: Self/Subordinates/All

### 5.4. Hợp Đồng (Contracts)
**Luồng:**
- **Tạo hợp đồng đặt cọc**: `/contracts/new` → Chọn xe → Chọn khách hàng → Nhập thông tin
- **Tạo hợp đồng mua bán**: Có thể convert từ hợp đồng đặt cọc
- **Quản lý trạng thái**: Draft → Pending Approval → Signed → Paying → Completed
- **Lịch thanh toán**: Payment schedules với milestones
- **Liên kết transactions**: Tự động tạo transaction khi thanh toán

### 5.5. Thu Chi & Dòng Tiền (Finance)
**Luồng:**
- **Xem danh sách**: `/finance` → Filter theo type, status, date range
- **Tạo giao dịch**: `/finance/new` → 
  - Chọn loại: Thu/Chi/Chuyển khoản
  - Chọn tài khoản
  - Liên kết với reference (Vehicle/Contract/Customer/Supplier)
- **Duyệt giao dịch**: Status: Draft → Pending → Approved → Locked
- **Quyền duyệt**: Cần `financeApprove` permission

### 5.6. Quản Lý Công Nợ (Debt)
**Luồng:**
- **Xem công nợ**: `/debt` → 
  - Công nợ phải thu (từ customers)
  - Công nợ phải trả (cho suppliers)
- **Thanh toán công nợ**: Tạo transaction → Link với debt record
- **Tự động tính toán**: Từ contracts và transactions

### 5.7. Kế Toán (Accounting)
**Luồng:**
- **Chart of Accounts**: Danh mục tài khoản kế toán
- **Phiếu kế toán**: Receipt/Payment/Transfer/Journal
- **Đăng phiếu**: Post voucher → Tạo accounting entries
- **Khóa phiếu**: Lock voucher → Không thể sửa/xóa

### 5.8. Nhân Sự (Staff)
**Luồng:**
- **Xem danh sách**: `/staff` → Filter theo role, branch, status
- **Thêm nhân sự**: `/staff/new` → 
  - Thông tin cá nhân
  - Tạo tài khoản hệ thống (username, password)
  - Phân quyền chi tiết
- **Chỉnh sửa**: `/staff/[id]/edit` → Cập nhật thông tin, quyền
- **Phân cấp**: Manager-subordinate relationships

---

## 6. Tích Hợp AI (Gemini)

### 6.1. Gemini Service
- Sử dụng Google Gemini AI để:
  - Phân tích dữ liệu
  - Đưa ra insights
  - Gợi ý hành động
- API Key được cấu hình trong `.env.local`

---

## 7. Services và Utilities

### 7.1. Services
- **supabaseClient.ts**: Kết nối Supabase
- **accountingSyncService.ts**: Đồng bộ dữ liệu kế toán
- **customerStatusService.ts**: Quản lý trạng thái khách hàng
- **debtService.ts**: Tính toán công nợ
- **vehicleStatusService.ts**: Quản lý trạng thái xe
- **geminiService.ts**: Tích hợp AI

### 7.2. Utilities
- **permissions.ts**: Helper functions kiểm tra quyền
- **vehicleTransactionStatus.tsx**: Quản lý trạng thái giao dịch xe

---

## 8. Database Schema (Tóm Tắt)

### 8.1. Core Tables
- **users**: Thông tin người dùng
- **permissions**: Quyền của từng user
- **vehicles**: Thông tin xe
- **customers**: Thông tin khách hàng
- **suppliers**: Thông tin nhà cung cấp
- **contracts**: Hợp đồng (đặt cọc, mua bán)
- **transactions**: Giao dịch thu chi
- **debt_records**: Công nợ
- **accounts**: Tài khoản tiền mặt/ngân hàng
- **chart_of_accounts**: Danh mục tài khoản kế toán
- **accounting_vouchers**: Phiếu kế toán
- **accounting_entries**: Bút toán kế toán
- **carriers**: Đơn vị vận chuyển
- **promotions**: Chương trình khuyến mãi

### 8.2. Relationships
- Vehicles ↔ Suppliers (many-to-one)
- Vehicles ↔ Contracts (one-to-many)
- Contracts ↔ Customers (many-to-one)
- Contracts ↔ Transactions (one-to-many)
- Transactions ↔ Accounts (many-to-one)
- Debt Records ↔ Customers/Suppliers (many-to-one)
- Users ↔ Permissions (one-to-one)

---

## 9. Luồng Nghiệp Vụ Điển Hình

### 9.1. Quy Trình Bán Xe Hoàn Chỉnh

```
1. Nhập xe vào kho
   └─ /inventory/new
      ├─ Chọn nhà cung cấp
      ├─ Nhập thông tin xe (VIN, model, giá nhập, giá bán)
      └─ Lưu → Xe có status "AVAILABLE"

2. Khách hàng quan tâm
   └─ /crm/new (nếu chưa có trong hệ thống)
      └─ Tạo khách hàng mới

3. Tạo hợp đồng đặt cọc
   └─ /contracts/new
      ├─ Chọn xe (status → "RESERVED")
      ├─ Chọn khách hàng
      ├─ Nhập số tiền đặt cọc
      └─ Tạo transaction thu tiền đặt cọc

4. Chuyển đổi thành hợp đồng mua bán
   └─ /contracts/[id]/edit
      ├─ Convert từ đặt cọc → mua bán
      ├─ Nhập đầy đủ thông tin (giá xe, VAT, phí đăng ký, bảo hiểm)
      ├─ Tạo payment schedule (nếu trả góp)
      └─ Status → "SIGNED"

5. Thanh toán
   └─ /finance/new
      ├─ Tạo transaction cho từng milestone
      ├─ Link với contract
      └─ Cập nhật paid_amount trong contract

6. Đăng ký xe
   └─ /registration
      ├─ Cập nhật thông tin đăng kiểm
      └─ Status → "REGISTRATION"

7. Bàn giao xe
   └─ /inventory/[id]/edit
      ├─ Status → "DELIVERED"
      └─ Transaction status → "Đã bàn giao"

8. Hoàn tất hợp đồng
   └─ /contracts/[id]
      ├─ Kiểm tra đã thanh toán đủ
      └─ Status → "COMPLETED"
```

### 9.2. Quy Trình Quản Lý Công Nợ

```
1. Nhập xe từ nhà cung cấp
   └─ Tự động tạo debt record (PAYABLE)
      ├─ total_amount = giá nhập
      └─ status = "NOT_DUE" hoặc "DUE"

2. Thanh toán cho nhà cung cấp
   └─ /finance/new
      ├─ Type: EXPENSE
      ├─ Reference: Supplier
      └─ Tự động cập nhật debt record
         ├─ paid_amount += amount
         └─ remaining_amount = total_amount - paid_amount

3. Theo dõi công nợ
   └─ /debt
      ├─ Xem danh sách công nợ phải trả
      ├─ Filter theo status (NOT_DUE/DUE/OVERDUE/PAID)
      └─ Xem lịch sử thanh toán
```

---

## 10. Bảo Mật và Validation

### 10.1. Frontend Validation
- Form validation trước khi submit
- Kiểm tra quyền trước khi hiển thị action buttons
- Client-side validation cho UX tốt hơn

### 10.2. Backend Security
- Row Level Security (RLS) policies trong Supabase
- API route validation
- Permission checks trong API routes
- SQL injection protection (Supabase handles)

### 10.3. Data Integrity
- Database constraints (foreign keys, unique constraints)
- Triggers tự động cập nhật (updated_by, timestamps)
- Transaction handling cho operations phức tạp

---

## 11. Performance và Optimization

### 11.1. Frontend
- Next.js App Router với Server Components
- Client Components chỉ khi cần interactivity
- Lazy loading cho images
- Code splitting tự động

### 11.2. Database
- Indexes trên các cột thường query
- RLS policies được optimize
- Pagination cho danh sách lớn

---

## 12. Error Handling

### 12.1. Frontend
- Try-catch blocks trong async operations
- Error states trong components
- User-friendly error messages
- Fallback UI khi có lỗi

### 12.2. Backend
- API routes return proper HTTP status codes
- Error messages không expose sensitive info
- Logging errors để debug

---

## 13. Deployment và Environment

### 13.1. Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `GEMINI_API_KEY`: Google Gemini API key

### 13.2. Build Process
```bash
npm run build  # Build production
npm start      # Start production server
npm run dev    # Development với Turbopack
```

---

## Kết Luận

Hệ thống GCM Manager được thiết kế với kiến trúc modular, phân quyền chi tiết, và luồng nghiệp vụ rõ ràng. Mỗi module hoạt động độc lập nhưng có liên kết chặt chẽ thông qua các relationships trong database, đảm bảo tính nhất quán và toàn vẹn dữ liệu.
