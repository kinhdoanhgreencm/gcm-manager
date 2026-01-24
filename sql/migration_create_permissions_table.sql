-- ============================================
-- Migration: Tạo bảng permissions riêng
-- ============================================
-- File này tạo bảng permissions riêng để lưu trữ quyền hạn của user
-- Thay vì lưu trong bảng users, permissions sẽ được lưu trong bảng riêng
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Tạo bảng permissions
-- ============================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- 2. Tạo Indexes cho bảng permissions
-- ============================================

CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_permissions_created_at ON permissions(created_at DESC);

-- ============================================
-- 3. Tạo Trigger để tự động cập nhật updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_permissions_updated_at_trigger ON permissions;

CREATE TRIGGER update_permissions_updated_at_trigger 
  BEFORE UPDATE ON permissions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_permissions_updated_at();

-- ============================================
-- 4. Migrate dữ liệu từ users.permissions sang bảng permissions
-- ============================================

-- Chỉ migrate nếu cột permissions còn tồn tại trong bảng users
DO $$
BEGIN
  -- Kiểm tra xem cột permissions có tồn tại không
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'permissions'
  ) THEN
    -- Migrate dữ liệu từ users.permissions sang bảng permissions
    INSERT INTO permissions (user_id, permissions)
    SELECT 
      id,
      COALESCE(permissions, '{}'::jsonb)
    FROM users
    WHERE permissions IS NOT NULL
    ON CONFLICT (user_id) DO UPDATE
    SET permissions = EXCLUDED.permissions;
    
    RAISE NOTICE 'Đã migrate dữ liệu permissions từ bảng users sang bảng permissions';
  ELSE
    RAISE NOTICE 'Cột permissions không tồn tại trong bảng users, bỏ qua bước migrate';
  END IF;
END $$;

-- ============================================
-- 5. Tạo permissions mặc định cho các user chưa có
-- ============================================

-- Tạo permissions mặc định (tất cả false) cho các user chưa có permissions
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
-- 6. Xóa cột permissions khỏi bảng users (sau khi đã migrate)
-- ============================================

-- Chỉ xóa nếu cột permissions còn tồn tại
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE users DROP COLUMN permissions;
    RAISE NOTICE 'Đã xóa cột permissions khỏi bảng users';
  ELSE
    RAISE NOTICE 'Cột permissions không tồn tại trong bảng users';
  END IF;
END $$;

-- ============================================
-- 7. Comments và mô tả
-- ============================================

COMMENT ON TABLE permissions IS 'Bảng lưu trữ quyền hạn của người dùng, tách riêng khỏi bảng users';
COMMENT ON COLUMN permissions.user_id IS 'ID của user (foreign key đến bảng users)';
COMMENT ON COLUMN permissions.permissions IS 'Quyền hạn dưới dạng JSONB, chứa tất cả các quyền của user';

-- ============================================
-- 8. Cấu hình Row Level Security (RLS)
-- ============================================

-- Disable RLS để quản lý hoàn toàn ở application layer
ALTER TABLE permissions DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. Bảng permissions đã được tạo với foreign key đến users
-- 2. Dữ liệu permissions đã được migrate từ users.permissions
-- 3. Cột permissions đã được xóa khỏi bảng users
-- 4. Tất cả users chưa có permissions đã được tạo permissions mặc định
--
-- Lưu ý: Cần cập nhật code để sử dụng bảng permissions mới
-- ============================================
