-- ============================================
-- Migration: Thêm cột màu nội thất (interior_color)
-- ============================================
-- File này thêm cột interior_color vào bảng vehicles
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm cột interior_color vào bảng vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS interior_color TEXT;

-- Thêm comment cho cột
COMMENT ON COLUMN vehicles.interior_color IS 'Màu nội thất xe (Đen, Xám, Be, Nâu)';

-- ============================================
-- Hoàn tất!
-- ============================================

