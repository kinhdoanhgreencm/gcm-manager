-- ============================================
-- Migration: Add company bank accounts and cash
-- ============================================
-- File này thêm tài khoản tiền mặt và 3 tài khoản ngân hàng của công ty vào bảng accounts
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm tài khoản tiền mặt và 3 tài khoản ngân hàng của công ty
-- Sử dụng DO block để kiểm tra và insert từng tài khoản

DO $$
BEGIN
  -- Thêm Tiền mặt nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'Tiền mặt' AND type = 'CASH') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('Tiền mặt', 'CASH', NULL, NULL, 0, 'ACTIVE');
  END IF;

  -- Thêm Techcombank nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'Techcombank' AND type = 'BANK') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('Techcombank', 'BANK', 'Techcombank', NULL, 0, 'ACTIVE');
  END IF;

  -- Thêm TPBank nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'TPBank' AND type = 'BANK') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('TPBank', 'BANK', 'TPBank', NULL, 0, 'ACTIVE');
  END IF;

  -- Thêm VPBank nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'VPBank' AND type = 'BANK') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('VPBank', 'BANK', 'VPBank', NULL, 0, 'ACTIVE');
  END IF;
END $$;

-- Kiểm tra các tài khoản đã được tạo
SELECT 
  id, 
  name, 
  type, 
  bank_name, 
  account_number, 
  balance, 
  status,
  created_at
FROM accounts
WHERE name IN ('Tiền mặt', 'Techcombank', 'TPBank', 'VPBank')
ORDER BY 
  CASE name
    WHEN 'Tiền mặt' THEN 1
    WHEN 'Techcombank' THEN 2
    WHEN 'TPBank' THEN 3
    WHEN 'VPBank' THEN 4
  END;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy script này, 3 tài khoản ngân hàng sẽ xuất hiện trong trang Finance
-- Bạn có thể cập nhật số tài khoản và số dư sau khi có thông tin thực tế
-- ============================================

