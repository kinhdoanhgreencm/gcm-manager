-- ============================================
-- Migration: Thêm cột transaction_status vào bảng vehicles
-- ============================================
-- File này thêm cột transaction_status để lưu trạng thái giao dịch (Sẵn sàng giao dịch, Đã cọc, Đã xuất hóa đơn, Đã bàn giao)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm cột transaction_status vào bảng vehicles với giá trị mặc định
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS transaction_status TEXT DEFAULT 'Sẵn sàng giao dịch';

-- Cập nhật các record cũ chưa có giá trị (nếu có)
UPDATE vehicles SET transaction_status = 'Sẵn sàng giao dịch' WHERE transaction_status IS NULL;

-- Thêm comment mô tả cột
COMMENT ON COLUMN vehicles.transaction_status IS 'Trạng thái giao dịch: Sẵn sàng giao dịch, Đã cọc, Đã xuất hóa đơn, Đã bàn giao';

-- Tạo index để tối ưu query (nếu cần filter theo trạng thái giao dịch)
CREATE INDEX IF NOT EXISTS idx_vehicles_transaction_status ON vehicles(transaction_status);

-- ============================================
-- Hoàn tất!
-- ============================================

