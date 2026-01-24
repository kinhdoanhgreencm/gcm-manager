-- ============================================
-- Migration: Sửa lỗi tham chiếu đến permissions trong users table
-- ============================================
-- File này kiểm tra và sửa các trigger, view, function có thể đang tham chiếu đến permissions
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Kiểm tra và xóa các view có thể tham chiếu đến permissions
-- ============================================

-- Kiểm tra xem có view nào tham chiếu đến users.permissions không
DO $$
DECLARE
  view_record RECORD;
BEGIN
  FOR view_record IN 
    SELECT viewname 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND definition LIKE '%users%permissions%'
  LOOP
    RAISE NOTICE 'Tìm thấy view có thể tham chiếu đến permissions: %', view_record.viewname;
  END LOOP;
END $$;

-- ============================================
-- 2. Kiểm tra và sửa trigger update_users_updated_at
-- ============================================

-- Đảm bảo trigger không tham chiếu đến permissions
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ cập nhật updated_at, không tham chiếu đến permissions
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Kiểm tra và sửa trigger generate_staff_code
-- ============================================

-- Đảm bảo trigger không tham chiếu đến permissions
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

-- ============================================
-- 4. Xóa comment cũ về permissions nếu còn
-- ============================================

-- Chỉ xóa comment nếu cột permissions còn tồn tại
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'permissions'
  ) THEN
    COMMENT ON COLUMN users.permissions IS NULL;
    RAISE NOTICE 'Đã xóa comment của cột permissions';
  ELSE
    RAISE NOTICE 'Cột permissions không tồn tại, bỏ qua việc xóa comment';
  END IF;
END $$;

-- ============================================
-- 5. Kiểm tra xem cột permissions có thực sự đã bị xóa chưa
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'permissions'
  ) THEN
    RAISE NOTICE '⚠️ CẢNH BÁO: Cột permissions vẫn còn tồn tại trong bảng users!';
    RAISE NOTICE 'Vui lòng chạy migration_drop_permissions_column.sql để xóa cột này.';
  ELSE
    RAISE NOTICE '✅ Cột permissions đã được xóa khỏi bảng users.';
  END IF;
END $$;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. Các trigger đã được cập nhật để không tham chiếu đến permissions
-- 2. Comment về permissions đã được xóa
-- 3. Đã kiểm tra xem cột permissions có còn tồn tại không
--
-- Nếu vẫn còn lỗi, có thể cần:
-- 1. Refresh schema cache của Supabase
-- 2. Kiểm tra xem có view hoặc function nào khác tham chiếu đến permissions không
-- ============================================
