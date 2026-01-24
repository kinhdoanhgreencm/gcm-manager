-- ============================================
-- Migration: Đồng bộ tài khoản ngân hàng bằng tên tài khoản
-- ============================================
-- File này liên kết các tài khoản từ bảng accounts vào chart_of_accounts
-- bằng cách khớp theo tên tài khoản (case-insensitive, flexible matching)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Đảm bảo cột chart_of_account_id tồn tại
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

-- 3. Hàm helper để chuẩn hóa tên tài khoản (loại bỏ khoảng trắng, chuyển lowercase)
-- ============================================
CREATE OR REPLACE FUNCTION normalize_account_name(name_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Loại bỏ khoảng trắng thừa, chuyển lowercase, loại bỏ dấu câu đặc biệt
  RETURN LOWER(TRIM(REGEXP_REPLACE(name_text, '[^a-zA-Z0-9\s]', '', 'g')));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4. Hàm helper để tìm tài khoản chart_of_accounts khớp với tên
-- ============================================
CREATE OR REPLACE FUNCTION find_matching_chart_account(
  account_name TEXT,
  account_type TEXT,
  parent_bank_id UUID
)
RETURNS UUID AS $$
DECLARE
  normalized_name TEXT;
  matched_id UUID;
  parent_cash_id UUID;
BEGIN
  -- Chuẩn hóa tên tài khoản
  normalized_name := normalize_account_name(account_name);
  
  -- Lấy ID tài khoản cha
  SELECT id INTO parent_cash_id FROM chart_of_accounts WHERE code = '111';
  
  IF account_type = 'CASH' THEN
    -- Tài khoản tiền mặt: tìm khớp với "Tiền mặt" hoặc tên tương tự
    SELECT id INTO matched_id
    FROM chart_of_accounts
    WHERE code = '111'
      AND is_active = true
    LIMIT 1;
    
    RETURN matched_id;
    
  ELSIF account_type IN ('BANK', 'E_WALLET') THEN
    -- Tài khoản ngân hàng: tìm khớp theo tên (case-insensitive, flexible)
    -- Ưu tiên: khớp chính xác tên, sau đó khớp một phần
    
    -- 1. Tìm khớp chính xác (sau khi normalize)
    SELECT id INTO matched_id
    FROM chart_of_accounts
    WHERE normalize_account_name(name) = normalized_name
      AND parent_id = parent_bank_id
      AND is_active = true
    LIMIT 1;
    
    IF matched_id IS NOT NULL THEN
      RETURN matched_id;
    END IF;
    
    -- 2. Tìm khớp một phần (tên account chứa trong chart_of_accounts hoặc ngược lại)
    SELECT id INTO matched_id
    FROM chart_of_accounts
    WHERE (
      normalize_account_name(name) LIKE '%' || normalized_name || '%'
      OR normalized_name LIKE '%' || normalize_account_name(name) || '%'
    )
      AND parent_id = parent_bank_id
      AND is_active = true
    ORDER BY 
      -- Ưu tiên khớp dài hơn
      LENGTH(name) DESC,
      -- Sau đó ưu tiên khớp gần nhất
      SIMILARITY(name, account_name) DESC
    LIMIT 1;
    
    IF matched_id IS NOT NULL THEN
      RETURN matched_id;
    END IF;
    
    -- 3. Nếu không tìm thấy, tạo tài khoản mới
    -- Tạo mã tài khoản từ tên ngân hàng
    DECLARE
      account_code TEXT;
      bank_name_clean TEXT;
    BEGIN
      -- Lấy bank_name nếu có, nếu không dùng account name
      bank_name_clean := COALESCE(
        (SELECT bank_name FROM accounts WHERE name = account_name LIMIT 1),
        account_name
      );
      
      -- Tạo code: 112.{normalized_bank_name}
      account_code := '112.' || LOWER(REPLACE(REPLACE(REPLACE(bank_name_clean, ' ', ''), '-', ''), '_', ''));
      
      -- Kiểm tra code đã tồn tại chưa
      SELECT id INTO matched_id
      FROM chart_of_accounts
      WHERE code = account_code;
      
      IF matched_id IS NULL THEN
        -- Tạo tài khoản mới
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
          account_name,
          parent_bank_id,
          'ASSET',
          'DEBIT',
          2,
          'Tài khoản ' || account_name
        )
        RETURNING id INTO matched_id;
      END IF;
      
      RETURN matched_id;
    END;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 5. Liên kết tất cả accounts với chart_of_accounts bằng cách khớp tên
-- ============================================
DO $$
DECLARE
  acc_record RECORD;
  chart_acc_id UUID;
  parent_bank_id UUID;
  linked_count INTEGER := 0;
  created_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  -- Lấy ID của tài khoản cha "112 - Tiền gửi ngân hàng"
  SELECT id INTO parent_bank_id FROM chart_of_accounts WHERE code = '112';
  
  IF parent_bank_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy tài khoản cha "112 - Tiền gửi ngân hàng"';
  END IF;
  
  -- Xử lý từng account chưa được liên kết
  FOR acc_record IN 
    SELECT id, name, type, bank_name, account_number 
    FROM accounts 
    WHERE chart_of_account_id IS NULL -- Chỉ xử lý các account chưa được liên kết
      AND status = 'ACTIVE' -- Chỉ xử lý tài khoản active
  LOOP
    BEGIN
      -- Tìm hoặc tạo tài khoản chart_of_accounts khớp
      chart_acc_id := find_matching_chart_account(
        acc_record.name,
        acc_record.type,
        parent_bank_id
      );
      
      IF chart_acc_id IS NOT NULL THEN
        -- Cập nhật account với chart_of_account_id
        UPDATE accounts 
        SET chart_of_account_id = chart_acc_id 
        WHERE id = acc_record.id;
        
        -- Kiểm tra xem tài khoản đã tồn tại hay mới tạo
        IF EXISTS (
          SELECT 1 FROM chart_of_accounts 
          WHERE id = chart_acc_id 
            AND created_at > NOW() - INTERVAL '1 second'
        ) THEN
          created_count := created_count + 1;
          RAISE NOTICE '✓ Đã tạo và liên kết: % (type: %) -> chart_of_accounts ID: %', 
            acc_record.name, acc_record.type, chart_acc_id;
        ELSE
          linked_count := linked_count + 1;
          RAISE NOTICE '✓ Đã liên kết: % (type: %) -> chart_of_accounts ID: %', 
            acc_record.name, acc_record.type, chart_acc_id;
        END IF;
      ELSE
        error_count := error_count + 1;
        RAISE WARNING '✗ Không thể tìm hoặc tạo tài khoản cho: % (type: %)', 
          acc_record.name, acc_record.type;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE WARNING '✗ Lỗi khi xử lý account % (%): %', 
        acc_record.id, acc_record.name, SQLERRM;
    END;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Kết quả đồng bộ:';
  RAISE NOTICE '  - Đã liên kết: % tài khoản', linked_count;
  RAISE NOTICE '  - Đã tạo mới: % tài khoản', created_count;
  RAISE NOTICE '  - Lỗi: % tài khoản', error_count;
  RAISE NOTICE '========================================';
END $$;

-- 6. Hiển thị kết quả - Danh sách accounts đã được liên kết
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
  coa.account_type as chart_account_type,
  CASE 
    WHEN a.chart_of_account_id IS NULL THEN '❌ Chưa liên kết'
    ELSE '✅ Đã liên kết'
  END as link_status
FROM accounts a
LEFT JOIN chart_of_accounts coa ON a.chart_of_account_id = coa.id
WHERE a.status = 'ACTIVE'
ORDER BY 
  CASE a.type
    WHEN 'CASH' THEN 1
    WHEN 'BANK' THEN 2
    WHEN 'E_WALLET' THEN 3
  END,
  a.name;

-- 7. Thêm comment cho cột
-- ============================================
COMMENT ON COLUMN accounts.chart_of_account_id IS 'ID tài khoản kế toán trong chart_of_accounts (liên kết với hệ thống tài khoản - đồng bộ bằng tên)';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy script này:
-- 
-- 1. Tất cả các tài khoản trong bảng accounts đã được liên kết với chart_of_accounts
-- 2. Các tài khoản tiền mặt (CASH) sẽ sử dụng tài khoản "111 - Tiền mặt"
-- 3. Các tài khoản ngân hàng (BANK) sẽ được khớp theo tên:
--    - Nếu tìm thấy tài khoản khớp trong chart_of_accounts → liên kết
--    - Nếu không tìm thấy → tạo tài khoản mới dưới "112 - Tiền gửi ngân hàng"
-- 4. Khớp tên là case-insensitive và flexible (khớp một phần)
--
-- Ví dụ:
-- - Account "Techcombank" → Tìm "Techcombank" trong chart_of_accounts → Liên kết
-- - Account "TPBank Business" → Tìm "TPBank" trong chart_of_accounts → Liên kết (khớp một phần)
-- - Account "Vietcombank Showroom" → Không tìm thấy → Tạo "112.vietcombankshowroom"
--
-- ============================================
