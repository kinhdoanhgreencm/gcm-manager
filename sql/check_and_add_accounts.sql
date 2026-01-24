-- ============================================
-- Script kiểm tra và thêm tài khoản
-- ============================================
-- Chạy script này để kiểm tra và thêm các tài khoản nếu chưa có
-- ============================================

-- 1. Kiểm tra các tài khoản hiện có
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
WHERE status = 'ACTIVE'
ORDER BY 
  CASE name
    WHEN 'Tiền mặt' THEN 1
    WHEN 'Techcombank' THEN 2
    WHEN 'TPBank' THEN 3
    WHEN 'VPBank' THEN 4
    ELSE 5
  END,
  name;

-- 2. Thêm các tài khoản nếu chưa tồn tại
DO $$
BEGIN
  -- Thêm Tiền mặt nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'Tiền mặt' AND type = 'CASH') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('Tiền mặt', 'CASH', NULL, NULL, 0, 'ACTIVE');
    RAISE NOTICE 'Đã thêm tài khoản: Tiền mặt';
  ELSE
    RAISE NOTICE 'Tài khoản "Tiền mặt" đã tồn tại';
  END IF;

  -- Thêm Techcombank nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'Techcombank' AND type = 'BANK') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('Techcombank', 'BANK', 'Techcombank', NULL, 0, 'ACTIVE');
    RAISE NOTICE 'Đã thêm tài khoản: Techcombank';
  ELSE
    RAISE NOTICE 'Tài khoản "Techcombank" đã tồn tại';
  END IF;

  -- Thêm TPBank nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'TPBank' AND type = 'BANK') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('TPBank', 'BANK', 'TPBank', NULL, 0, 'ACTIVE');
    RAISE NOTICE 'Đã thêm tài khoản: TPBank';
  ELSE
    RAISE NOTICE 'Tài khoản "TPBank" đã tồn tại';
  END IF;

  -- Thêm VPBank nếu chưa tồn tại
  IF NOT EXISTS (SELECT 1 FROM accounts WHERE name = 'VPBank' AND type = 'BANK') THEN
    INSERT INTO accounts (name, type, bank_name, account_number, balance, status)
    VALUES ('VPBank', 'BANK', 'VPBank', NULL, 0, 'ACTIVE');
    RAISE NOTICE 'Đã thêm tài khoản: VPBank';
  ELSE
    RAISE NOTICE 'Tài khoản "VPBank" đã tồn tại';
  END IF;
END $$;

-- 3. Kiểm tra lại sau khi thêm
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
WHERE status = 'ACTIVE'
ORDER BY 
  CASE name
    WHEN 'Tiền mặt' THEN 1
    WHEN 'Techcombank' THEN 2
    WHEN 'TPBank' THEN 3
    WHEN 'VPBank' THEN 4
    ELSE 5
  END,
  name;








