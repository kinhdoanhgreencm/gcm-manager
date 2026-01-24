-- ============================================
-- Migration: Kiểm tra nguồn gốc lỗi trigger "record new has no field permissions"
-- ============================================
-- File này kiểm tra chi tiết các trigger và function để tìm nguyên nhân lỗi
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- ============================================
-- 1. Kiểm tra chi tiết các trigger trên bảng users
-- ============================================

SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'users'
AND event_object_schema = 'public'
ORDER BY trigger_name;

-- Kiểm tra function của từng trigger
DO $$
DECLARE
  trigger_record RECORD;
  trigger_func_oid OID;
  func_def TEXT;
BEGIN
  FOR trigger_record IN 
    SELECT 
      t.trigger_name,
      pt.tgfoid as function_oid
    FROM information_schema.triggers t
    JOIN pg_trigger pt ON pt.tgname = t.trigger_name AND pt.tgrelid = 'public.users'::regclass
    WHERE t.event_object_table = 'users'
    AND t.event_object_schema = 'public'
  LOOP
    BEGIN
      func_def := pg_get_functiondef(trigger_record.function_oid);
      RAISE NOTICE 'Trigger: % | Function OID: %', trigger_record.trigger_name, trigger_record.function_oid;
      IF func_def LIKE '%permissions%' THEN
        RAISE WARNING '⚠️ Trigger % có function tham chiếu đến permissions!', trigger_record.trigger_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Trigger: % | Function OID: % (không thể lấy definition)', trigger_record.trigger_name, trigger_record.function_oid;
    END;
  END LOOP;
END $$;

-- ============================================
-- 2. Kiểm tra xem có function nào đang sử dụng NEW.permissions hoặc OLD.permissions
-- ============================================

SELECT 
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- Kiểm tra từng function xem có tham chiếu đến permissions không
DO $$
DECLARE
  func_record RECORD;
  func_def TEXT;
BEGIN
  FOR func_record IN 
    SELECT 
      p.proname as function_name,
      p.oid as function_oid
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
  LOOP
    BEGIN
      func_def := pg_get_functiondef(func_record.function_oid);
      IF func_def LIKE '%NEW.permissions%' OR func_def LIKE '%OLD.permissions%' OR func_def LIKE '%permissions%' THEN
        RAISE NOTICE 'Function % có tham chiếu đến permissions', func_record.function_name;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Bỏ qua nếu không thể lấy function definition
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- 3. Kiểm tra xem có view nào đang select permissions từ users
-- ============================================

SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND view_definition LIKE '%users%permissions%';

-- ============================================
-- 4. Kiểm tra xem có materialized view nào không
-- ============================================

SELECT 
  matviewname,
  definition
FROM pg_matviews
WHERE schemaname = 'public'
AND definition LIKE '%users%permissions%';

-- ============================================
-- 5. Kiểm tra xem cột permissions có thực sự đã bị xóa chưa
-- ============================================

SELECT 
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
AND table_schema = 'public'
AND column_name = 'permissions';

-- ============================================
-- 6. Kiểm tra xem có RLS policy nào đang tham chiếu đến permissions
-- ============================================

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
);

-- ============================================
-- 7. Kiểm tra xem có constraint nào đang tham chiếu đến permissions
-- ============================================

SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.users'::regclass;

-- Kiểm tra từng constraint xem có tham chiếu đến permissions không
DO $$
DECLARE
  constraint_record RECORD;
  constraint_def TEXT;
BEGIN
  FOR constraint_record IN 
    SELECT 
      conname as constraint_name,
      contype as constraint_type,
      oid
    FROM pg_constraint
    WHERE conrelid = 'public.users'::regclass
  LOOP
    BEGIN
      constraint_def := pg_get_constraintdef(constraint_record.oid);
      IF constraint_def LIKE '%permissions%' THEN
        RAISE NOTICE 'Constraint % có tham chiếu đến permissions: %', constraint_record.constraint_name, constraint_def;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Bỏ qua nếu không thể lấy constraint definition
      NULL;
    END;
  END LOOP;
END $$;

-- ============================================
-- 8. Kiểm tra xem có index nào đang tham chiếu đến permissions
-- ============================================

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename = 'users'
AND indexdef LIKE '%permissions%';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, kiểm tra kết quả để tìm:
-- 
-- 1. Trigger nào đang tham chiếu đến permissions
-- 2. Function nào đang tham chiếu đến permissions
-- 3. View/materialized view nào đang tham chiếu đến permissions
-- 4. RLS policy nào đang tham chiếu đến permissions
-- 5. Constraint/index nào đang tham chiếu đến permissions
--
-- Nếu tìm thấy bất kỳ tham chiếu nào, cần sửa hoặc xóa chúng.
-- ============================================
