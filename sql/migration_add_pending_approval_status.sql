-- ============================================
-- Migration: Thêm trạng thái PENDING_APPROVAL vào contracts table
-- ============================================
-- File này cập nhật constraint check cho cột status trong bảng contracts
-- để cho phép trạng thái PENDING_APPROVAL (Chờ duyệt)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Xóa constraint cũ
-- ============================================
ALTER TABLE contracts 
DROP CONSTRAINT IF EXISTS contracts_status_check;

-- 2. Tạo constraint mới với PENDING_APPROVAL
-- ============================================
ALTER TABLE contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN (
  'DRAFT', 
  'ACTIVE', 
  'PENDING_APPROVAL', 
  'SIGNED', 
  'PAYING', 
  'COMPLETED', 
  'CANCELLED', 
  'CONVERTED'
));

-- 3. Cập nhật comment cho cột status
-- ============================================
COMMENT ON COLUMN contracts.status IS 'Trạng thái: DRAFT (Nháp), ACTIVE (Đang hiệu lực), PENDING_APPROVAL (Chờ duyệt), SIGNED (Đã ký), PAYING (Đang thanh toán), COMPLETED (Hoàn tất), CANCELLED (Đã hủy), CONVERTED (Đã chuyển đổi)';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy migration này:
-- 
-- 1. Kiểm tra constraint đã được cập nhật:
--    SELECT conname, pg_get_constraintdef(oid) 
--    FROM pg_constraint 
--    WHERE conrelid = 'contracts'::regclass 
--    AND conname = 'contracts_status_check';
--
-- 2. Test tạo hợp đồng với status PENDING_APPROVAL:
--    INSERT INTO contracts (contract_type, customer_name, customer_phone, signed_date, status)
--    VALUES ('SALES', 'Test', '0123456789', CURRENT_DATE, 'PENDING_APPROVAL');
--
-- ============================================
