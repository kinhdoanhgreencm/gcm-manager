-- ============================================
-- GCM Manager - Accounting Entries Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng accounting_entries (Bút toán kế toán - Double Entry)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng accounting_entries (Bút toán kế toán)
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES accounting_vouchers(id) ON DELETE CASCADE, -- ID chứng từ
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id) ON DELETE RESTRICT, -- ID tài khoản kế toán
  debit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (debit_amount >= 0), -- Số tiền Nợ
  credit_amount NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (credit_amount >= 0), -- Số tiền Có
  description TEXT, -- Diễn giải bút toán
  reference_type TEXT, -- Loại đối tượng liên quan
  reference_id TEXT, -- ID đối tượng liên quan
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Tạo constraint đảm bảo nguyên tắc bút toán kép (double-entry)
-- ============================================
-- Mỗi bút toán phải có ít nhất 1 bên Nợ và 1 bên Có
-- Tổng Nợ = Tổng Có trong mỗi chứng từ
CREATE OR REPLACE FUNCTION validate_double_entry()
RETURNS TRIGGER AS $$
DECLARE
  total_debit NUMERIC(15, 2);
  total_credit NUMERIC(15, 2);
BEGIN
  -- Tính tổng Nợ và Có của chứng từ
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debit, total_credit
  FROM accounting_entries
  WHERE voucher_id = NEW.voucher_id;
  
  -- Kiểm tra: Mỗi dòng phải có ít nhất 1 bên (Nợ hoặc Có), không được có cả 2
  IF NEW.debit_amount > 0 AND NEW.credit_amount > 0 THEN
    RAISE EXCEPTION 'Bút toán không hợp lệ: Mỗi dòng chỉ được có Nợ HOẶC Có, không được có cả hai';
  END IF;
  
  -- Kiểm tra: Phải có ít nhất 1 bên (Nợ hoặc Có)
  IF NEW.debit_amount = 0 AND NEW.credit_amount = 0 THEN
    RAISE EXCEPTION 'Bút toán không hợp lệ: Phải có ít nhất số tiền Nợ hoặc Có';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_double_entry_trigger
  BEFORE INSERT OR UPDATE ON accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION validate_double_entry();

-- 3. Tạo function để kiểm tra tổng Nợ = Tổng Có khi hạch toán
-- ============================================
CREATE OR REPLACE FUNCTION check_voucher_balance(v_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_debit NUMERIC(15, 2);
  total_credit NUMERIC(15, 2);
BEGIN
  SELECT 
    COALESCE(SUM(debit_amount), 0),
    COALESCE(SUM(credit_amount), 0)
  INTO total_debit, total_credit
  FROM accounting_entries
  WHERE voucher_id = v_id;
  
  -- Cho phép sai số nhỏ (0.01 VNĐ) do làm tròn
  RETURN ABS(total_debit - total_credit) < 0.01;
END;
$$ LANGUAGE plpgsql;

-- 4. Tạo trigger để tự động cập nhật total_amount của voucher khi thay đổi entries
-- ============================================
CREATE OR REPLACE FUNCTION update_voucher_total_amount()
RETURNS TRIGGER AS $$
DECLARE
  new_total NUMERIC(15, 2);
BEGIN
  -- Tính tổng số tiền từ các bút toán (lấy tổng Nợ hoặc Có, vì chúng phải bằng nhau)
  SELECT COALESCE(SUM(GREATEST(debit_amount, credit_amount)), 0)
  INTO new_total
  FROM accounting_entries
  WHERE voucher_id = COALESCE(NEW.voucher_id, OLD.voucher_id);
  
  -- Cập nhật total_amount của voucher
  UPDATE accounting_vouchers
  SET total_amount = new_total
  WHERE id = COALESCE(NEW.voucher_id, OLD.voucher_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_voucher_total_amount_trigger
  AFTER INSERT OR UPDATE OR DELETE ON accounting_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_voucher_total_amount();

-- 5. Tạo index cho các trường thường dùng
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounting_entries_voucher_id ON accounting_entries(voucher_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_account_id ON accounting_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_reference ON accounting_entries(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_accounting_entries_created_at ON accounting_entries(created_at);

-- 6. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE accounting_entries ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép đọc entries nếu có quyền đọc voucher
DROP POLICY IF EXISTS "Allow authenticated users to read accounting_entries" ON accounting_entries;
CREATE POLICY "Allow authenticated users to read accounting_entries"
  ON accounting_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounting_vouchers
      WHERE accounting_vouchers.id = accounting_entries.voucher_id
    )
  );

-- Policy: Cho phép tạo/sửa/xóa entries nếu có quyền tạo/sửa voucher
DROP POLICY IF EXISTS "Allow authenticated users to manage accounting_entries" ON accounting_entries;
CREATE POLICY "Allow authenticated users to manage accounting_entries"
  ON accounting_entries FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM accounting_vouchers
      WHERE accounting_vouchers.id = accounting_entries.voucher_id
      AND (
        accounting_vouchers.created_by::text = auth.uid()::text OR
        EXISTS (
          SELECT 1 FROM users 
          WHERE users.id::text = auth.uid()::text 
          AND users.role IN ('ACCOUNTANT', 'ADMIN', 'STRATEGIC_DIRECTOR')
        )
      )
    )
  );

-- 7. Comments và mô tả
-- ============================================
COMMENT ON TABLE accounting_entries IS 'Bảng lưu trữ các bút toán kế toán (theo nguyên tắc kép - double-entry)';
COMMENT ON COLUMN accounting_entries.voucher_id IS 'ID chứng từ (từ bảng accounting_vouchers)';
COMMENT ON COLUMN accounting_entries.account_id IS 'ID tài khoản kế toán (từ bảng chart_of_accounts)';
COMMENT ON COLUMN accounting_entries.debit_amount IS 'Số tiền Nợ (phải >= 0)';
COMMENT ON COLUMN accounting_entries.credit_amount IS 'Số tiền Có (phải >= 0)';
COMMENT ON COLUMN accounting_entries.description IS 'Diễn giải chi tiết cho bút toán này';

-- ============================================
-- Hoàn tất!
-- ============================================
