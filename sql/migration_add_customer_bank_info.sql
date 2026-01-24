-- ============================================
-- Migration: Add bank information columns to customers table
-- ============================================
-- File này thêm các cột thông tin ngân hàng vào bảng customers
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm các cột thông tin ngân hàng
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS bank_branch TEXT;

-- Thêm comments cho các cột mới
COMMENT ON COLUMN customers.bank_name IS 'Tên ngân hàng';
COMMENT ON COLUMN customers.bank_account IS 'Số tài khoản ngân hàng';
COMMENT ON COLUMN customers.bank_branch IS 'Chi nhánh ngân hàng';

-- ============================================
-- Hoàn tất!
-- ============================================

