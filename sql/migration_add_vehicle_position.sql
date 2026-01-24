-- ============================================
-- Migration: Thêm cột vehicle_position vào bảng vehicles
-- ============================================
-- File này thêm cột vehicle_position để lưu vị trí xe (Đang vận chuyển, Đã về kho, Đã ghép, Đã Xuất Hóa Đơn, Đã Giao)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm cột vehicle_position vào bảng vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_position TEXT;

-- Thêm comment mô tả cột
COMMENT ON COLUMN vehicles.vehicle_position IS 'Vị trí xe: Đang vận chuyển, Đã về kho, Đã ghép, Đã Xuất Hóa Đơn, Đã Giao';

-- Tạo index để tối ưu query (nếu cần filter theo vị trí xe)
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_position ON vehicles(vehicle_position);

-- ============================================
-- Hoàn tất!
-- ============================================

