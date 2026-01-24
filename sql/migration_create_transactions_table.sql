-- ============================================
-- GCM Manager - Transactions Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng transactions (Giao dịch tài chính)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng transactions (Giao dịch tài chính)
-- ============================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL, -- Ngày giao dịch
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0), -- Số tiền (phải > 0)
  type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE', 'TRANSFER')), -- Loại giao dịch
  category TEXT NOT NULL, -- Danh mục (Bán xe, Đặt cọc, Phí dịch vụ, v.v.)
  description TEXT NOT NULL, -- Mô tả giao dịch
  account_id UUID NOT NULL, -- ID tài khoản (từ bảng accounts - chưa có foreign key vì bảng accounts chưa tồn tại)
  to_account_id UUID, -- ID tài khoản đích (cho giao dịch chuyển tiền)
  reference_id TEXT, -- ID đối tượng liên quan (vehicle_id, contract_id, supplier_id, customer_id)
  reference_type TEXT CHECK (reference_type IN ('VEHICLE', 'CONTRACT', 'PARTNER', 'CUSTOMER', 'SUPPLIER')), -- Loại đối tượng liên quan
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'E_WALLET')), -- Phương thức thanh toán
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'LOCKED', 'CANCELLED')), -- Trạng thái
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Người tạo giao dịch
  approver_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Người duyệt giao dịch
  attachments TEXT[], -- Danh sách URL file đính kèm (từ Supabase Storage)
  approved_at TIMESTAMPTZ, -- Thời gian duyệt
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo index cho các trường thường dùng để tối ưu query
-- ============================================
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_account_id ON transactions(to_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_transactions_creator_id ON transactions(creator_id);
CREATE INDEX IF NOT EXISTS idx_transactions_approver_id ON transactions(approver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Index composite cho query theo reference_type và reference_id (dùng cho supplier debt calculation)
CREATE INDEX IF NOT EXISTS idx_transactions_reference_type_id ON transactions(reference_type, reference_id) WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

-- Index cho query supplier payments
CREATE INDEX IF NOT EXISTS idx_transactions_supplier_payments ON transactions(reference_type, reference_id, type, status) 
  WHERE reference_type = 'SUPPLIER' AND type = 'EXPENSE' AND status IN ('APPROVED', 'LOCKED');

-- 3. Tạo trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at_trigger
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_transactions_updated_at();

-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép tất cả users đăng nhập đọc transactions (có thể tùy chỉnh sau)
CREATE POLICY "Allow authenticated users to read transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép tất cả users đăng nhập tạo transactions
CREATE POLICY "Allow authenticated users to insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Cho phép creator hoặc approver cập nhật transactions
CREATE POLICY "Allow creator or approver to update transactions"
  ON transactions FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = creator_id::text OR auth.uid()::text = approver_id::text);

-- Policy: Cho phép creator xóa transactions (chỉ khi status = DRAFT hoặc CANCELLED)
CREATE POLICY "Allow creator to delete draft or cancelled transactions"
  ON transactions FOR DELETE
  TO authenticated
  USING (auth.uid()::text = creator_id::text AND status IN ('DRAFT', 'CANCELLED'));

-- 5. Comments và mô tả các trường
-- ============================================
COMMENT ON TABLE transactions IS 'Bảng lưu trữ tất cả các giao dịch tài chính (thu, chi, chuyển khoản)';
COMMENT ON COLUMN transactions.date IS 'Ngày giao dịch';
COMMENT ON COLUMN transactions.amount IS 'Số tiền giao dịch (VNĐ), phải > 0';
COMMENT ON COLUMN transactions.type IS 'Loại giao dịch: INCOME (Thu), EXPENSE (Chi), TRANSFER (Chuyển khoản)';
COMMENT ON COLUMN transactions.category IS 'Danh mục giao dịch (Bán xe, Đặt cọc, Phí dịch vụ, Hoa hồng, Nhập xe, Phí đăng ký, Lương, Marketing, Vận hành, Chuyển tiền nội bộ)';
COMMENT ON COLUMN transactions.description IS 'Mô tả chi tiết giao dịch';
COMMENT ON COLUMN transactions.account_id IS 'ID tài khoản nguồn (từ bảng accounts)';
COMMENT ON COLUMN transactions.to_account_id IS 'ID tài khoản đích (dùng cho giao dịch chuyển khoản)';
COMMENT ON COLUMN transactions.reference_id IS 'ID đối tượng liên quan (vehicle_id, contract_id, supplier_id, customer_id)';
COMMENT ON COLUMN transactions.reference_type IS 'Loại đối tượng liên quan: VEHICLE, CONTRACT, PARTNER, CUSTOMER, SUPPLIER';
COMMENT ON COLUMN transactions.payment_method IS 'Phương thức thanh toán: CASH (Tiền mặt), BANK_TRANSFER (Chuyển khoản), E_WALLET (Ví điện tử)';
COMMENT ON COLUMN transactions.status IS 'Trạng thái: DRAFT (Nháp), PENDING (Chờ duyệt), APPROVED (Đã duyệt), LOCKED (Đã khóa), CANCELLED (Đã hủy)';
COMMENT ON COLUMN transactions.creator_id IS 'ID người tạo giao dịch (từ bảng users)';
COMMENT ON COLUMN transactions.approver_id IS 'ID người duyệt giao dịch (từ bảng users)';
COMMENT ON COLUMN transactions.attachments IS 'Danh sách URL file đính kèm (từ Supabase Storage)';
COMMENT ON COLUMN transactions.approved_at IS 'Thời gian duyệt giao dịch';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, bạn cần:
-- 
-- 1. Kiểm tra RLS policies đã được áp dụng:
--    - Vào Authentication > Policies trong Supabase Dashboard
--    - Kiểm tra các policies cho bảng transactions
--
-- 2. Nếu sau này tạo bảng accounts, có thể thêm foreign key constraint:
--    ALTER TABLE transactions 
--    ADD CONSTRAINT fk_transactions_account_id 
--    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT;
--
--    ALTER TABLE transactions 
--    ADD CONSTRAINT fk_transactions_to_account_id 
--    FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE SET NULL;
--
-- 3. Sau khi có bảng transactions, có thể uncomment trigger trong migration_update_supplier_debt_logic.sql:
--    - Uncomment phần trigger update_supplier_debt_from_transaction_trigger
--    - Chạy lại function update_supplier_debt_from_transaction()
--
-- 4. Test tạo transaction mới:
--    - Vào trang /finance/new
--    - Tạo giao dịch mới
--    - Kiểm tra dữ liệu trong Supabase Dashboard > Table Editor > transactions
--
-- ============================================

