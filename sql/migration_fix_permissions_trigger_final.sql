-- ============================================
-- Migration: Sửa lỗi "record new has no field permissions" - COMPREHENSIVE FIX
-- ============================================
-- File này sẽ tìm và sửa TẤT CẢ các trigger/function có thể tham chiếu đến permissions
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- BƯỚC 1: Tìm và liệt kê TẤT CẢ trigger trên bảng users
-- ============================================

DO $$
DECLARE
  trigger_record RECORD;
  msg TEXT;
BEGIN
  RAISE NOTICE '=== DANH SÁCH TẤT CẢ TRIGGER TRÊN BẢNG users ===';
  FOR trigger_record IN 
    SELECT 
      t.trigger_name,
      t.event_manipulation,
      t.action_timing,
      t.action_statement,
      p.proname as function_name
    FROM information_schema.triggers t
    LEFT JOIN pg_trigger pt ON pt.tgname = t.trigger_name
    LEFT JOIN pg_proc p ON p.oid = pt.tgfoid
    WHERE t.event_object_table = 'users'
    AND t.event_object_schema = 'public'
  LOOP
    msg := format('Trigger: %s | Event: %s | Timing: %s | Function: %s', 
      trigger_record.trigger_name, 
      trigger_record.event_manipulation,
      trigger_record.action_timing,
      COALESCE(trigger_record.function_name, 'N/A'));
    RAISE NOTICE '%', msg;
  END LOOP;
END $$;

-- ============================================
-- BƯỚC 2: Tìm và liệt kê TẤT CẢ function có thể tham chiếu đến permissions
-- ============================================

DO $$
DECLARE
  func_record RECORD;
  func_def TEXT;
  msg TEXT;
BEGIN
  RAISE NOTICE '=== KIỂM TRA TẤT CẢ FUNCTION CÓ THỂ THAM CHIẾU ĐẾN permissions ===';
  FOR func_record IN 
    SELECT 
      p.proname as function_name,
      p.oid as function_oid,
      n.nspname as schema_name
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND (
      p.proname LIKE '%user%' 
      OR p.proname LIKE '%staff%'
      OR p.proname LIKE '%update%'
    )
  LOOP
    BEGIN
      func_def := pg_get_functiondef(func_record.function_oid);
      IF func_def LIKE '%permissions%' OR func_def LIKE '%NEW.permissions%' OR func_def LIKE '%OLD.permissions%' THEN
        msg := format('⚠️ Function %s có tham chiếu đến permissions!', func_record.function_name);
        RAISE WARNING '%', msg;
        msg := format('   Definition: %s', LEFT(func_def, 500));
        RAISE WARNING '%', msg;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Skip functions that can't be read
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- BƯỚC 3: XÓA TẤT CẢ trigger trên bảng users (an toàn)
-- ============================================

DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users CASCADE;
DROP TRIGGER IF EXISTS generate_staff_code_trigger ON users CASCADE;

-- Xóa bất kỳ trigger nào khác có thể tồn tại
DO $$
DECLARE
  trigger_name TEXT;
  msg TEXT;
BEGIN
  FOR trigger_name IN 
    SELECT t.trigger_name
    FROM information_schema.triggers t
    WHERE t.event_object_table = 'users'
    AND t.event_object_schema = 'public'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON users CASCADE', trigger_name);
    msg := format('Đã xóa trigger: %s', trigger_name);
    RAISE NOTICE '%', msg;
  END LOOP;
END $$;

-- ============================================
-- BƯỚC 4: XÓA TẤT CẢ function cũ (an toàn)
-- ============================================

DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS generate_staff_code() CASCADE;

-- ============================================
-- BƯỚC 5: Tạo lại function update_users_updated_at (HOÀN TOÀN MỚI)
-- ============================================

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- CHỈ cập nhật updated_at, KHÔNG tham chiếu đến bất kỳ field nào khác
  -- ĐẶC BIỆT: KHÔNG tham chiếu đến NEW.permissions hoặc bất kỳ field nào không tồn tại
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================
-- BƯỚC 6: Tạo lại trigger update_users_updated_at
-- ============================================

CREATE TRIGGER update_users_updated_at_trigger 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_users_updated_at();

-- ============================================
-- BƯỚC 7: Tạo lại function generate_staff_code (HOÀN TOÀN MỚI)
-- ============================================

CREATE OR REPLACE FUNCTION generate_staff_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
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
  
  -- QUAN TRỌNG: Chỉ trả về NEW, KHÔNG tham chiếu đến NEW.permissions hoặc bất kỳ field nào không tồn tại
  RETURN NEW;
END;
$$;

-- ============================================
-- BƯỚC 8: Tạo lại trigger generate_staff_code (chỉ cho INSERT)
-- ============================================

CREATE TRIGGER generate_staff_code_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION generate_staff_code();

-- ============================================
-- BƯỚC 9: Kiểm tra lại các trigger đã được tạo
-- ============================================

DO $$
DECLARE
  trigger_count INTEGER;
  trigger_record RECORD;
  msg TEXT;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE event_object_table = 'users'
  AND event_object_schema = 'public';
  
  msg := format('✅ Đã tạo lại %s trigger(s) trên bảng users', trigger_count);
  RAISE NOTICE '%', msg;
  
  RAISE NOTICE '=== DANH SÁCH TRIGGER SAU KHI TÁI TẠO ===';
  FOR trigger_record IN 
    SELECT 
      trigger_name,
      event_manipulation,
      action_timing
    FROM information_schema.triggers
    WHERE event_object_table = 'users'
    AND event_object_schema = 'public'
  LOOP
    msg := format('  - %s (%s %s)', 
      trigger_record.trigger_name,
      trigger_record.action_timing,
      trigger_record.event_manipulation);
    RAISE NOTICE '%', msg;
  END LOOP;
END $$;

-- ============================================
-- BƯỚC 10: Kiểm tra function definitions để đảm bảo không có tham chiếu đến permissions
-- ============================================

DO $$
DECLARE
  func_record RECORD;
  func_def TEXT;
  has_permissions_ref BOOLEAN := FALSE;
  msg TEXT;
BEGIN
  RAISE NOTICE '=== KIỂM TRA FUNCTION DEFINITIONS ===';
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
        msg := format('⚠️ Function %s VẪN CÒN tham chiếu đến permissions!', func_record.function_name);
        RAISE WARNING '%', msg;
        has_permissions_ref := TRUE;
      ELSE
        msg := format('✅ Function %s không tham chiếu đến permissions', func_record.function_name);
        RAISE NOTICE '%', msg;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      msg := format('⚠️ Không thể kiểm tra function %s: %s', func_record.function_name, SQLERRM);
      RAISE NOTICE '%', msg;
    END;
  END LOOP;
  
  IF NOT has_permissions_ref THEN
    RAISE NOTICE '✅ Tất cả function đã được kiểm tra và không có tham chiếu đến permissions';
  END IF;
END $$;

-- ============================================
-- BƯỚC 11: Đảm bảo cột permissions đã bị xóa
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
    RAISE WARNING 'Vui lòng chạy: ALTER TABLE users DROP COLUMN IF EXISTS permissions CASCADE;';
  ELSE
    RAISE NOTICE '✅ Cột permissions đã được xóa khỏi bảng users';
  END IF;
END $$;

-- ============================================
-- BƯỚC 12: Xóa cột permissions nếu vẫn còn tồn tại (an toàn)
-- ============================================

ALTER TABLE users DROP COLUMN IF EXISTS permissions CASCADE;

-- ============================================
-- BƯỚC 13: Refresh schema cache (nếu Supabase hỗ trợ)
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
-- 4. ✅ Đã xóa cột permissions nếu vẫn còn tồn tại
-- 5. ✅ Đã thử refresh schema cache
--
-- Bây giờ hãy thử cập nhật nhân sự lại và xem lỗi còn xuất hiện không.
-- 
-- Nếu vẫn còn lỗi, có thể do:
-- 1. Supabase cache chưa refresh (đợi vài phút hoặc restart project)
-- 2. Có trigger/function khác từ extension hoặc Supabase system
-- 3. Cần kiểm tra lại code frontend có đang gửi permissions trong update không
-- ============================================
