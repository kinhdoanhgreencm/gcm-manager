-- ============================================
-- Migration: Add OPERATIONS_DIRECTOR and DIRECTOR roles
-- ============================================
-- File này thêm 2 vai trò mới (OPERATIONS_DIRECTOR và DIRECTOR) vào constraint users_role_check
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Bước 1: Xóa constraint cũ
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Xóa tất cả các constraint check trên cột role
  FOR r IN (
    SELECT constraint_name 
    FROM information_schema.table_constraints 
    WHERE table_name = 'users' 
      AND constraint_type = 'CHECK'
      AND constraint_name LIKE '%role%'
  ) LOOP
    EXECUTE 'ALTER TABLE users DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
  END LOOP;
END $$;

-- Bước 2: Tạo lại constraint với các giá trị mới (bao gồm OPERATIONS_DIRECTOR và DIRECTOR)
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'STRATEGIC_DIRECTOR',
  'BUSINESS_DIRECTOR',
  'OPERATIONS_DIRECTOR',
  'DIRECTOR',
  'SALES_MANAGER',
  'ACCOUNTANT',
  'IT',
  'SALES_CONSULTANT',
  'ADMIN',
  'INVENTORY'
));

-- Bước 3: Kiểm tra constraint đã được tạo thành công
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Các vai trò hợp lệ hiện tại:
-- - STRATEGIC_DIRECTOR (Giám đốc chiến lược)
-- - BUSINESS_DIRECTOR (Giám đốc kinh doanh)
-- - OPERATIONS_DIRECTOR (Giám đốc vận hành) [MỚI]
-- - DIRECTOR (Giám đốc) [MỚI]
-- - SALES_MANAGER (Trưởng phòng kinh doanh)
-- - ACCOUNTANT (Kế toán)
-- - IT
-- - SALES_CONSULTANT (Tư vấn bán hàng)
-- - ADMIN
-- - INVENTORY (Nhân viên kho)
-- ============================================
