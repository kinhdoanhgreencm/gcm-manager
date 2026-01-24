-- ============================================
-- GCM Manager - Add Temporary Vehicle Info to Contracts
-- ============================================
-- File này thêm trường temp_vehicle_info vào bảng contracts
-- để lưu thông tin xe tạm thời được chọn khi tạo hợp đồng
-- ============================================

-- Thêm trường temp_vehicle_info để lưu thông tin xe tạm thời
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS temp_vehicle_info JSONB;

-- Thêm comment cho trường mới
COMMENT ON COLUMN contracts.temp_vehicle_info IS 'Thông tin xe tạm thời được chọn khi tạo hợp đồng (JSON chứa model, year, color, etc.)';

-- Tạo index cho trường temp_vehicle_info để tối ưu query
CREATE INDEX IF NOT EXISTS idx_contracts_temp_vehicle_info ON contracts USING gin(temp_vehicle_info);

-- ============================================
-- Hoàn tất!
-- ============================================