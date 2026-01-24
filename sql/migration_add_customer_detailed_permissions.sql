-- ============================================
-- Migration: Thêm phân quyền chi tiết cho khách hàng
-- ============================================
-- File này thêm các permission chi tiết mới cho module khách hàng:
-- - customerBasicInfo: Xem thông tin cơ bản (tên, loại, số điện thoại, nguồn, NV phụ trách)
-- - customerFinancialInfo: Xem thông tin tài chính (doanh thu, công nợ)
-- - customerLegalInfo: Xem thông tin pháp lý (CCCD, MST, ngày sinh, giới tính, người đại diện)
-- - customerBankInfo: Xem thông tin ngân hàng
-- - customerContracts: Xem danh sách hợp đồng và số liệu liên quan
-- - customerPaymentHistory: Xem lịch sử thanh toán
-- - customerPurchaseHistory: Xem lịch sử mua hàng (xe đã bàn giao)
--
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Thêm các permission mới vào tất cả users hiện có
-- ============================================

UPDATE permissions
SET permissions = permissions || '{
  "customerBasicInfo": false,
  "customerFinancialInfo": false,
  "customerLegalInfo": false,
  "customerBankInfo": false,
  "customerContracts": false,
  "customerPaymentHistory": false,
  "customerPurchaseHistory": false
}'::jsonb
WHERE permissions IS NOT NULL;

-- ============================================
-- 2. Đảm bảo các permission mới được thêm vào (nếu chưa có)
-- ============================================

-- Sử dụng jsonb_set để thêm từng permission nếu chưa tồn tại
UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'customerBasicInfo' THEN permissions ELSE jsonb_set(permissions, '{customerBasicInfo}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'customerFinancialInfo' THEN permissions ELSE jsonb_set(permissions, '{customerFinancialInfo}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'customerLegalInfo' THEN permissions ELSE jsonb_set(permissions, '{customerLegalInfo}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'customerBankInfo' THEN permissions ELSE jsonb_set(permissions, '{customerBankInfo}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'customerContracts' THEN permissions ELSE jsonb_set(permissions, '{customerContracts}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'customerPaymentHistory' THEN permissions ELSE jsonb_set(permissions, '{customerPaymentHistory}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

UPDATE permissions
SET permissions = 
  COALESCE(
    CASE WHEN permissions ? 'customerPurchaseHistory' THEN permissions ELSE jsonb_set(permissions, '{customerPurchaseHistory}', 'false'::jsonb) END,
    '{}'::jsonb
  )
WHERE permissions IS NOT NULL;

-- ============================================
-- 3. (Tuỳ chọn) Tạo permissions mặc định cho các user chưa có permissions
--    Nếu hệ thống của bạn đã có logic khởi tạo mặc định, có thể bỏ qua phần này.
-- ============================================

-- Ví dụ (giữ lại cấu trúc giống migration nhà cung cấp, nhưng KHÔNG tạo lại toàn bộ JSON nếu không cần):
-- INSERT INTO permissions (user_id, permissions)
-- SELECT 
--   id,
--   jsonb_build_object(
--     'customerBasicInfo', false,
--     'customerFinancialInfo', false,
--     'customerLegalInfo', false,
--     'customerBankInfo', false,
--     'customerContracts', false,
--     'customerPaymentHistory', false,
--     'customerPurchaseHistory', false
--   )
-- FROM users
-- WHERE id NOT IN (SELECT user_id FROM permissions)
-- ON CONFLICT (user_id) DO NOTHING;

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
  WHERE permissions ? 'customerBasicInfo' 
    AND permissions ? 'customerFinancialInfo'
    AND permissions ? 'customerLegalInfo'
    AND permissions ? 'customerBankInfo'
    AND permissions ? 'customerContracts'
    AND permissions ? 'customerPaymentHistory'
    AND permissions ? 'customerPurchaseHistory';
  
  RAISE NOTICE '✅ Migration phân quyền khách hàng hoàn tất!';
  RAISE NOTICE '📊 Thống kê:';
  RAISE NOTICE '   - Tổng số users: %', total_users;
  RAISE NOTICE '   - Users có permissions: %', users_with_permissions;
  RAISE NOTICE '   - Users có permission chi tiết mới: %', users_with_new_permissions;
  
  IF users_with_new_permissions < users_with_permissions THEN
    RAISE WARNING '⚠️ Một số users chưa có đầy đủ permission chi tiết mới. Vui lòng kiểm tra lại.';
  END IF;
END $$;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 1. ✅ Tất cả users hiện có sẽ có thêm 7 permission chi tiết cho khách hàng (mặc định false)
-- 2. ✅ Bạn có thể cấp quyền chi tiết trong màn hình phân quyền nhân sự
-- 3. ✅ Frontend đã sử dụng các key:
--    - customerBasicInfo
--    - customerFinancialInfo
--    - customerLegalInfo
--    - customerBankInfo
--    - customerContracts
--    - customerPaymentHistory
--    - customerPurchaseHistory
-- ============================================

