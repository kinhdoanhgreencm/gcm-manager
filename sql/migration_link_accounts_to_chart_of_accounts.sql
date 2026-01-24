-- ============================================
-- Migration: Link accounts to chart_of_accounts
-- ============================================
-- File này tích hợp các tài khoản từ bảng accounts vào hệ thống chart_of_accounts
-- Chạy file này trong SQL Editor của Supabase Dashboard
--
-- LƯU Ý:
-- - File này sẽ tự động tạo các tài khoản cơ bản (Tiền mặt, Techcombank, TPBank, VPBank) nếu chưa có
-- - Sau đó sẽ liên kết tất cả các tài khoản với hệ thống chart_of_accounts
-- - Đảm bảo đã chạy migration_create_chart_of_accounts.sql trước khi chạy file này
-- ============================================

-- 0. Tự động tạo các tài khoản cơ bản nếu chưa có (từ migration_add_company_bank_accounts.sql)
-- ============================================
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

-- 1. Thêm cột chart_of_account_id vào bảng accounts
-- ============================================
ALTER TABLE accounts 
ADD COLUMN IF NOT EXISTS chart_of_account_id UUID REFERENCES chart_of_accounts(id) ON DELETE SET NULL;

-- Tạo index cho cột mới
CREATE INDEX IF NOT EXISTS idx_accounts_chart_of_account_id ON accounts(chart_of_account_id);

-- 2. Đảm bảo có tài khoản cha trong chart_of_accounts
-- ============================================
-- Tài khoản "111 - Tiền mặt" (nếu chưa có)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '111') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description)
    VALUES ('111', 'Tiền mặt', 'ASSET', 'DEBIT', 1, 'Tiền mặt tại quỹ');
  END IF;
END $$;

-- Tài khoản "112 - Tiền gửi ngân hàng" (nếu chưa có)
DO $$
DECLARE
  parent_112_id UUID;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '112') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description)
    VALUES ('112', 'Tiền gửi ngân hàng', 'ASSET', 'DEBIT', 1, 'Tiền gửi tại các ngân hàng')
    RETURNING id INTO parent_112_id;
  ELSE
    SELECT id INTO parent_112_id FROM chart_of_accounts WHERE code = '112';
  END IF;
END $$;

-- 3. Tạo tài khoản trong chart_of_accounts cho mỗi account và liên kết
-- ============================================
DO $$
DECLARE
  acc_record RECORD;
  chart_acc_id UUID;
  parent_cash_id UUID;
  parent_bank_id UUID;
  account_code TEXT;
BEGIN
  -- Lấy ID của tài khoản cha
  SELECT id INTO parent_cash_id FROM chart_of_accounts WHERE code = '111';
  SELECT id INTO parent_bank_id FROM chart_of_accounts WHERE code = '112';

  -- Xử lý từng account
  FOR acc_record IN 
    SELECT id, name, type, bank_name, account_number 
    FROM accounts 
    WHERE chart_of_account_id IS NULL -- Chỉ xử lý các account chưa được liên kết
  LOOP
    IF acc_record.type = 'CASH' THEN
      -- Tài khoản tiền mặt - sử dụng trực tiếp tài khoản 111
      chart_acc_id := parent_cash_id;
      
      -- Cập nhật account với chart_of_account_id
      UPDATE accounts 
      SET chart_of_account_id = chart_acc_id 
      WHERE id = acc_record.id;
      
    ELSIF acc_record.type = 'BANK' THEN
      -- Tài khoản ngân hàng - tạo tài khoản con dưới 112
      -- Tạo mã tài khoản từ tên ngân hàng
      IF acc_record.bank_name IS NOT NULL THEN
        account_code := '112.' || LOWER(REPLACE(acc_record.bank_name, ' ', ''));
        
        -- Kiểm tra xem tài khoản đã tồn tại chưa
        SELECT id INTO chart_acc_id 
        FROM chart_of_accounts 
        WHERE code = account_code;
        
        IF chart_acc_id IS NULL THEN
          -- Tạo tài khoản mới trong chart_of_accounts
          INSERT INTO chart_of_accounts (
            code, 
            name, 
            parent_id,
            account_type, 
            normal_balance, 
            level, 
            description
          )
          VALUES (
            account_code,
            COALESCE(acc_record.name, acc_record.bank_name),
            parent_bank_id,
            'ASSET',
            'DEBIT',
            2,
            COALESCE('Tài khoản ' || acc_record.bank_name, acc_record.name)
          )
          RETURNING id INTO chart_acc_id;
        END IF;
      ELSE
        -- Nếu không có bank_name, tạo mã từ name
        account_code := '112.' || LOWER(REPLACE(REPLACE(acc_record.name, ' ', ''), '-', ''));
        
        SELECT id INTO chart_acc_id 
        FROM chart_of_accounts 
        WHERE code = account_code;
        
        IF chart_acc_id IS NULL THEN
          INSERT INTO chart_of_accounts (
            code, 
            name, 
            parent_id,
            account_type, 
            normal_balance, 
            level, 
            description
          )
          VALUES (
            account_code,
            acc_record.name,
            parent_bank_id,
            'ASSET',
            'DEBIT',
            2,
            'Tài khoản ' || acc_record.name
          )
          RETURNING id INTO chart_acc_id;
        END IF;
      END IF;
      
      -- Cập nhật account với chart_of_account_id
      UPDATE accounts 
      SET chart_of_account_id = chart_acc_id 
      WHERE id = acc_record.id;
      
    ELSIF acc_record.type = 'E_WALLET' THEN
      -- Ví điện tử - tạo tài khoản con dưới 112
      account_code := '112.EWALLET.' || LOWER(REPLACE(REPLACE(acc_record.name, ' ', ''), '-', ''));
      
      SELECT id INTO chart_acc_id 
      FROM chart_of_accounts 
      WHERE code = account_code;
      
      IF chart_acc_id IS NULL THEN
        INSERT INTO chart_of_accounts (
          code, 
          name, 
          parent_id,
          account_type, 
          normal_balance, 
          level, 
          description
        )
        VALUES (
          account_code,
          acc_record.name,
          parent_bank_id,
          'ASSET',
          'DEBIT',
          2,
          'Ví điện tử ' || acc_record.name
        )
        RETURNING id INTO chart_acc_id;
      END IF;
      
      -- Cập nhật account với chart_of_account_id
      UPDATE accounts 
      SET chart_of_account_id = chart_acc_id 
      WHERE id = acc_record.id;
    END IF;
  END LOOP;
END $$;

-- 4. Hiển thị kết quả - Danh sách accounts đã được liên kết
-- ============================================
SELECT 
  a.id as account_id,
  a.name as account_name,
  a.type as account_type,
  a.bank_name,
  a.account_number,
  a.balance,
  coa.code as chart_code,
  coa.name as chart_name,
  coa.account_type as chart_account_type
FROM accounts a
LEFT JOIN chart_of_accounts coa ON a.chart_of_account_id = coa.id
ORDER BY 
  CASE a.type
    WHEN 'CASH' THEN 1
    WHEN 'BANK' THEN 2
    WHEN 'E_WALLET' THEN 3
  END,
  a.name;

-- 5. Thêm comment cho cột mới
-- ============================================
COMMENT ON COLUMN accounts.chart_of_account_id IS 'ID tài khoản kế toán trong chart_of_accounts (liên kết với hệ thống tài khoản)';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy script này:
-- 
-- 1. Tất cả các tài khoản trong bảng accounts đã được liên kết với chart_of_accounts
-- 2. Các tài khoản tiền mặt (CASH) sẽ sử dụng tài khoản "111 - Tiền mặt"
-- 3. Các tài khoản ngân hàng (BANK) sẽ tạo tài khoản con dưới "112 - Tiền gửi ngân hàng"
-- 4. Các ví điện tử (E_WALLET) cũng sẽ tạo tài khoản con dưới "112"
--
-- Ví dụ cấu trúc:
-- 111 - Tiền mặt
-- 112 - Tiền gửi ngân hàng
--   112.techcombank - Techcombank
--   112.tpbank - TPBank
--   112.vpbank - VPBank
--
-- ============================================
