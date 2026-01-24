-- ============================================
-- GCM Manager - Users & Accounts Table Setup
-- ============================================
-- File này chứa các câu lệnh SQL để thiết lập bảng tài khoản và người dùng
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Tạo bảng users (Tài khoản đăng nhập)
-- ============================================

CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- Mật khẩu (plain text)
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'SALES_CONSULTANT' CHECK (role IN ('STRATEGIC_DIRECTOR', 'BUSINESS_DIRECTOR', 'OPERATIONS_DIRECTOR', 'DIRECTOR', 'SALES_MANAGER', 'ACCOUNTANT', 'IT', 'SALES_CONSULTANT', 'ADMIN', 'INVENTORY')),
  branch TEXT NOT NULL DEFAULT 'GCM-Tổng',
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  manager_id UUID REFERENCES users(id) ON DELETE SET NULL,
  join_date DATE DEFAULT CURRENT_DATE,
  
  -- Permissions (JSONB để lưu trữ linh hoạt)
  permissions JSONB DEFAULT '{
    "canManageContract": false,
    "canApproveFinance": false,
    "canViewReports": false,
    "canManageInventory": false,
    "canManageStaff": false
  }'::jsonb,
  
  -- Avatar URL (từ Supabase Storage)
  avatar_url TEXT,
  
  -- Personal Information
  date_of_birth DATE,         -- Ngày tháng năm sinh
  id_card TEXT,              -- Số CCCD/CMND
  id_card_issue_date DATE,    -- Ngày cấp CCCD
  id_card_issue_place TEXT,   -- Nơi cấp CCCD
  bank_name TEXT,             -- Tên ngân hàng
  bank_account TEXT,          -- Tài khoản ngân hàng
  professional_level TEXT,     -- Trình độ chuyên môn
  permanent_address TEXT,     -- Địa chỉ hộ khẩu
  current_address TEXT,       -- Nơi ở hiện tại
  tax_code TEXT,             -- MST (Mã số thuế)
  dependents INTEGER DEFAULT 0, -- Người phụ thuộc
  
  -- Metadata
  notes TEXT,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration: Thêm các cột mới nếu bảng đã tồn tại
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_issue_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS id_card_issue_place TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_level TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS permanent_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_address TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tax_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS dependents INTEGER DEFAULT 0;

-- Migration: Đổi tên cột password_hash thành password nếu bảng đã tồn tại
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE users RENAME COLUMN password_hash TO password;
  END IF;
END $$;

-- ============================================
-- 2. Tạo Indexes cho bảng users
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_branch ON users(branch);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================
-- 3. Tạo Function để tự động generate mã nhân viên
-- ============================================

CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Lấy số thứ tự tiếp theo từ các user đã có
  SELECT COALESCE(MAX(
    CASE 
      WHEN username ~ '^NV-[0-9]+$' THEN 
        CAST(SUBSTRING(username FROM 4) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM users;
  
  -- Format mã: NV-001, NV-002, ... NV-999
  new_code := 'NV-' || LPAD(next_number::TEXT, 3, '0');
  
  -- Đảm bảo mã là duy nhất (nếu trùng thì tăng số lên)
  WHILE EXISTS (SELECT 1 FROM users WHERE username = new_code) LOOP
    next_number := next_number + 1;
    new_code := 'NV-' || LPAD(next_number::TEXT, 3, '0');
  END LOOP;
  
  -- Chỉ set username nếu chưa có
  IF NEW.username IS NULL OR NEW.username = '' THEN
    NEW.username := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động generate username nếu chưa có
DROP TRIGGER IF EXISTS generate_staff_code_trigger ON users;

CREATE TRIGGER generate_staff_code_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_code();

-- ============================================
-- 4. (Đã bỏ - không dùng hash password)
-- ============================================

-- ============================================
-- 5. Tạo Trigger để tự động cập nhật updated_at
-- ============================================

-- Sử dụng function update_updated_at_column() đã có từ database_setup.sql
-- Nếu chưa có, tạo mới:

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;

CREATE TRIGGER update_users_updated_at_trigger 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- 6. Cấu hình Row Level Security (RLS)
-- ============================================

-- Vì không dùng Supabase Auth, disable RLS để quản lý hoàn toàn ở application layer
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Nếu muốn bật RLS sau này, có thể uncomment và tạo policies phù hợp:
/*
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép tất cả authenticated users (từ application) xem users
CREATE POLICY "Authenticated users can view" ON users
  FOR SELECT
  USING (true);

-- Policy: Cho phép tất cả authenticated users (từ application) quản lý users
CREATE POLICY "Authenticated users can manage" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);
*/

-- ============================================
-- 7. Tạo View để thống kê users
-- ============================================

CREATE OR REPLACE VIEW users_summary AS
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
  COUNT(*) FILTER (WHERE status = 'INACTIVE') as inactive_count,
  COUNT(*) FILTER (WHERE role = 'MANAGER') as manager_count,
  COUNT(*) FILTER (WHERE role = 'SALES') as sales_count,
  COUNT(*) FILTER (WHERE role = 'ACCOUNTANT') as accountant_count,
  COUNT(*) FILTER (WHERE role = 'INVENTORY') as inventory_count,
  COUNT(*) FILTER (WHERE role = 'LEGAL') as legal_count
FROM users;

-- ============================================
-- 8. Comments và mô tả các trường
-- ============================================

COMMENT ON TABLE users IS 'Bảng lưu trữ thông tin tài khoản và người dùng hệ thống';
COMMENT ON COLUMN users.username IS 'Tên đăng nhập (unique), có thể tự động generate theo format NV-XXX';
COMMENT ON COLUMN users.email IS 'Email của người dùng (unique)';
COMMENT ON COLUMN users.password IS 'Mật khẩu (plain text)';
COMMENT ON COLUMN users.full_name IS 'Họ và tên đầy đủ';
COMMENT ON COLUMN users.role IS 'Vai trò: STRATEGIC_DIRECTOR (Giám đốc chiến lược), BUSINESS_DIRECTOR (Giám đốc kinh doanh), OPERATIONS_DIRECTOR (Giám đốc vận hành), DIRECTOR (Giám đốc), SALES_MANAGER (Trưởng phòng kinh doanh), ACCOUNTANT (Kế toán), IT, SALES_CONSULTANT (Tư vấn bán hàng), ADMIN, INVENTORY (Nhân viên kho)';
COMMENT ON COLUMN users.branch IS 'Chi nhánh làm việc';
COMMENT ON COLUMN users.status IS 'Trạng thái: ACTIVE (Đang làm việc), INACTIVE (Đã nghỉ)';
COMMENT ON COLUMN users.manager_id IS 'ID của người quản lý trực tiếp';
COMMENT ON COLUMN users.permissions IS 'Quyền hạn dưới dạng JSON: canManageContract, canApproveFinance, canViewReports, canManageInventory, canManageStaff';
COMMENT ON COLUMN users.avatar_url IS 'URL ảnh đại diện từ Supabase Storage';
COMMENT ON COLUMN users.last_login_at IS 'Thời gian đăng nhập lần cuối';

-- ============================================
-- 9. Tài khoản Admin mặc định
-- ============================================

-- Tài khoản Admin/Manager mặc định
-- Email: admin@greencm.vn
-- Password: admingcmvn
INSERT INTO users (
  username, 
  email, 
  password, 
  full_name, 
  phone, 
  role, 
  branch, 
  status,
  permissions
) VALUES (
  'admin',
  'admin@greencm.vn',
  'admingcmvn', -- Mật khẩu plain text
  'Administrator',
  NULL,
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
) ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 10. (Đã bỏ - verify password ở application layer)
-- ============================================

-- ============================================
-- 11. Kiểm tra cấu trúc bảng sau khi tạo
-- ============================================

-- Chạy câu lệnh này để xem cấu trúc bảng:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- ORDER BY ordinal_position;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. Tài khoản admin đã được tạo tự động:
--    - Username: admin
--    - Email: admin@greencm.vn
--    - Password: admingcmvn
--
-- 2. Đăng nhập tại: /login
--
-- 3. Lưu ý: Mật khẩu được lưu dạng plain text (không hash)
--    Chỉ phù hợp cho môi trường development/internal
--
-- ============================================

