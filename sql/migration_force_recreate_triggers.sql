-- ============================================
-- Migration: Tái tạo lại tất cả trigger để đảm bảo không tham chiếu đến permissions
-- ============================================
-- File này tái tạo lại tất cả trigger trên bảng users để đảm bảo không có tham chiếu nào đến permissions
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Xóa tất cả trigger trên bảng users
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
DROP TRIGGER IF EXISTS generate_staff_code_trigger ON users;

-- ============================================
-- 2. Tái tạo function update_users_updated_at (đảm bảo không tham chiếu đến permissions)
-- ============================================

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ cập nhật updated_at, KHÔNG tham chiếu đến bất kỳ field nào khác
  -- Đặc biệt KHÔNG tham chiếu đến NEW.permissions
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Tái tạo trigger update_users_updated_at
-- ============================================

CREATE TRIGGER update_users_updated_at_trigger 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- 4. Tái tạo function generate_staff_code (đảm bảo không tham chiếu đến permissions)
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
  
  -- QUAN TRỌNG: KHÔNG tham chiếu đến NEW.permissions hoặc bất kỳ field nào khác ngoài username
  -- Chỉ trả về NEW với username đã được set
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Tái tạo trigger generate_staff_code
-- ============================================

CREATE TRIGGER generate_staff_code_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_code();

-- ============================================
-- 6. Kiểm tra lại các trigger đã được tạo
-- ============================================

DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '=== DANH SÁCH CÁC TRIGGER SAU KHI TÁI TẠO ===';
  FOR trigger_record IN 
    SELECT 
      trigger_name,
      event_manipulation,
      action_timing,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'users'
    AND event_object_schema = 'public'
  LOOP
    RAISE NOTICE 'Trigger: % | Event: % | Timing: %', 
      trigger_record.trigger_name, 
      trigger_record.event_manipulation,
      trigger_record.action_timing;
  END LOOP;
END $$;

-- ============================================
-- 7. Kiểm tra function definitions
-- ============================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== KIỂM TRA FUNCTION DEFINITIONS ===';
  FOR func_record IN 
    SELECT 
      p.proname as function_name,
      pg_get_functiondef(p.oid) as function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('update_users_updated_at', 'generate_staff_code')
  LOOP
    RAISE NOTICE 'Function: %', func_record.function_name;
    IF func_record.function_definition LIKE '%permissions%' THEN
      RAISE WARNING '⚠️ Function % vẫn còn tham chiếu đến permissions!', func_record.function_name;
    ELSE
      RAISE NOTICE '✅ Function % không tham chiếu đến permissions', func_record.function_name;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. Tất cả trigger trên bảng users đã được xóa và tái tạo lại
-- 2. Các function đã được đảm bảo không tham chiếu đến permissions
-- 3. Đã kiểm tra lại để đảm bảo không có tham chiếu nào đến permissions
--
-- Nếu vẫn còn lỗi, có thể cần:
-- 1. Kiểm tra xem có trigger nào khác không (từ extension hoặc từ Supabase)
-- 2. Refresh schema cache của Supabase
-- 3. Kiểm tra xem có view/materialized view nào đang select permissions không
-- ============================================
