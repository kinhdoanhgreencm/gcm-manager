-- ============================================
-- Migration: Thêm cột updated_by (người cập nhật)
-- ============================================
-- File này thêm cột updated_by vào bảng vehicles
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm cột updated_by vào bảng vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Thêm comment cho cột
COMMENT ON COLUMN vehicles.updated_by IS 'ID của người cập nhật thông tin xe lần cuối (tham chiếu đến bảng users)';

-- ============================================
-- Hoàn tất!
-- ============================================

