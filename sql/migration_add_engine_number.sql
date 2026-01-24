-- ============================================
-- Migration: Thêm cột số máy (engine_number)
-- ============================================
-- File này thêm cột engine_number vào bảng vehicles
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm cột engine_number vào bảng vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_number TEXT;

-- Thêm comment cho cột
COMMENT ON COLUMN vehicles.engine_number IS 'Số máy của xe (Engine Number)';

-- ============================================
-- Hoàn tất!
-- ============================================
