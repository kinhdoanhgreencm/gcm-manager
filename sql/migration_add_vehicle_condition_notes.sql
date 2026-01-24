-- ============================================
-- GCM Manager - Add condition_notes column to vehicles table
-- ============================================
-- File này thêm cột condition_notes vào bảng vehicles để lưu ghi chú tình trạng xe
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm cột condition_notes vào bảng vehicles
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS condition_notes TEXT;

-- Thêm comment cho cột
COMMENT ON COLUMN vehicles.condition_notes IS 'Ghi chú về tình trạng xe: vết xước, hư hỏng, bảo dưỡng, v.v.';

-- Tạo index nếu cần tìm kiếm theo ghi chú (optional)
-- CREATE INDEX IF NOT EXISTS idx_vehicles_condition_notes ON vehicles USING gin(to_tsvector('vietnamese', condition_notes));

