-- ============================================
-- GCM Manager - Accounts Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng accounts (Tài khoản tài chính)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng accounts (Tài khoản tài chính)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL, -- Tên tài khoản (ví dụ: "Quỹ tiền mặt", "Techcombank Business")
  type TEXT NOT NULL CHECK (type IN ('CASH', 'BANK', 'E_WALLET')), -- Loại tài khoản
  bank_name TEXT, -- Tên ngân hàng (nếu type = 'BANK')
  account_number TEXT, -- Số tài khoản (nếu type = 'BANK' hoặc 'E_WALLET')
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Số dư hiện tại
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')), -- Trạng thái
  notes TEXT, -- Ghi chú
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo index cho các trường thường dùng
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(type);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_created_at ON accounts(created_at);

-- 3. Tạo trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Xóa trigger cũ nếu tồn tại trước khi tạo lại
DROP TRIGGER IF EXISTS update_accounts_updated_at_trigger ON accounts;

CREATE TRIGGER update_accounts_updated_at_trigger
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_accounts_updated_at();

-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép tất cả users đăng nhập đọc accounts
DROP POLICY IF EXISTS "Allow authenticated users to read accounts" ON accounts;
CREATE POLICY "Allow authenticated users to read accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép tất cả users đăng nhập tạo accounts (chỉ admin/quản lý nên có quyền này, nhưng để đơn giản cho phép tất cả)
DROP POLICY IF EXISTS "Allow authenticated users to insert accounts" ON accounts;
CREATE POLICY "Allow authenticated users to insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Cho phép tất cả users đăng nhập cập nhật accounts
DROP POLICY IF EXISTS "Allow authenticated users to update accounts" ON accounts;
CREATE POLICY "Allow authenticated users to update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Không cho phép xóa accounts (chỉ đánh dấu inactive)
-- CREATE POLICY "Allow authenticated users to delete accounts"
--   ON accounts FOR DELETE
--   TO authenticated
--   USING (false);

-- 5. Thêm foreign key constraint cho transactions.account_id
-- ============================================
-- Chỉ thêm nếu bảng transactions đã tồn tại
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    -- Xóa constraint cũ nếu có
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_account_id;
    ALTER TABLE transactions DROP CONSTRAINT IF EXISTS fk_transactions_to_account_id;
    
    -- Thêm foreign key constraint mới
    ALTER TABLE transactions 
    ADD CONSTRAINT fk_transactions_account_id 
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
    
    ALTER TABLE transactions 
    ADD CONSTRAINT fk_transactions_to_account_id 
    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 6. Insert dữ liệu mẫu (tùy chọn)
-- ============================================
-- Chỉ insert nếu chưa có dữ liệu
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM accounts LIMIT 1) THEN
    INSERT INTO accounts (name, type, balance) VALUES
      ('Quỹ tiền mặt', 'CASH', 500000000),
      ('Techcombank Business', 'BANK', 3500000000),
      ('Vietcombank Showroom', 'BANK', 1200000000);
    
    -- Cập nhật thông tin ngân hàng cho các tài khoản BANK
    UPDATE accounts 
    SET bank_name = 'Techcombank', account_number = '1903...888'
    WHERE name = 'Techcombank Business';
    
    UPDATE accounts 
    SET bank_name = 'Vietcombank', account_number = '0071...999'
    WHERE name = 'Vietcombank Showroom';
  END IF;
END $$;

-- 7. Comments và mô tả các trường
-- ============================================
COMMENT ON TABLE accounts IS 'Bảng lưu trữ các tài khoản tài chính (tiền mặt, ngân hàng, ví điện tử)';
COMMENT ON COLUMN accounts.name IS 'Tên tài khoản (ví dụ: "Quỹ tiền mặt", "Techcombank Business")';
COMMENT ON COLUMN accounts.type IS 'Loại tài khoản: CASH (Tiền mặt), BANK (Ngân hàng), E_WALLET (Ví điện tử)';
COMMENT ON COLUMN accounts.bank_name IS 'Tên ngân hàng (chỉ dùng khi type = BANK)';
COMMENT ON COLUMN accounts.account_number IS 'Số tài khoản ngân hàng hoặc ví điện tử';
COMMENT ON COLUMN accounts.balance IS 'Số dư hiện tại của tài khoản (VNĐ)';
COMMENT ON COLUMN accounts.status IS 'Trạng thái: ACTIVE (Hoạt động), INACTIVE (Ngừng hoạt động)';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, bạn cần:
-- 
-- 1. Kiểm tra RLS policies đã được áp dụng:
--    - Vào Authentication > Policies trong Supabase Dashboard
--    - Kiểm tra các policies cho bảng accounts
--
-- 2. Kiểm tra foreign key constraints:
--    - Vào Table Editor > transactions
--    - Kiểm tra account_id và to_account_id đã có foreign key constraint
--
-- 3. Test tạo account mới:
--    - Có thể tạo account mới qua Supabase Dashboard hoặc qua ứng dụng
--
-- ============================================

