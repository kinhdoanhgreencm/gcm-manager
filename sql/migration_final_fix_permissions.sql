-- ============================================
-- Migration: Sửa lỗi "record new has no field permissions" - FINAL FIX
-- ============================================
-- File này sẽ sửa hoàn toàn lỗi bằng cách:
-- 1. Xóa và tái tạo lại tất cả trigger
-- 2. Đảm bảo không có tham chiếu nào đến permissions
-- 3. Refresh schema cache
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- BƯỚC 1: Xóa tất cả trigger trên bảng users
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
DROP TRIGGER IF EXISTS generate_staff_code_trigger ON users;

-- ============================================
-- BƯỚC 2: Xóa các function cũ (nếu có)
-- ============================================

DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_staff_code() CASCADE;

-- ============================================
-- BƯỚC 3: Tạo lại function update_users_updated_at (HOÀN TOÀN MỚI, KHÔNG THAM CHIẾU ĐẾN PERMISSIONS)
-- ============================================

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- CHỈ cập nhật updated_at, KHÔNG tham chiếu đến bất kỳ field nào khác
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- BƯỚC 4: Tạo lại trigger update_users_updated_at
-- ============================================

CREATE TRIGGER update_users_updated_at_trigger 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- BƯỚC 5: Tạo lại function generate_staff_code (HOÀN TOÀN MỚI, KHÔNG THAM CHIẾU ĐẾN PERMISSIONS)
-- ============================================

CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Chỉ xử lý username, KHÔNG tham chiếu đến bất kỳ field nào khác
  IF NEW.username IS NULL OR NEW.username = '' THEN
    -- Lấy số thứ tự tiếp theo
    SELECT COALESCE(MAX(
      CASE 
        WHEN username ~ '^NV-[0-9]+$' THEN 
          CAST(SUBSTRING(username FROM 4) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM users;
    
    -- Format mã: NV-001, NV-002, ...
    new_code := 'NV-' || LPAD(next_number::TEXT, 3, '0');
    
    -- Đảm bảo mã là duy nhất
    WHILE EXISTS (SELECT 1 FROM users WHERE username = new_code) LOOP
      next_number := next_number + 1;
      new_code := 'NV-' || LPAD(next_number::TEXT, 3, '0');
    END LOOP;
    
    NEW.username := new_code;
  END IF;
  
  -- QUAN TRỌNG: Chỉ trả về NEW, KHÔNG tham chiếu đến NEW.permissions
  RETURN NEW;
END;
$$;

-- ============================================
-- BƯỚC 6: Tạo lại trigger generate_staff_code
-- ============================================

CREATE TRIGGER generate_staff_code_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_code();

-- ============================================
-- BƯỚC 7: Kiểm tra lại các trigger đã được tạo
-- ============================================

DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'users'
  AND event_object_schema = 'public';
  
  RAISE NOTICE '✅ Đã tạo lại % trigger(s) trên bảng users', trigger_count;
END $$;

-- ============================================
-- BƯỚC 8: Kiểm tra function definitions để đảm bảo không có tham chiếu đến permissions
-- ============================================

DO $$
DECLARE
  func_record RECORD;
  func_def TEXT;
  has_permissions_ref BOOLEAN := FALSE;
BEGIN
  FOR func_record IN 
    SELECT 
      p.proname as function_name,
      p.oid as function_oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN ('update_users_updated_at', 'generate_staff_code')
  LOOP
    BEGIN
      func_def := pg_get_functiondef(func_record.function_oid);
      IF func_def LIKE '%permissions%' OR func_def LIKE '%NEW.permissions%' OR func_def LIKE '%OLD.permissions%' THEN
        RAISE WARNING '⚠️ Function % VẪN CÒN tham chiếu đến permissions!', func_record.function_name;
        has_permissions_ref := TRUE;
      ELSE
        RAISE NOTICE '✅ Function % không tham chiếu đến permissions', func_record.function_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Không thể kiểm tra function %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
  
  IF NOT has_permissions_ref THEN
    RAISE NOTICE '✅ Tất cả function đã được kiểm tra và không có tham chiếu đến permissions';
  END IF;
END $$;

-- ============================================
-- BƯỚC 9: Đảm bảo cột permissions đã bị xóa
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND table_schema = 'public'
    AND column_name = 'permissions'
  ) THEN
    RAISE WARNING '⚠️ CẢNH BÁO: Cột permissions VẪN CÒN TỒN TẠI trong bảng users!';
    RAISE WARNING 'Vui lòng chạy: ALTER TABLE users DROP COLUMN permissions;';
  ELSE
    RAISE NOTICE '✅ Cột permissions đã được xóa khỏi bảng users';
  END IF;
END $$;

-- ============================================
-- BƯỚC 10: Thử refresh schema cache (nếu Supabase hỗ trợ)
-- ============================================

-- Gửi notification để refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. ✅ Tất cả trigger đã được xóa và tái tạo lại
-- 2. ✅ Các function đã được đảm bảo không tham chiếu đến permissions
-- 3. ✅ Đã kiểm tra lại để đảm bảo không có tham chiếu nào đến permissions
-- 4. ✅ Đã thử refresh schema cache
--
-- Bây giờ hãy thử cập nhật nhân sự lại và xem lỗi còn xuất hiện không.
-- 
-- Nếu vẫn còn lỗi, có thể do:
-- 1. Supabase cache chưa refresh (đợi vài phút)
-- 2. Có trigger/function khác từ extension hoặc Supabase system
-- 3. Cần restart Supabase project
-- ============================================
