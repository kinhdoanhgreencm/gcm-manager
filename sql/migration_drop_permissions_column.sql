-- ============================================
-- Migration: Xóa cột permissions khỏi bảng users
-- ============================================
-- File này xóa cột permissions khỏi bảng users
-- Vì hệ thống phân quyền đã được vô hiệu hóa, cột này không còn cần thiết
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Kiểm tra xem cột permissions có tồn tại không trước khi xóa
DO $$
BEGIN
  -- Xóa cột permissions nếu nó tồn tại
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

-- Xóa comment liên quan đến permissions nếu có
COMMENT ON COLUMN users.permissions IS NULL;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Cột permissions đã được xóa khỏi bảng users
-- Lưu ý: Hệ thống phân quyền đã được vô hiệu hóa trong code
-- Tất cả users hiện có quyền truy cập đầy đủ
-- ============================================
