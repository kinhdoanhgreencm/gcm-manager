-- ============================================
-- GCM Manager - Contracts Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng contracts (Hợp đồng)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng contracts (Hợp đồng)
-- ============================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_type TEXT NOT NULL CHECK (contract_type IN ('DEPOSIT', 'SALES')), -- Loại hợp đồng: Đặt cọc hoặc Mua bán
  contract_code TEXT NOT NULL UNIQUE, -- Mã hợp đồng (VD: HDMB/2024/001, DC/2024/001)
  
  -- Thông tin khách hàng
  customer_name TEXT NOT NULL, -- Tên khách hàng
  customer_phone TEXT NOT NULL, -- Số điện thoại khách hàng
  customer_id_card TEXT, -- Số CCCD/CMND
  customer_address TEXT, -- Địa chỉ khách hàng (chỉ cho SALES)
  
  -- Thông tin xe
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT, -- ID xe (tham chiếu bảng vehicles)
  
  -- Thông tin hợp đồng đặt cọc (chỉ cho DEPOSIT)
  deposit_amount NUMERIC(15, 2), -- Số tiền đặt cọc (chỉ cho DEPOSIT)
  agreed_price NUMERIC(15, 2), -- Giá thỏa thuận (chỉ cho DEPOSIT)
  expiry_date DATE, -- Ngày hết hạn hợp đồng đặt cọc (chỉ cho DEPOSIT)
  payment_method TEXT CHECK (payment_method IN ('CASH', 'BANK_TRANSFER', 'E_WALLET')), -- Phương thức thanh toán (chỉ cho DEPOSIT)
  
  -- Thông tin hợp đồng mua bán (chỉ cho SALES)
  deposit_contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL, -- ID hợp đồng đặt cọc (nếu có, chỉ cho SALES)
  car_price NUMERIC(15, 2), -- Giá xe (chỉ cho SALES)
  vat_amount NUMERIC(15, 2) DEFAULT 0, -- Thuế VAT (chỉ cho SALES)
  registration_fee NUMERIC(15, 2) DEFAULT 0, -- Phí đăng ký (chỉ cho SALES)
  insurance_fee NUMERIC(15, 2) DEFAULT 0, -- Phí bảo hiểm (chỉ cho SALES)
  discount NUMERIC(15, 2) DEFAULT 0, -- Giảm giá (chỉ cho SALES)
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Tổng giá trị hợp đồng
  paid_amount NUMERIC(15, 2) DEFAULT 0, -- Số tiền đã thanh toán
  payment_type TEXT CHECK (payment_type IN ('INSTALLMENT', 'CASH')), -- Phương thức thanh toán: Trả góp hoặc Trả thẳng (chỉ cho SALES)
  bank_name TEXT, -- Tên ngân hàng (chỉ cho SALES, khi trả góp)
  loan_amount NUMERIC(15, 2), -- Số tiền vay ngân hàng (chỉ cho SALES, khi trả góp)
  
  -- Thông tin chung
  signed_date DATE NOT NULL, -- Ngày ký hợp đồng
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'SIGNED', 'PAYING', 'COMPLETED', 'CANCELLED', 'CONVERTED')), -- Trạng thái hợp đồng
  
  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Người tạo hợp đồng
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Người cập nhật lần cuối
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo bảng payment_schedules (Lịch trình thanh toán)
-- ============================================
CREATE TABLE IF NOT EXISTS payment_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE, -- ID hợp đồng
  milestone_name TEXT NOT NULL, -- Tên mốc thanh toán (VD: "Đặt cọc giữ xe", "Thanh toán đợt 2")
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0), -- Số tiền cần thanh toán
  due_date DATE NOT NULL, -- Ngày đến hạn thanh toán
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')), -- Trạng thái: Chờ thanh toán, Đã thanh toán, Quá hạn
  paid_at TIMESTAMPTZ, -- Thời gian thanh toán (khi status = PAID)
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL, -- ID giao dịch thanh toán (nếu đã thanh toán)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tạo index cho các trường thường dùng để tối ưu query
-- ============================================
-- Indexes cho bảng contracts
CREATE INDEX IF NOT EXISTS idx_contracts_contract_type ON contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_contract_code ON contracts(contract_code);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_vehicle_id ON contracts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_contracts_deposit_contract_id ON contracts(deposit_contract_id);
CREATE INDEX IF NOT EXISTS idx_contracts_signed_date ON contracts(signed_date DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_phone ON contracts(customer_phone);
CREATE INDEX IF NOT EXISTS idx_contracts_created_by ON contracts(created_by);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);

-- Indexes cho bảng payment_schedules
CREATE INDEX IF NOT EXISTS idx_payment_schedules_contract_id ON payment_schedules(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_transaction_id ON payment_schedules(transaction_id);

-- 4. Tạo trigger để tự động cập nhật updated_at
-- ============================================
-- Trigger cho bảng contracts
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contracts_updated_at_trigger ON contracts;
CREATE TRIGGER update_contracts_updated_at_trigger
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

-- Trigger cho bảng payment_schedules
CREATE OR REPLACE FUNCTION update_payment_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payment_schedules_updated_at_trigger ON payment_schedules;
CREATE TRIGGER update_payment_schedules_updated_at_trigger
  BEFORE UPDATE ON payment_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_schedules_updated_at();

-- 5. Tạo function để tự động generate mã hợp đồng
-- ============================================
CREATE OR REPLACE FUNCTION generate_contract_code(contract_type_param TEXT)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  year_part TEXT;
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Xác định prefix dựa trên loại hợp đồng
  IF contract_type_param = 'DEPOSIT' THEN
    prefix := 'DC';
  ELSIF contract_type_param = 'SALES' THEN
    prefix := 'HDMB';
  ELSE
    RAISE EXCEPTION 'Invalid contract type: %', contract_type_param;
  END IF;
  
  -- Lấy năm hiện tại
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Lấy số thứ tự tiếp theo từ các hợp đồng cùng loại trong năm
  SELECT COALESCE(MAX(
    CASE 
      WHEN contract_code ~ ('^' || prefix || '/' || year_part || '/[0-9]+$') THEN 
        CAST(SUBSTRING(contract_code FROM ('^' || prefix || '/' || year_part || '/([0-9]+)$')) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM contracts
  WHERE contract_type = contract_type_param;
  
  -- Format mã: DC/2024/001, HDMB/2024/001, ...
  new_code := prefix || '/' || year_part || '/' || LPAD(next_number::TEXT, 3, '0');
  
  -- Đảm bảo mã là duy nhất (nếu trùng thì tăng số lên)
  WHILE EXISTS (SELECT 1 FROM contracts WHERE contract_code = new_code) LOOP
    next_number := next_number + 1;
    new_code := prefix || '/' || year_part || '/' || LPAD(next_number::TEXT, 3, '0');
  END LOOP;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động generate contract_code khi insert hợp đồng mới (nếu chưa có)
CREATE OR REPLACE FUNCTION auto_generate_contract_code()
RETURNS TRIGGER AS $$
BEGIN
  -- Chỉ generate code nếu chưa có code
  IF NEW.contract_code IS NULL OR NEW.contract_code = '' THEN
    NEW.contract_code := generate_contract_code(NEW.contract_type);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_generate_contract_code_trigger ON contracts;
CREATE TRIGGER auto_generate_contract_code_trigger
  BEFORE INSERT ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_contract_code();

-- 6. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedules ENABLE ROW LEVEL SECURITY;

-- Policies cho bảng contracts
-- Policy: Cho phép tất cả users đăng nhập đọc contracts
CREATE POLICY "Allow authenticated users to read contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép tất cả users đăng nhập tạo contracts
CREATE POLICY "Allow authenticated users to insert contracts"
  ON contracts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Cho phép creator hoặc updated_by cập nhật contracts
CREATE POLICY "Allow creator or updated_by to update contracts"
  ON contracts FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = created_by::text OR auth.uid()::text = updated_by::text);

-- Policy: Cho phép creator xóa contracts (chỉ khi status = DRAFT hoặc CANCELLED)
CREATE POLICY "Allow creator to delete draft or cancelled contracts"
  ON contracts FOR DELETE
  TO authenticated
  USING (auth.uid()::text = created_by::text AND status IN ('DRAFT', 'CANCELLED'));

-- Policies cho bảng payment_schedules
-- Policy: Cho phép tất cả users đăng nhập đọc payment_schedules
CREATE POLICY "Allow authenticated users to read payment_schedules"
  ON payment_schedules FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép tất cả users đăng nhập tạo payment_schedules
CREATE POLICY "Allow authenticated users to insert payment_schedules"
  ON payment_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Cho phép tất cả users đăng nhập cập nhật payment_schedules
CREATE POLICY "Allow authenticated users to update payment_schedules"
  ON payment_schedules FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Cho phép tất cả users đăng nhập xóa payment_schedules
CREATE POLICY "Allow authenticated users to delete payment_schedules"
  ON payment_schedules FOR DELETE
  TO authenticated
  USING (true);

-- 7. Comments và mô tả các trường
-- ============================================
COMMENT ON TABLE contracts IS 'Bảng lưu trữ tất cả các hợp đồng (hợp đồng đặt cọc và hợp đồng mua bán)';
COMMENT ON COLUMN contracts.contract_type IS 'Loại hợp đồng: DEPOSIT (Đặt cọc), SALES (Mua bán)';
COMMENT ON COLUMN contracts.contract_code IS 'Mã hợp đồng tự động theo format: DC/YYYY/XXX (Đặt cọc) hoặc HDMB/YYYY/XXX (Mua bán)';
COMMENT ON COLUMN contracts.customer_name IS 'Tên khách hàng';
COMMENT ON COLUMN contracts.customer_phone IS 'Số điện thoại khách hàng';
COMMENT ON COLUMN contracts.customer_id_card IS 'Số CCCD/CMND khách hàng';
COMMENT ON COLUMN contracts.customer_address IS 'Địa chỉ khách hàng (chỉ cho hợp đồng mua bán)';
COMMENT ON COLUMN contracts.vehicle_id IS 'ID xe (tham chiếu bảng vehicles)';
COMMENT ON COLUMN contracts.deposit_amount IS 'Số tiền đặt cọc (chỉ cho hợp đồng đặt cọc)';
COMMENT ON COLUMN contracts.agreed_price IS 'Giá thỏa thuận (chỉ cho hợp đồng đặt cọc)';
COMMENT ON COLUMN contracts.expiry_date IS 'Ngày hết hạn hợp đồng đặt cọc (chỉ cho hợp đồng đặt cọc)';
COMMENT ON COLUMN contracts.payment_method IS 'Phương thức thanh toán: CASH, BANK_TRANSFER, E_WALLET (chỉ cho hợp đồng đặt cọc)';
COMMENT ON COLUMN contracts.deposit_contract_id IS 'ID hợp đồng đặt cọc (nếu có, chỉ cho hợp đồng mua bán)';
COMMENT ON COLUMN contracts.car_price IS 'Giá xe (chỉ cho hợp đồng mua bán)';
COMMENT ON COLUMN contracts.vat_amount IS 'Thuế VAT (chỉ cho hợp đồng mua bán)';
COMMENT ON COLUMN contracts.registration_fee IS 'Phí đăng ký (chỉ cho hợp đồng mua bán)';
COMMENT ON COLUMN contracts.insurance_fee IS 'Phí bảo hiểm (chỉ cho hợp đồng mua bán)';
COMMENT ON COLUMN contracts.discount IS 'Giảm giá (chỉ cho hợp đồng mua bán)';
COMMENT ON COLUMN contracts.total_amount IS 'Tổng giá trị hợp đồng';
COMMENT ON COLUMN contracts.paid_amount IS 'Số tiền đã thanh toán';
COMMENT ON COLUMN contracts.payment_type IS 'Phương thức thanh toán: INSTALLMENT (Trả góp), CASH (Trả thẳng) - chỉ cho hợp đồng mua bán';
COMMENT ON COLUMN contracts.bank_name IS 'Tên ngân hàng (chỉ cho hợp đồng mua bán, khi trả góp)';
COMMENT ON COLUMN contracts.loan_amount IS 'Số tiền vay ngân hàng (chỉ cho hợp đồng mua bán, khi trả góp)';
COMMENT ON COLUMN contracts.signed_date IS 'Ngày ký hợp đồng';
COMMENT ON COLUMN contracts.status IS 'Trạng thái: DRAFT (Nháp), ACTIVE (Đang hiệu lực), SIGNED (Đã ký), PAYING (Đang thanh toán), COMPLETED (Hoàn tất), CANCELLED (Đã hủy), CONVERTED (Đã chuyển đổi)';
COMMENT ON COLUMN contracts.created_by IS 'ID người tạo hợp đồng (từ bảng users)';
COMMENT ON COLUMN contracts.updated_by IS 'ID người cập nhật hợp đồng lần cuối (từ bảng users)';

COMMENT ON TABLE payment_schedules IS 'Bảng lưu trữ lịch trình thanh toán cho các hợp đồng';
COMMENT ON COLUMN payment_schedules.contract_id IS 'ID hợp đồng (tham chiếu bảng contracts)';
COMMENT ON COLUMN payment_schedules.milestone_name IS 'Tên mốc thanh toán (VD: "Đặt cọc giữ xe", "Thanh toán đợt 2")';
COMMENT ON COLUMN payment_schedules.amount IS 'Số tiền cần thanh toán';
COMMENT ON COLUMN payment_schedules.due_date IS 'Ngày đến hạn thanh toán';
COMMENT ON COLUMN payment_schedules.status IS 'Trạng thái: PENDING (Chờ thanh toán), PAID (Đã thanh toán), OVERDUE (Quá hạn)';
COMMENT ON COLUMN payment_schedules.paid_at IS 'Thời gian thanh toán (khi status = PAID)';
COMMENT ON COLUMN payment_schedules.transaction_id IS 'ID giao dịch thanh toán (tham chiếu bảng transactions, nếu đã thanh toán)';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, bạn cần:
-- 
-- 1. Kiểm tra RLS policies đã được áp dụng:
--    - Vào Authentication > Policies trong Supabase Dashboard
--    - Kiểm tra các policies cho bảng contracts và payment_schedules
--
-- 2. Test tạo contract mới:
--    - Vào trang /contracts/new
--    - Tạo hợp đồng mới
--    - Kiểm tra dữ liệu trong Supabase Dashboard > Table Editor > contracts
--
-- 3. Kiểm tra mã hợp đồng tự động:
--    - Tạo hợp đồng mới không nhập contract_code
--    - Kiểm tra xem contract_code có được tự động generate không
--
-- 4. Test lịch trình thanh toán:
--    - Tạo hợp đồng với payment_schedules
--    - Kiểm tra dữ liệu trong bảng payment_schedules
--
-- ============================================

