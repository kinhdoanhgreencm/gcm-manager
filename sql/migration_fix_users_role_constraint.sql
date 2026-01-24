-- ============================================
-- Migration: Fix users_role_check constraint
-- ============================================
-- File này sửa constraint role trong bảng users để đảm bảo đúng với các giá trị được phép
-- Chạy file này trong SQL Editor của Supabase Dashboard nếu gặp lỗi users_role_check
-- ============================================

-- Bước 1: Kiểm tra các giá trị role hiện tại (chạy để xem)
SELECT DISTINCT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- Bước 2: Xóa constraint cũ trước (để có thể cập nhật dữ liệu)
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

-- Bước 3: Cập nhật các giá trị role không hợp lệ thành giá trị hợp lệ
-- Các giá trị hợp lệ: STRATEGIC_DIRECTOR, BUSINESS_DIRECTOR, SALES_MANAGER, ACCOUNTANT, IT, SALES_CONSULTANT, ADMIN, INVENTORY

-- Cập nhật các giá trị role không hợp lệ (ví dụ: MANAGER -> ADMIN, SALES -> SALES_CONSULTANT, etc.)
UPDATE users 
SET role = CASE 
  WHEN role = 'MANAGER' THEN 'ADMIN'
  WHEN role = 'SALES' THEN 'SALES_CONSULTANT'
  WHEN role = 'LEGAL' THEN 'ADMIN'
  WHEN role IS NULL OR role = '' THEN 'SALES_CONSULTANT'
  WHEN UPPER(TRIM(role)) NOT IN (
    'STRATEGIC_DIRECTOR', 'BUSINESS_DIRECTOR', 'SALES_MANAGER', 
    'ACCOUNTANT', 'IT', 'SALES_CONSULTANT', 'ADMIN', 'INVENTORY'
  ) THEN 'SALES_CONSULTANT'
  ELSE UPPER(TRIM(role))
END
WHERE role IS NULL 
   OR role = ''
   OR UPPER(TRIM(role)) NOT IN (
     'STRATEGIC_DIRECTOR', 'BUSINESS_DIRECTOR', 'SALES_MANAGER', 
     'ACCOUNTANT', 'IT', 'SALES_CONSULTANT', 'ADMIN', 'INVENTORY'
   );

-- Normalize tất cả các giá trị role (uppercase và trim)
UPDATE users 
SET role = UPPER(TRIM(role))
WHERE role != UPPER(TRIM(role));

-- Tạo lại constraint với các giá trị đúng
ALTER TABLE users 
ADD CONSTRAINT users_role_check 
CHECK (role IN (
  'STRATEGIC_DIRECTOR',
  'BUSINESS_DIRECTOR', 
  'SALES_MANAGER',
  'ACCOUNTANT',
  'IT',
  'SALES_CONSULTANT',
  'ADMIN',
  'INVENTORY'
));

-- Kiểm tra constraint đã được tạo
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'users_role_check';

-- ============================================
-- Hoàn tất!
-- ============================================

