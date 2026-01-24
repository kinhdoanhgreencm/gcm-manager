-- ============================================
-- GCM Manager - Debt Records Table Setup SQL
-- ============================================
-- File này tạo bảng debt_records để lưu trữ chi tiết công nợ
-- Hỗ trợ cả công nợ phải thu (từ khách hàng) và công nợ phải trả (cho nhà cung cấp)
-- ============================================

-- 1. Tạo bảng debt_records (Chi tiết công nợ)
-- ============================================
CREATE TABLE IF NOT EXISTS debt_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Loại công nợ
  type TEXT NOT NULL CHECK (type IN ('RECEIVABLE', 'PAYABLE')),
  
  -- Thông tin đối tác (khách hàng hoặc nhà cung cấp)
  partner_id TEXT NOT NULL, -- ID của customer hoặc supplier
  partner_type TEXT NOT NULL CHECK (partner_type IN ('CUSTOMER', 'SUPPLIER')),
  partner_name TEXT NOT NULL, -- Tên đối tác
  partner_code TEXT, -- Mã đối tác (customer.code hoặc supplier.code)
  partner_phone TEXT, -- Số điện thoại đối tác
  
  -- Thông tin chứng từ gốc
  reference_id TEXT NOT NULL, -- ID hợp đồng (contracts.id) hoặc supplier.id
  reference_type TEXT NOT NULL CHECK (reference_type IN ('CONTRACT', 'SUPPLIER')),
  reference_code TEXT NOT NULL, -- Mã hợp đồng (contract_code) hoặc supplier.code
  
  -- Thông tin số tiền
  total_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Tổng giá trị
  paid_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Đã trả
  remaining_amount NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Còn lại
  
  -- Thông tin hạn trả
  due_date DATE, -- Ngày đến hạn thanh toán
  status TEXT NOT NULL DEFAULT 'NOT_DUE' CHECK (status IN ('PAID', 'OVERDUE', 'DUE', 'NOT_DUE')),
  
  -- Thông tin bổ sung
  notes TEXT, -- Ghi chú (VD: tên mốc thanh toán, lý do công nợ)
  last_payment_date TIMESTAMPTZ, -- Ngày thanh toán lần cuối
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Tạo index cho các trường thường dùng
-- ============================================
CREATE INDEX IF NOT EXISTS idx_debt_records_type ON debt_records(type);
CREATE INDEX IF NOT EXISTS idx_debt_records_partner_id ON debt_records(partner_id);
CREATE INDEX IF NOT EXISTS idx_debt_records_partner_type ON debt_records(partner_type);
CREATE INDEX IF NOT EXISTS idx_debt_records_reference_id ON debt_records(reference_id);
CREATE INDEX IF NOT EXISTS idx_debt_records_reference_type ON debt_records(reference_type);
CREATE INDEX IF NOT EXISTS idx_debt_records_status ON debt_records(status);
CREATE INDEX IF NOT EXISTS idx_debt_records_due_date ON debt_records(due_date);
CREATE INDEX IF NOT EXISTS idx_debt_records_remaining_amount ON debt_records(remaining_amount);
CREATE INDEX IF NOT EXISTS idx_debt_records_created_at ON debt_records(created_at DESC);

-- Index composite để tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_debt_records_type_status ON debt_records(type, status);
CREATE INDEX IF NOT EXISTS idx_debt_records_reference ON debt_records(reference_type, reference_id);

-- 3. Tạo trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_debt_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_debt_records_updated_at_trigger ON debt_records;
CREATE TRIGGER update_debt_records_updated_at_trigger
  BEFORE UPDATE ON debt_records
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_records_updated_at();

-- 4. Function để tính toán trạng thái công nợ
-- ============================================
CREATE OR REPLACE FUNCTION calculate_debt_status(due_date_value DATE, remaining_amount_value NUMERIC)
RETURNS TEXT AS $$
BEGIN
  IF remaining_amount_value <= 0 THEN
    RETURN 'PAID';
  END IF;
  
  IF due_date_value IS NULL THEN
    RETURN 'NOT_DUE';
  END IF;
  
  DECLARE
    diff_days INTEGER;
  BEGIN
    diff_days := CURRENT_DATE - due_date_value;
    
    IF diff_days < 0 THEN
      RETURN 'NOT_DUE';
    ELSIF diff_days = 0 THEN
      RETURN 'DUE';
    ELSE
      RETURN 'OVERDUE';
    END IF;
  END;
END;
$$ LANGUAGE plpgsql;

-- 5. Function để sync công nợ phải thu từ contracts
-- ============================================
CREATE OR REPLACE FUNCTION sync_receivable_debts()
RETURNS void AS $$
DECLARE
  contract_record RECORD;
  customer_record RECORD;
  total_paid NUMERIC;
  remaining_amount NUMERIC;
  pending_schedule RECORD;
  due_date_value DATE;
  debt_status TEXT;
  customer_code_value TEXT;
BEGIN
  -- Xóa các debt_records cũ của contracts (để sync lại)
  DELETE FROM debt_records 
  WHERE type = 'RECEIVABLE' AND reference_type = 'CONTRACT';
  
  -- Lặp qua tất cả hợp đồng bán hàng
  FOR contract_record IN
    SELECT 
      c.id,
      c.contract_code,
      c.customer_name,
      c.customer_phone,
      c.total_amount,
      c.signed_date
    FROM contracts c
    WHERE c.contract_type = 'SALES'
      AND c.status IN ('SIGNED', 'PAYING', 'COMPLETED')
  LOOP
    -- Tính tổng đã trả từ transactions
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM transactions
    WHERE reference_type = 'CONTRACT'
      AND reference_id = contract_record.id::TEXT
      AND type = 'INCOME'
      AND status IN ('APPROVED', 'LOCKED');
    
    -- Tính số tiền còn lại từ payment_schedules chưa thanh toán
    SELECT COALESCE(SUM(amount), 0) INTO remaining_amount
    FROM payment_schedules
    WHERE contract_id = contract_record.id
      AND status IN ('PENDING', 'OVERDUE');
    
    -- Bỏ qua nếu không còn nợ
    IF remaining_amount <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Tìm payment_schedule gần nhất chưa thanh toán
    SELECT due_date INTO due_date_value
    FROM payment_schedules
    WHERE contract_id = contract_record.id
      AND status IN ('PENDING', 'OVERDUE')
    ORDER BY due_date ASC NULLS LAST
    LIMIT 1;
    
    -- Tính trạng thái
    debt_status := calculate_debt_status(due_date_value, remaining_amount);
    
    -- Lấy customer code
    customer_code_value := NULL;
    IF contract_record.customer_phone IS NOT NULL THEN
      SELECT code INTO customer_code_value
      FROM customers
      WHERE phone = contract_record.customer_phone
      LIMIT 1;
    END IF;
    
    -- Lấy milestone_name từ payment_schedule gần nhất
    SELECT milestone_name INTO pending_schedule
    FROM payment_schedules
    WHERE contract_id = contract_record.id
      AND status IN ('PENDING', 'OVERDUE')
    ORDER BY due_date ASC NULLS LAST
    LIMIT 1;
    
    -- Insert hoặc update debt_record
    INSERT INTO debt_records (
      type,
      partner_id,
      partner_type,
      partner_name,
      partner_code,
      partner_phone,
      reference_id,
      reference_type,
      reference_code,
      total_amount,
      paid_amount,
      remaining_amount,
      due_date,
      status,
      notes
    ) VALUES (
      'RECEIVABLE',
      contract_record.id::TEXT,
      'CUSTOMER',
      contract_record.customer_name,
      customer_code_value,
      contract_record.customer_phone,
      contract_record.id::TEXT,
      'CONTRACT',
      contract_record.contract_code,
      COALESCE(contract_record.total_amount, 0),
      total_paid,
      remaining_amount,
      due_date_value,
      debt_status,
      pending_schedule.milestone_name
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 6. Function để sync công nợ phải trả từ suppliers
-- ============================================
CREATE OR REPLACE FUNCTION sync_payable_debts()
RETURNS void AS $$
DECLARE
  supplier_record RECORD;
  total_import_value NUMERIC;
  total_paid NUMERIC;
  remaining_amount NUMERIC;
  latest_entry_date DATE;
  due_date_value DATE;
  debt_status TEXT;
BEGIN
  -- Xóa các debt_records cũ của suppliers (để sync lại)
  DELETE FROM debt_records 
  WHERE type = 'PAYABLE' AND reference_type = 'SUPPLIER';
  
  -- Lặp qua tất cả suppliers có payment_terms = DEFERRED và debt > 0
  FOR supplier_record IN
    SELECT 
      s.id,
      s.code,
      s.name,
      s.phone,
      s.debt,
      s.payment_terms
    FROM suppliers s
    WHERE s.payment_terms = 'DEFERRED'
      AND s.debt > 0
      AND s.status = 'ACTIVE'
  LOOP
    -- Tính tổng giá trị nhập từ vehicles
    SELECT COALESCE(SUM(cost), 0) INTO total_import_value
    FROM vehicles
    WHERE supplier_id = supplier_record.id::TEXT 
       OR supplier_id = supplier_record.code;
    
    -- Tính tổng thanh toán từ transactions
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM transactions
    WHERE reference_type = 'SUPPLIER'
      AND (reference_id = supplier_record.id::TEXT OR reference_id = supplier_record.code)
      AND type = 'EXPENSE'
      AND status IN ('APPROVED', 'LOCKED');
    
    -- Sử dụng debt từ supplier nếu có, nếu không thì tính từ vehicles - transactions
    remaining_amount := GREATEST(0, COALESCE(supplier_record.debt, 0));
    
    IF remaining_amount <= 0 THEN
      CONTINUE;
    END IF;
    
    -- Lấy ngày nhập gần nhất để tính due_date (giả sử hạn trả là 30 ngày sau ngày nhập)
    SELECT MAX(entry_date) INTO latest_entry_date
    FROM vehicles
    WHERE supplier_id = supplier_record.id::TEXT 
       OR supplier_id = supplier_record.code;
    
    IF latest_entry_date IS NOT NULL THEN
      due_date_value := latest_entry_date + INTERVAL '30 days';
    ELSE
      due_date_value := NULL;
    END IF;
    
    -- Tính trạng thái
    debt_status := calculate_debt_status(due_date_value, remaining_amount);
    
    -- Insert hoặc update debt_record
    INSERT INTO debt_records (
      type,
      partner_id,
      partner_type,
      partner_name,
      partner_code,
      partner_phone,
      reference_id,
      reference_type,
      reference_code,
      total_amount,
      paid_amount,
      remaining_amount,
      due_date,
      status,
      notes
    ) VALUES (
      'PAYABLE',
      supplier_record.id::TEXT,
      'SUPPLIER',
      supplier_record.name,
      supplier_record.code,
      supplier_record.phone,
      supplier_record.id::TEXT,
      'SUPPLIER',
      COALESCE(supplier_record.code, supplier_record.id::TEXT),
      total_import_value,
      total_paid,
      remaining_amount,
      due_date_value,
      debt_status,
      'Công nợ nhà cung cấp'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 7. Function để sync tất cả công nợ
-- ============================================
CREATE OR REPLACE FUNCTION sync_all_debts()
RETURNS void AS $$
BEGIN
  PERFORM sync_receivable_debts();
  PERFORM sync_payable_debts();
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger để tự động cập nhật debt_records khi có transaction mới
-- ============================================
CREATE OR REPLACE FUNCTION update_debt_record_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  debt_record_id UUID;
  new_paid_amount NUMERIC;
  new_remaining_amount NUMERIC;
  new_status TEXT;
BEGIN
  -- Chỉ xử lý khi transaction được approve hoặc lock
  IF NEW.status NOT IN ('APPROVED', 'LOCKED') THEN
    RETURN NEW;
  END IF;
  
  -- Tìm debt_record tương ứng
  IF NEW.reference_type = 'CONTRACT' AND NEW.type = 'INCOME' THEN
    -- Công nợ phải thu
    SELECT id INTO debt_record_id
    FROM debt_records
    WHERE reference_type = 'CONTRACT'
      AND reference_id = NEW.reference_id
      AND type = 'RECEIVABLE'
    LIMIT 1;
    
    IF debt_record_id IS NOT NULL THEN
      -- Tính lại paid_amount và remaining_amount
      SELECT 
        COALESCE(SUM(amount), 0),
        dr.total_amount - COALESCE(SUM(t.amount), 0)
      INTO new_paid_amount, new_remaining_amount
      FROM transactions t, debt_records dr
      WHERE t.reference_type = 'CONTRACT'
        AND t.reference_id = NEW.reference_id
        AND t.type = 'INCOME'
        AND t.status IN ('APPROVED', 'LOCKED')
        AND dr.id = debt_record_id;
      
      -- Tính lại status
      SELECT calculate_debt_status(due_date, new_remaining_amount) INTO new_status
      FROM debt_records
      WHERE id = debt_record_id;
      
      -- Cập nhật debt_record
      UPDATE debt_records
      SET 
        paid_amount = new_paid_amount,
        remaining_amount = GREATEST(0, new_remaining_amount),
        status = new_status,
        last_payment_date = CASE WHEN NEW.status = 'APPROVED' THEN NEW.date ELSE last_payment_date END,
        updated_at = NOW()
      WHERE id = debt_record_id;
    END IF;
    
  ELSIF NEW.reference_type = 'SUPPLIER' AND NEW.type = 'EXPENSE' THEN
    -- Công nợ phải trả
    SELECT id INTO debt_record_id
    FROM debt_records
    WHERE reference_type = 'SUPPLIER'
      AND reference_id = NEW.reference_id
      AND type = 'PAYABLE'
    LIMIT 1;
    
    IF debt_record_id IS NOT NULL THEN
      -- Tính lại paid_amount và remaining_amount
      SELECT 
        COALESCE(SUM(amount), 0),
        dr.total_amount - COALESCE(SUM(t.amount), 0)
      INTO new_paid_amount, new_remaining_amount
      FROM transactions t, debt_records dr
      WHERE t.reference_type = 'SUPPLIER'
        AND (t.reference_id = NEW.reference_id OR t.reference_id = (SELECT code FROM suppliers WHERE id::TEXT = NEW.reference_id))
        AND t.type = 'EXPENSE'
        AND t.status IN ('APPROVED', 'LOCKED')
        AND dr.id = debt_record_id;
      
      -- Tính lại status
      SELECT calculate_debt_status(due_date, new_remaining_amount) INTO new_status
      FROM debt_records
      WHERE id = debt_record_id;
      
      -- Cập nhật debt_record
      UPDATE debt_records
      SET 
        paid_amount = new_paid_amount,
        remaining_amount = GREATEST(0, new_remaining_amount),
        status = new_status,
        last_payment_date = CASE WHEN NEW.status = 'APPROVED' THEN NEW.date ELSE last_payment_date END,
        updated_at = NOW()
      WHERE id = debt_record_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_debt_record_from_transaction_trigger ON transactions;
CREATE TRIGGER update_debt_record_from_transaction_trigger
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_debt_record_from_transaction();

-- 9. Cấu hình Row Level Security (RLS)
-- ============================================
ALTER TABLE debt_records ENABLE ROW LEVEL SECURITY;

-- Xóa các policies cũ nếu có
DROP POLICY IF EXISTS "Public read access for debt_records" ON debt_records;
DROP POLICY IF EXISTS "Authenticated users can insert debt_records" ON debt_records;
DROP POLICY IF EXISTS "Authenticated users can update debt_records" ON debt_records;
DROP POLICY IF EXISTS "Authenticated users can delete debt_records" ON debt_records;

-- Policy: Cho phép tất cả users đọc debt_records
CREATE POLICY "Public read access for debt_records"
  ON debt_records FOR SELECT
  USING (true);

-- Policy: Cho phép authenticated users tạo debt_records
CREATE POLICY "Authenticated users can insert debt_records"
  ON debt_records FOR INSERT
  WITH CHECK (true);

-- Policy: Cho phép authenticated users cập nhật debt_records
CREATE POLICY "Authenticated users can update debt_records"
  ON debt_records FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép authenticated users xóa debt_records
CREATE POLICY "Authenticated users can delete debt_records"
  ON debt_records FOR DELETE
  USING (true);

-- 10. Comments và mô tả các trường
-- ============================================
COMMENT ON TABLE debt_records IS 'Bảng lưu trữ chi tiết công nợ (phải thu và phải trả)';
COMMENT ON COLUMN debt_records.type IS 'Loại công nợ: RECEIVABLE (Phải thu từ khách hàng), PAYABLE (Phải trả cho nhà cung cấp)';
COMMENT ON COLUMN debt_records.partner_id IS 'ID của đối tác (customer hoặc supplier)';
COMMENT ON COLUMN debt_records.partner_type IS 'Loại đối tác: CUSTOMER (Khách hàng), SUPPLIER (Nhà cung cấp)';
COMMENT ON COLUMN debt_records.partner_name IS 'Tên đối tác';
COMMENT ON COLUMN debt_records.partner_code IS 'Mã đối tác (customer.code hoặc supplier.code)';
COMMENT ON COLUMN debt_records.reference_id IS 'ID chứng từ gốc (contracts.id hoặc suppliers.id)';
COMMENT ON COLUMN debt_records.reference_type IS 'Loại chứng từ: CONTRACT (Hợp đồng), SUPPLIER (Nhà cung cấp)';
COMMENT ON COLUMN debt_records.reference_code IS 'Mã chứng từ (contract_code hoặc supplier.code)';
COMMENT ON COLUMN debt_records.total_amount IS 'Tổng giá trị công nợ';
COMMENT ON COLUMN debt_records.paid_amount IS 'Số tiền đã trả';
COMMENT ON COLUMN debt_records.remaining_amount IS 'Số tiền còn lại';
COMMENT ON COLUMN debt_records.due_date IS 'Ngày đến hạn thanh toán';
COMMENT ON COLUMN debt_records.status IS 'Trạng thái: PAID (Đã tất toán), OVERDUE (Quá hạn), DUE (Đến hạn), NOT_DUE (Chưa đến hạn)';
COMMENT ON COLUMN debt_records.notes IS 'Ghi chú (VD: tên mốc thanh toán, lý do công nợ)';
COMMENT ON COLUMN debt_records.last_payment_date IS 'Ngày thanh toán lần cuối';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. Bảng debt_records đã được tạo với đầy đủ các trường
-- 2. Các function sync đã được tạo:
--    - sync_receivable_debts(): Sync công nợ phải thu từ contracts
--    - sync_payable_debts(): Sync công nợ phải trả từ suppliers
--    - sync_all_debts(): Sync tất cả công nợ
-- 3. Trigger tự động cập nhật khi có transaction mới
-- 
-- Để sync dữ liệu lần đầu, chạy:
-- SELECT sync_all_debts();
--
-- Để sync lại sau khi có thay đổi, có thể gọi lại:
-- SELECT sync_receivable_debts(); -- Chỉ sync công nợ phải thu
-- SELECT sync_payable_debts(); -- Chỉ sync công nợ phải trả
-- SELECT sync_all_debts(); -- Sync tất cả
--
-- ============================================
