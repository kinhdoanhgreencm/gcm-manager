-- ============================================
-- Migration: Thêm phân quyền chi tiết cho nhà cung cấp
-- ============================================
-- File này thêm các permission chi tiết mới cho module nhà cung cấp:
-- - supplierBasicInfo: Xem thông tin cơ bản (tên, loại, số xe, nhân viên phụ trách)
-- - supplierFinancialInfo: Xem thông tin tài chính (giá trị nhập, công nợ)
-- - supplierLegalInfo: Xem thông tin pháp lý (MST, CCCD, người đại diện)
-- - supplierVehicles: Xem danh sách xe đã nhập từ nhà cung cấp
-- - supplierPaymentHistory: Xem lịch sử thanh toán
-- - supplierDebtHistory: Xem lịch sử nợ
-- 
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Thêm các permission mới vào tất cả users hiện có
-- ============================================

UPDATE permissions
SET permissions = permissions || '{
  "supplierBasicInfo": false,
  "supplierFinancialInfo": false,
  "supplierLegalInfo": false,
  "supplierVehicles": false,
  "supplierPaymentHistory": false,
  "supplierDebtHistory": false
}'::jsonb
WHERE permissions IS NOT NULL;

-- ============================================
-- 2. Đảm bảo các permission mới được thêm vào (nếu chưa có)
-- ============================================

-- Sử dụng jsonb_set để thêm từng permission nếu chưa tồn tại
UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'supplierBasicInfo' THEN permissions ELSE jsonb_set(permissions, '{supplierBasicInfo}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'supplierFinancialInfo' THEN permissions ELSE jsonb_set(permissions, '{supplierFinancialInfo}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'supplierLegalInfo' THEN permissions ELSE jsonb_set(permissions, '{supplierLegalInfo}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'supplierVehicles' THEN permissions ELSE jsonb_set(permissions, '{supplierVehicles}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'supplierPaymentHistory' THEN permissions ELSE jsonb_set(permissions, '{supplierPaymentHistory}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'supplierDebtHistory' THEN permissions ELSE jsonb_set(permissions, '{supplierDebtHistory}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

-- ============================================
-- 3. Tạo permissions mặc định cho các user chưa có permissions
-- ============================================

INSERT INTO permissions (user_id, permissions)
SELECT 
  id,
  '{
    "dashboardView": false,
    "inventoryView": false,
    "inventoryCreate": false,
    "inventoryRead": false,
    "inventoryUpdate": false,
    "inventoryDelete": false,
    "inventoryVehicles": false,
    "inventoryPrice": false,
    "supplierView": false,
    "supplierCreate": false,
    "supplierRead": false,
    "supplierUpdate": false,
    "supplierDelete": false,
    "supplierInfo": false,
    "supplierDebt": false,
    "supplierBasicInfo": false,
    "supplierFinancialInfo": false,
    "supplierLegalInfo": false,
    "supplierVehicles": false,
    "supplierPaymentHistory": false,
    "supplierDebtHistory": false,
    "customerView": false,
    "customerCreate": false,
    "customerRead": false,
    "customerUpdate": false,
    "customerDelete": false,
    "customerSelf": false,
    "customerSubordinates": false,
    "customerAll": false,
    "staffView": false,
    "staffCreate": false,
    "staffRead": false,
    "staffUpdate": false,
    "staffDelete": false,
    "staffSubordinates": false,
    "staffAll": false,
    "contractsView": false,
    "contractsCreate": false,
    "contractsRead": false,
    "contractsUpdate": false,
    "contractsDelete": false,
    "contracts": false,
    "promotionsView": false,
    "promotionsCreate": false,
    "promotionsRead": false,
    "promotionsUpdate": false,
    "promotionsDelete": false,
    "carriersView": false,
    "carriersCreate": false,
    "carriersRead": false,
    "carriersUpdate": false,
    "carriersDelete": false,
    "financeView": false,
    "financeCreate": false,
    "financeRead": false,
    "financeUpdate": false,
    "financeDelete": false,
    "financeApprove": false,
    "finance": false,
    "debtManagementView": false,
    "debtManagementCreate": false,
    "debtManagementRead": false,
    "debtManagementUpdate": false,
    "debtManagementDelete": false,
    "debtManagement": false,
    "accountingView": false,
    "accountingCreate": false,
    "accountingRead": false,
    "accountingUpdate": false,
    "accountingDelete": false,
    "accountingPost": false,
    "accountingLock": false,
    "registrationView": false,
    "registrationUpdate": false,
    "registration": false,
    "reportsView": false,
    "reportsExport": false,
    "reports": false,
    "canManageContract": false,
    "canApproveFinance": false,
    "canViewReports": false,
    "canManageInventory": false,
    "canManageStaff": false
  }'::jsonb
FROM users
WHERE id NOT IN (SELECT user_id FROM permissions)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 4. Kiểm tra kết quả
-- ============================================

DO $$
DECLARE
  total_users INTEGER;
  users_with_permissions INTEGER;
  users_with_new_permissions INTEGER;
BEGIN
  -- Đếm tổng số users
  SELECT COUNT(*) INTO total_users FROM users;
  
  -- Đếm số users có permissions
  SELECT COUNT(*) INTO users_with_permissions FROM permissions;
  
  -- Đếm số users có các permission mới
  SELECT COUNT(*) INTO users_with_new_permissions 
  FROM permissions 
  WHERE permissions ? 'supplierBasicInfo' 
    AND permissions ? 'supplierFinancialInfo'
    AND permissions ? 'supplierLegalInfo'
    AND permissions ? 'supplierVehicles'
    AND permissions ? 'supplierPaymentHistory'
    AND permissions ? 'supplierDebtHistory';
  
  RAISE NOTICE '✅ Migration hoàn tất!';
  RAISE NOTICE '📊 Thống kê:';
  RAISE NOTICE '   - Tổng số users: %', total_users;
  RAISE NOTICE '   - Users có permissions: %', users_with_permissions;
  RAISE NOTICE '   - Users có permission mới: %', users_with_new_permissions;
  
  IF users_with_new_permissions < users_with_permissions THEN
    RAISE WARNING '⚠️ Một số users chưa có đầy đủ permission mới. Vui lòng kiểm tra lại.';
  END IF;
END $$;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. ✅ Tất cả users hiện có đã được thêm 6 permission mới (mặc định false)
-- 2. ✅ Các user mới sẽ có đầy đủ permission mới khi được tạo
-- 3. ✅ Các permission mới:
--    - supplierBasicInfo: Xem thông tin cơ bản
--    - supplierFinancialInfo: Xem thông tin tài chính
--    - supplierLegalInfo: Xem thông tin pháp lý
--    - supplierVehicles: Xem danh sách xe đã nhập
--    - supplierPaymentHistory: Xem lịch sử thanh toán
--    - supplierDebtHistory: Xem lịch sử nợ
--
-- Lưu ý: Sau khi chạy migration, admin cần cập nhật permissions cho các users
--        trong trang quản lý nhân sự để cấp quyền xem các thông tin chi tiết.
-- ============================================
