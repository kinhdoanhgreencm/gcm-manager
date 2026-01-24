-- ============================================
-- GCM Manager - Add Responsible Staff to Contracts
-- ============================================
-- File này thêm trường responsible_staff_id vào bảng contracts
-- để lưu thông tin nhân viên phụ trách hợp đồng
-- ============================================

-- 1. Thêm cột responsible_staff_id vào bảng contracts
-- ============================================
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS responsible_staff_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. Thêm comment cho cột mới
-- ============================================
COMMENT ON COLUMN contracts.responsible_staff_id IS 'ID nhân viên phụ trách hợp đồng (từ bảng users)';

-- 3. Tạo index để tối ưu query
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contracts_responsible_staff_id ON contracts(responsible_staff_id);

-- 4. Cập nhật RLS policy nếu cần (hiện tại đã có policy cho tất cả authenticated users)
-- ============================================
-- Policy hiện tại đã cho phép authenticated users insert/update, không cần thay đổi

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, bạn cần:
-- 
-- 1. Kiểm tra cột đã được thêm:
--    - Vào Supabase Dashboard > Table Editor > contracts
--    - Kiểm tra xem có cột responsible_staff_id không
--
-- 2. Cập nhật code để lưu responsible_staff_id khi tạo hợp đồng:
--    - Khi tạo hợp đồng mới, thêm responsible_staff_id = current_user.id
--
-- 3. Test tạo hợp đồng mới:
--    - Tạo hợp đồng mới từ giao diện
--    - Kiểm tra xem responsible_staff_id có được lưu đúng không
--
-- ============================================
