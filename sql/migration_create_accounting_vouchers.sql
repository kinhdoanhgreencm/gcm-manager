-- ============================================
-- GCM Manager - Accounting Vouchers Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng accounting_vouchers (Chứng từ kế toán)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng accounting_vouchers (Chứng từ kế toán)
-- ============================================
CREATE TABLE IF NOT EXISTS accounting_vouchers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_number TEXT NOT NULL UNIQUE, -- Số chứng từ (ví dụ: "CT-2024-001")
  voucher_date DATE NOT NULL, -- Ngày chứng từ
  voucher_type TEXT NOT NULL CHECK (voucher_type IN (
    'RECEIPT',         -- Phiếu thu
    'PAYMENT',         -- Phiếu chi
    'TRANSFER',        -- Phiếu chuyển khoản
    'JOURNAL',         -- Bút toán nhật ký
    'SALES_INVOICE',   -- Hóa đơn bán hàng
    'PURCHASE_INVOICE' -- Hóa đơn mua hàng
  )),
  description TEXT NOT NULL, -- Diễn giải
  total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0), -- Tổng số tiền
  reference_type TEXT, -- Loại đối tượng liên quan
  reference_id TEXT, -- ID đối tượng liên quan (contract_id, transaction_id, v.v.)
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'LOCKED', 'CANCELLED')), -- Trạng thái
  posted_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Người hạch toán
  posted_at TIMESTAMPTZ, -- Thời gian hạch toán
  locked_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Người khóa
  locked_at TIMESTAMPTZ, -- Thời gian khóa
  attachments TEXT[], -- Danh sách URL file đính kèm
  notes TEXT, -- Ghi chú
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Tạo function để tự động tạo số chứng từ
-- ============================================
CREATE OR REPLACE FUNCTION generate_voucher_number(v_type TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  current_year TEXT;
  last_number INTEGER;
  new_number TEXT;
BEGIN
  -- Xác định prefix theo loại chứng từ
  CASE v_type
    WHEN 'RECEIPT' THEN prefix := 'PT'; -- Phiếu thu
    WHEN 'PAYMENT' THEN prefix := 'PC'; -- Phiếu chi
    WHEN 'TRANSFER' THEN prefix := 'CK'; -- Chuyển khoản
    WHEN 'JOURNAL' THEN prefix := 'BT'; -- Bút toán
    WHEN 'SALES_INVOICE' THEN prefix := 'HD'; -- Hóa đơn
    WHEN 'PURCHASE_INVOICE' THEN prefix := 'HDM'; -- Hóa đơn mua
    ELSE prefix := 'CT'; -- Chứng từ chung
  END CASE;
  
  current_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Tìm số chứng từ cuối cùng trong năm
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(voucher_number FROM LENGTH(prefix) + 6) AS INTEGER
    )
  ), 0) INTO last_number
  FROM accounting_vouchers
  WHERE voucher_number LIKE prefix || '-' || current_year || '-%'
    AND voucher_type = v_type;
  
  -- Tăng số lên 1
  last_number := last_number + 1;
  
  -- Tạo số chứng từ mới (ví dụ: PT-2024-001)
  new_number := prefix || '-' || current_year || '-' || LPAD(last_number::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_voucher_number(TEXT) TO authenticated;

-- 3. Tạo index cho các trường thường dùng
-- ============================================
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_voucher_number ON accounting_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_voucher_date ON accounting_vouchers(voucher_date);
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_voucher_type ON accounting_vouchers(voucher_type);
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_status ON accounting_vouchers(status);
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_reference ON accounting_vouchers(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_accounting_vouchers_created_by ON accounting_vouchers(created_by);

-- 4. Tạo trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_accounting_vouchers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_accounting_vouchers_updated_at_trigger ON accounting_vouchers;
CREATE TRIGGER update_accounting_vouchers_updated_at_trigger
  BEFORE UPDATE ON accounting_vouchers
  FOR EACH ROW
  EXECUTE FUNCTION update_accounting_vouchers_updated_at();

-- 5. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE accounting_vouchers ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép tất cả users đăng nhập đọc vouchers
DROP POLICY IF EXISTS "Allow authenticated users to read accounting_vouchers" ON accounting_vouchers;
CREATE POLICY "Allow authenticated users to read accounting_vouchers"
  ON accounting_vouchers FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép tất cả users đăng nhập tạo vouchers
DROP POLICY IF EXISTS "Allow authenticated users to insert accounting_vouchers" ON accounting_vouchers;
CREATE POLICY "Allow authenticated users to insert accounting_vouchers"
  ON accounting_vouchers FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Cho phép creator hoặc accountant cập nhật vouchers
DROP POLICY IF EXISTS "Allow creator or accountant to update accounting_vouchers" ON accounting_vouchers;
CREATE POLICY "Allow creator or accountant to update accounting_vouchers"
  ON accounting_vouchers FOR UPDATE
  TO authenticated
  USING (
    auth.uid()::text = created_by::text OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('ACCOUNTANT', 'ADMIN', 'STRATEGIC_DIRECTOR')
    )
  );

-- Policy: Chỉ cho phép creator hoặc accountant xóa vouchers ở trạng thái DRAFT
DROP POLICY IF EXISTS "Allow creator or accountant to delete draft vouchers" ON accounting_vouchers;
CREATE POLICY "Allow creator or accountant to delete draft vouchers"
  ON accounting_vouchers FOR DELETE
  TO authenticated
  USING (
    status = 'DRAFT' AND (
      auth.uid()::text = created_by::text OR
      EXISTS (
        SELECT 1 FROM users 
        WHERE users.id::text = auth.uid()::text 
        AND users.role IN ('ACCOUNTANT', 'ADMIN', 'STRATEGIC_DIRECTOR')
      )
    )
  );

-- 6. Comments và mô tả
-- ============================================
COMMENT ON TABLE accounting_vouchers IS 'Bảng lưu trữ các chứng từ kế toán (phiếu thu, phiếu chi, hóa đơn, bút toán...)';
COMMENT ON COLUMN accounting_vouchers.voucher_number IS 'Số chứng từ (tự động tạo theo format: PT-2024-001, PC-2024-001...)';
COMMENT ON COLUMN accounting_vouchers.voucher_date IS 'Ngày chứng từ';
COMMENT ON COLUMN accounting_vouchers.voucher_type IS 'Loại chứng từ: RECEIPT (Phiếu thu), PAYMENT (Phiếu chi), TRANSFER (Chuyển khoản), JOURNAL (Bút toán), SALES_INVOICE (Hóa đơn bán), PURCHASE_INVOICE (Hóa đơn mua)';
COMMENT ON COLUMN accounting_vouchers.total_amount IS 'Tổng số tiền của chứng từ';
COMMENT ON COLUMN accounting_vouchers.status IS 'Trạng thái: DRAFT (Nháp), POSTED (Đã hạch toán), LOCKED (Đã khóa), CANCELLED (Đã hủy)';

-- ============================================
-- Hoàn tất!
-- ============================================
