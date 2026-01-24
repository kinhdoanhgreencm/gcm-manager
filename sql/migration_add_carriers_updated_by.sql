-- ============================================
-- Migration: Add updated_by to carriers table
-- ============================================
-- Thêm trường updated_by để track người cập nhật cuối cùng

-- 1. Thêm cột updated_by
ALTER TABLE carriers ADD COLUMN IF NOT EXISTS updated_by TEXT;

-- 2. Tạo index cho trường updated_by
CREATE INDEX IF NOT EXISTS idx_carriers_updated_by ON carriers(updated_by);

-- 3. Comments
COMMENT ON COLUMN carriers.updated_by IS 'ID người cập nhật cuối cùng (user ID)';

-- ============================================
-- Hoàn tất!
-- ============================================
