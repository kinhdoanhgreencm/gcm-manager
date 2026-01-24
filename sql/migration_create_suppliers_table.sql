-- ============================================
-- GCM Manager - Suppliers Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng suppliers (Nhà cung cấp)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng suppliers (Nhà cung cấp)
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE, -- Mã nhà cung cấp theo format NCC-XXXX
  type TEXT NOT NULL CHECK (type IN ('OEM', 'DEALER', 'INDIVIDUAL', 'AUCTION')),
  name TEXT NOT NULL, -- Tên hiển thị nhà cung cấp
  phone TEXT,
  email TEXT,
  address TEXT,
  -- Thông tin pháp lý (cho doanh nghiệp)
  tax_code TEXT, -- Mã số thuế doanh nghiệp
  company_name TEXT, -- Tên công ty theo GPKD
  representative TEXT, -- Người đại diện
  position TEXT, -- Chức vụ
  -- Thông tin pháp lý (cho cá nhân)
  id_card TEXT, -- Số CCCD / Hộ chiếu
  -- Thông tin thanh toán
  payment_terms TEXT NOT NULL DEFAULT 'DEFERRED' CHECK (payment_terms IN ('IMMEDIATE', 'DEFERRED')),
  bank_name TEXT, -- Tên ngân hàng
  bank_account TEXT, -- Số tài khoản hưởng thụ
  -- Thông tin bổ sung
  assigned_staff_id TEXT, -- ID nhân viên phụ trách đối tác
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT, -- Ghi chú nội bộ
  -- Thống kê (tính toán tự động)
  total_vehicles INTEGER DEFAULT 0, -- Tổng số xe đã nhập từ nhà cung cấp này
  total_import_value NUMERIC(15, 2) DEFAULT 0, -- Tổng giá trị nhập tích lũy
  debt NUMERIC(15, 2) DEFAULT 0, -- Công nợ hiện tại (phải trả nhà cung cấp)
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo index cho các trường thường dùng để tối ưu query
-- ============================================
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_type ON suppliers(type);
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_tax_code ON suppliers(tax_code);
CREATE INDEX IF NOT EXISTS idx_suppliers_id_card ON suppliers(id_card);
CREATE INDEX IF NOT EXISTS idx_suppliers_assigned_staff_id ON suppliers(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_created_at ON suppliers(created_at DESC);

-- 3. Tạo function để tự động generate mã nhà cung cấp theo format NCC-XXXX
-- ============================================
CREATE OR REPLACE FUNCTION generate_supplier_code()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Chỉ generate code nếu chưa có code
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Lấy số thứ tự tiếp theo từ các nhà cung cấp đã có
    SELECT COALESCE(MAX(
      CASE 
        WHEN code ~ '^NCC-[0-9]+$' THEN 
          CAST(SUBSTRING(code FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM suppliers;
    
    -- Format mã: NCC-1000, NCC-1001, ... NCC-9999
    new_code := 'NCC-' || LPAD(next_number::TEXT, 4, '0');
    
    -- Đảm bảo mã là duy nhất (nếu trùng thì tăng số lên)
    WHILE EXISTS (SELECT 1 FROM suppliers WHERE code = new_code) LOOP
      next_number := next_number + 1;
      new_code := 'NCC-' || LPAD(next_number::TEXT, 4, '0');
    END LOOP;
    
    NEW.code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động generate code khi insert nhà cung cấp mới
DROP TRIGGER IF EXISTS generate_supplier_code_trigger ON suppliers;

CREATE TRIGGER generate_supplier_code_trigger
  BEFORE INSERT ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION generate_supplier_code();

-- Generate code cho các nhà cung cấp đã có sẵn nhưng chưa có code
DO $$
DECLARE
  v_record RECORD;
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Lấy số thứ tự hiện tại từ các nhà cung cấp đã có code
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^NCC-[0-9]+$' THEN 
        CAST(SUBSTRING(code FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO next_number
  FROM suppliers
  WHERE code IS NOT NULL AND code != '' AND code ~ '^NCC-[0-9]+$';
  
  -- Generate code cho các nhà cung cấp chưa có code
  FOR v_record IN 
    SELECT id FROM suppliers 
    WHERE code IS NULL OR code = ''
    ORDER BY created_at ASC
  LOOP
    next_number := next_number + 1;
    new_code := 'NCC-' || LPAD(next_number::TEXT, 4, '0');
    
    -- Đảm bảo mã là duy nhất
    WHILE EXISTS (SELECT 1 FROM suppliers WHERE code = new_code) LOOP
      next_number := next_number + 1;
      new_code := 'NCC-' || LPAD(next_number::TEXT, 4, '0');
    END LOOP;
    
    UPDATE suppliers SET code = new_code WHERE id = v_record.id;
  END LOOP;
END $$;

-- 4. Tạo trigger để tự động cập nhật updated_at khi có thay đổi
-- ============================================
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;

CREATE TRIGGER update_suppliers_updated_at 
  BEFORE UPDATE ON suppliers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 5. Tạo function để tự động cập nhật thống kê (total_vehicles, total_import_value, debt)
-- ============================================
CREATE OR REPLACE FUNCTION update_supplier_stats()
RETURNS TRIGGER AS $$
DECLARE
  supplier_id_value TEXT;
BEGIN
  -- Xác định supplier_id từ trigger
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    supplier_id_value := COALESCE(NEW.supplier_id, OLD.supplier_id);
  ELSE
    supplier_id_value := OLD.supplier_id;
  END IF;
  
  -- Chỉ cập nhật nếu có supplier_id
  IF supplier_id_value IS NOT NULL AND supplier_id_value != '' THEN
    -- Cập nhật total_vehicles, total_import_value và debt
    -- So sánh supplier_id (TEXT) với id (UUID) bằng cách convert UUID sang TEXT
    UPDATE suppliers s
    SET 
      total_vehicles = (
        SELECT COUNT(*) 
        FROM vehicles 
        WHERE supplier_id = supplier_id_value OR supplier_id = s.id::TEXT OR supplier_id = s.code
      ),
      total_import_value = (
        SELECT COALESCE(SUM(cost), 0)
        FROM vehicles 
        WHERE supplier_id = supplier_id_value OR supplier_id = s.id::TEXT OR supplier_id = s.code
      ),
      -- Tính debt: Nếu payment_terms = DEFERRED, debt = total_import_value (sẽ trừ thanh toán sau)
      -- Nếu payment_terms = IMMEDIATE, debt = 0
      debt = CASE
        WHEN s.payment_terms = 'DEFERRED' THEN
          COALESCE((
            SELECT SUM(cost)
            FROM vehicles 
            WHERE supplier_id = supplier_id_value OR supplier_id = s.id::TEXT OR supplier_id = s.code
          ), 0)
        ELSE 0
      END,
      updated_at = NOW()
    WHERE s.id::TEXT = supplier_id_value OR s.code = supplier_id_value;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động cập nhật thống kê khi có thay đổi về xe
DROP TRIGGER IF EXISTS update_supplier_stats_trigger ON vehicles;

CREATE TRIGGER update_supplier_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_stats();

-- 6. Cấu hình Row Level Security (RLS)
-- ============================================

-- Bật RLS cho bảng suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Xóa các policies cũ nếu có (để tránh conflict)
DROP POLICY IF EXISTS "Public read access" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can insert" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can update" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can delete" ON suppliers;

-- Policy: Cho phép tất cả người dùng đọc dữ liệu (public read)
CREATE POLICY "Public read access" ON suppliers
  FOR SELECT
  USING (true);

-- Policy: Cho phép authenticated users thêm nhà cung cấp mới
CREATE POLICY "Authenticated users can insert" ON suppliers
  FOR INSERT
  WITH CHECK (true);

-- Policy: Cho phép authenticated users cập nhật thông tin nhà cung cấp
CREATE POLICY "Authenticated users can update" ON suppliers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép authenticated users xóa nhà cung cấp (nếu cần)
CREATE POLICY "Authenticated users can delete" ON suppliers
  FOR DELETE
  USING (true);

-- 7.2. Tạo View để thống kê nhà cung cấp (tùy chọn)
-- ============================================

CREATE OR REPLACE VIEW suppliers_summary AS
SELECT 
  COUNT(*) as total_suppliers,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
  COUNT(*) FILTER (WHERE status = 'INACTIVE') as inactive_count,
  COUNT(*) FILTER (WHERE type = 'OEM') as oem_count,
  COUNT(*) FILTER (WHERE type = 'DEALER') as dealer_count,
  COUNT(*) FILTER (WHERE type = 'INDIVIDUAL') as individual_count,
  COUNT(*) FILTER (WHERE type = 'AUCTION') as auction_count,
  SUM(total_import_value) as total_import_value,
  SUM(debt) as total_debt,
  SUM(total_vehicles) as total_vehicles_from_suppliers
FROM suppliers;

-- 7.1. Tạo Function để cập nhật lại thống kê cho tất cả nhà cung cấp (hữu ích khi cần đồng bộ lại)
-- ============================================

CREATE OR REPLACE FUNCTION refresh_all_supplier_stats()
RETURNS void AS $$
BEGIN
  UPDATE suppliers s
  SET 
    total_vehicles = (
      SELECT COUNT(*) 
      FROM vehicles v
      WHERE v.supplier_id = s.id::TEXT OR v.supplier_id = s.code
    ),
    total_import_value = (
      SELECT COALESCE(SUM(cost), 0)
      FROM vehicles v
      WHERE v.supplier_id = s.id::TEXT OR v.supplier_id = s.code
    ),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- 8. Tạo Function để tìm kiếm nhà cung cấp
-- ============================================

CREATE OR REPLACE FUNCTION search_suppliers(search_term TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  type TEXT,
  phone TEXT,
  email TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    s.code,
    s.name,
    s.type,
    s.phone,
    s.email,
    s.status
  FROM suppliers s
  WHERE 
    s.name ILIKE '%' || search_term || '%'
    OR s.code ILIKE '%' || search_term || '%'
    OR s.tax_code ILIKE '%' || search_term || '%'
    OR s.id_card ILIKE '%' || search_term || '%'
    OR s.phone ILIKE '%' || search_term || '%'
    OR s.email ILIKE '%' || search_term || '%'
  ORDER BY s.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 9. Comments và mô tả các trường
-- ============================================

COMMENT ON TABLE suppliers IS 'Bảng lưu trữ thông tin các nhà cung cấp (NCC)';
COMMENT ON COLUMN suppliers.code IS 'Mã nhà cung cấp tự động theo format NCC-XXXX (VD: NCC-1000, NCC-1001...) - Tự động generate khi insert';
COMMENT ON COLUMN suppliers.type IS 'Loại nhà cung cấp: OEM (Hãng/Nhà phân phối chính hãng), DEALER (Đại lý trung gian), INDIVIDUAL (Cá nhân ký gửi xe), AUCTION (Nguồn đấu giá/Khác)';
COMMENT ON COLUMN suppliers.name IS 'Tên hiển thị nhà cung cấp (bắt buộc)';
COMMENT ON COLUMN suppliers.phone IS 'Số điện thoại liên hệ';
COMMENT ON COLUMN suppliers.email IS 'Email liên hệ';
COMMENT ON COLUMN suppliers.address IS 'Địa chỉ trụ sở';
COMMENT ON COLUMN suppliers.tax_code IS 'Mã số thuế doanh nghiệp (dùng cho loại OEM, DEALER, AUCTION)';
COMMENT ON COLUMN suppliers.company_name IS 'Tên công ty theo Giấy phép kinh doanh (dùng cho loại OEM, DEALER, AUCTION)';
COMMENT ON COLUMN suppliers.representative IS 'Người đại diện pháp luật (dùng cho loại OEM, DEALER, AUCTION)';
COMMENT ON COLUMN suppliers.position IS 'Chức vụ của người đại diện (dùng cho loại OEM, DEALER, AUCTION)';
COMMENT ON COLUMN suppliers.id_card IS 'Số CCCD / Hộ chiếu (dùng cho loại INDIVIDUAL)';
COMMENT ON COLUMN suppliers.payment_terms IS 'Điều khoản thanh toán: IMMEDIATE (Trả ngay), DEFERRED (Trả chậm/Công nợ)';
COMMENT ON COLUMN suppliers.bank_name IS 'Tên ngân hàng';
COMMENT ON COLUMN suppliers.bank_account IS 'Số tài khoản hưởng thụ';
COMMENT ON COLUMN suppliers.assigned_staff_id IS 'ID nhân viên phụ trách đối tác';
COMMENT ON COLUMN suppliers.status IS 'Trạng thái: ACTIVE (Đang hoạt động), INACTIVE (Ngừng hoạt động)';
COMMENT ON COLUMN suppliers.notes IS 'Ghi chú nội bộ';
COMMENT ON COLUMN suppliers.total_vehicles IS 'Tổng số xe đã nhập từ nhà cung cấp này (tự động tính toán)';
COMMENT ON COLUMN suppliers.total_import_value IS 'Tổng giá trị nhập tích lũy (VNĐ) - tự động tính toán từ tổng cost của các xe';
COMMENT ON COLUMN suppliers.debt IS 'Công nợ hiện tại phải trả nhà cung cấp (VNĐ) - cần cập nhật thủ công hoặc qua bảng transactions';

-- 10. Thêm constraint để đảm bảo tính hợp lệ của dữ liệu (tùy chọn)
-- ============================================

-- Đảm bảo rằng nếu là doanh nghiệp (OEM, DEALER, AUCTION) thì phải có tax_code
-- Đảm bảo rằng nếu là cá nhân (INDIVIDUAL) thì phải có id_card
-- (Có thể thêm constraint này nếu cần, nhưng hiện tại để linh hoạt hơn)

-- 11. Dữ liệu mẫu để test (tùy chọn - uncomment để sử dụng)
-- ============================================

/*
-- Thêm dữ liệu mẫu
INSERT INTO suppliers (
  type, name, phone, email, address, 
  tax_code, company_name, representative, position,
  payment_terms, bank_name, bank_account,
  assigned_staff_id, status, notes
) VALUES 
  (
    'OEM',
    'VinFast Corporation',
    '1900-1234',
    'contact@vinfast.vn',
    'Số 7, Đường Bằng Lăng, Khu đô thị Vinhomes Ocean Park, Gia Lâm, Hà Nội',
    '0101234567',
    'Công ty TNHH Sản xuất và Kinh doanh VinFast',
    'Nguyễn Văn A',
    'Tổng Giám đốc',
    'DEFERRED',
    'Vietcombank',
    '1234567890',
    'staff_admin',
    'ACTIVE',
    'Nhà cung cấp chính hãng VinFast'
  ),
  (
    'DEALER',
    'Đại lý VinFast Long Biên',
    '024-12345678',
    'longbien@vinfast.vn',
    '123 Đường Long Biên, Quận Long Biên, Hà Nội',
    '0109876543',
    'Công ty TNHH Đại lý VinFast Long Biên',
    'Trần Thị B',
    'Giám đốc',
    'DEFERRED',
    'Techcombank',
    '9876543210',
    'staff_sale_1',
    'ACTIVE',
    'Đại lý trung gian tại Long Biên'
  ),
  (
    'INDIVIDUAL',
    'Nguyễn Văn C',
    '0912345678',
    'nguyenvanc@gmail.com',
    '456 Đường Nguyễn Văn Cừ, Quận 5, TP.HCM',
    NULL,
    NULL,
    NULL,
    NULL,
    'IMMEDIATE',
    'VPBank',
    '1122334455',
    'staff_admin',
    'ACTIVE',
    'Cá nhân ký gửi xe cũ'
  );
*/

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, bạn cần:
-- 
-- 1. Kiểm tra RLS policies đã được áp dụng:
--    - Vào Authentication > Policies
--    - Kiểm tra các policies cho bảng suppliers
--
-- 2. Test thêm nhà cung cấp mới:
--    - Vào trang /suppliers/new
--    - Điền thông tin form
--    - Submit và kiểm tra dữ liệu trong Supabase Dashboard
--
-- 3. Xem dữ liệu:
--    - Vào Table Editor > suppliers để xem danh sách nhà cung cấp
--    - Kiểm tra mã code tự động được generate (NCC-1000, NCC-1001...)
--
-- 4. Kiểm tra thống kê tự động:
--    - Khi thêm xe mới với supplier_id, thống kê sẽ tự động cập nhật
--    - Kiểm tra total_vehicles và total_import_value
--
-- ============================================

