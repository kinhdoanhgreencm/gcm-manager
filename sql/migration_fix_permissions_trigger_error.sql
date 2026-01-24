-- ============================================
-- Migration: Sửa lỗi trigger "record new has no field permissions"
-- ============================================
-- File này kiểm tra và sửa tất cả các trigger, function, view có thể đang tham chiếu đến permissions
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Kiểm tra và liệt kê tất cả các trigger trên bảng users
-- ============================================

DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE '=== DANH SÁCH CÁC TRIGGER TRÊN BẢNG users ===';
  FOR trigger_record IN 
    SELECT 
      trigger_name,
      event_manipulation,
      action_statement
    FROM information_schema.triggers
    WHERE event_object_table = 'users'
    AND event_object_schema = 'public'
  LOOP
    RAISE NOTICE 'Trigger: % | Event: % | Statement: %', 
      trigger_record.trigger_name, 
      trigger_record.event_manipulation,
      trigger_record.action_statement;
  END LOOP;
END $$;

-- ============================================
-- 2. Kiểm tra và liệt kê tất cả các function có thể tham chiếu đến permissions
-- ============================================

DO $$
DECLARE
  func_record RECORD;
BEGIN
  RAISE NOTICE '=== KIỂM TRA CÁC FUNCTION CÓ THỂ THAM CHIẾU ĐẾN permissions ===';
  FOR func_record IN 
    SELECT 
      routine_name,
      routine_definition
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND (
      routine_definition LIKE '%permissions%' 
      OR routine_definition LIKE '%NEW.%' 
      OR routine_definition LIKE '%OLD.%'
    )
  LOOP
    RAISE NOTICE 'Function: %', func_record.routine_name;
  END LOOP;
END $$;

-- ============================================
-- 3. Đảm bảo trigger update_users_updated_at không tham chiếu đến permissions
-- ============================================

CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ cập nhật updated_at, KHÔNG tham chiếu đến bất kỳ field nào khác
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. Đảm bảo trigger generate_staff_code không tham chiếu đến permissions
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
  
  -- KHÔNG tham chiếu đến NEW.permissions hoặc bất kỳ field nào khác
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Kiểm tra và xóa các view có thể tham chiếu đến users.permissions
-- ============================================

DO $$
DECLARE
  view_record RECORD;
  view_sql TEXT;
BEGIN
  FOR view_record IN 
    SELECT 
      table_name,
      view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    AND view_definition LIKE '%users%permissions%'
  LOOP
    RAISE NOTICE '⚠️ Tìm thấy view có thể tham chiếu đến permissions: %', view_record.table_name;
    RAISE NOTICE '   Definition: %', view_record.view_definition;
  END LOOP;
END $$;

-- ============================================
-- 6. Kiểm tra xem cột permissions có thực sự đã bị xóa chưa
-- ============================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'permissions'
  ) THEN
    RAISE NOTICE '⚠️ CẢNH BÁO: Cột permissions VẪN CÒN TỒN TẠI trong bảng users!';
    RAISE NOTICE 'Vui lòng chạy migration_drop_permissions_column.sql để xóa cột này.';
  ELSE
    RAISE NOTICE '✅ Cột permissions đã được xóa khỏi bảng users.';
  END IF;
END $$;

-- ============================================
-- 7. Kiểm tra xem có materialized view nào không
-- ============================================

DO $$
DECLARE
  matview_record RECORD;
BEGIN
  FOR matview_record IN 
    SELECT matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
    AND definition LIKE '%users%permissions%'
  LOOP
    RAISE NOTICE '⚠️ Tìm thấy materialized view có thể tham chiếu đến permissions: %', matview_record.matviewname;
  END LOOP;
END $$;

-- ============================================
-- 8. Kiểm tra và xóa RLS policies có thể tham chiếu đến permissions
-- ============================================

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'users'
    AND (
      qual LIKE '%permissions%' 
      OR with_check LIKE '%permissions%'
    )
  LOOP
    RAISE NOTICE '⚠️ Tìm thấy RLS policy có thể tham chiếu đến permissions: %', policy_record.policyname;
    RAISE NOTICE '   Qual: %', policy_record.qual;
    RAISE NOTICE '   With Check: %', policy_record.with_check;
  END LOOP;
END $$;

-- ============================================
-- 9. Đảm bảo không có default value nào tham chiếu đến permissions
-- ============================================

-- Kiểm tra xem có default value nào đang sử dụng permissions không
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' 
    AND column_name = 'permissions'
    AND column_default LIKE '%permissions%'
  ) THEN
    RAISE NOTICE '⚠️ CẢNH BÁO: Cột permissions có default value tham chiếu đến chính nó!';
  ELSE
    RAISE NOTICE '✅ Không có default value nào tham chiếu đến permissions';
  END IF;
END $$;

-- ============================================
-- 10. Refresh schema cache (nếu Supabase hỗ trợ)
-- ============================================

-- Lưu ý: Supabase có thể cache schema. Nếu vẫn còn lỗi sau khi chạy migration này,
-- có thể cần:
-- 1. Đợi vài phút để cache tự refresh
-- 2. Hoặc liên hệ Supabase support để refresh schema cache
-- 3. Hoặc thử NOTIFY để refresh cache: NOTIFY pgrst, 'reload schema';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, kiểm tra output để xem:
-- 
-- 1. Có trigger nào đang tham chiếu đến permissions không
-- 2. Có function nào đang tham chiếu đến permissions không
-- 3. Có view nào đang tham chiếu đến permissions không
-- 4. Cột permissions có thực sự đã bị xóa chưa
--
-- Nếu vẫn còn lỗi, có thể cần:
-- 1. Xóa các view/materialized view có tham chiếu đến permissions
-- 2. Refresh schema cache của Supabase
-- 3. Kiểm tra xem có RLS policy nào đang tham chiếu đến permissions không
-- ============================================
