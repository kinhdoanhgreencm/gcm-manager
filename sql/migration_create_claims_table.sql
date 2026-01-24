-- ============================================
-- GCM Manager - Claims Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng claims (Hồ sơ Claim)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng claims (Hồ sơ Claim)
-- ============================================
CREATE TABLE IF NOT EXISTS claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  claim_code TEXT NOT NULL UNIQUE, -- Mã hồ sơ claim (VD: CLM-2024-001)
  
  -- Loại và trạng thái
  type TEXT NOT NULL CHECK (type IN ('WARRANTY', 'COMPLAINT', 'REPAIR', 'REPLACEMENT', 'REFUND')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED')),
  priority TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  
  -- Thông tin khách hàng
  customer_id TEXT, -- ID khách hàng (tham chiếu customers)
  customer_name TEXT NOT NULL, -- Tên khách hàng
  customer_phone TEXT NOT NULL, -- Số điện thoại
  customer_email TEXT, -- Email
  
  -- Thông tin liên quan
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL, -- ID xe
  vehicle_code TEXT, -- Mã xe
  contract_id UUID REFERENCES contracts(id) ON DELETE SET NULL, -- ID hợp đồng
  contract_code TEXT, -- Mã hợp đồng
  
  -- Thông tin claim
  title TEXT NOT NULL, -- Tiêu đề claim
  description TEXT NOT NULL, -- Mô tả chi tiết
  requested_amount NUMERIC(15, 2), -- Số tiền yêu cầu
  approved_amount NUMERIC(15, 2), -- Số tiền được duyệt
  resolution TEXT, -- Giải pháp/Phương án xử lý
  notes TEXT, -- Ghi chú
  
  -- Thông tin xử lý
  assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL, -- ID nhân viên được giao xử lý
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- ID người tạo
  resolved_by_id UUID REFERENCES users(id) ON DELETE SET NULL, -- ID người giải quyết
  
  -- Thời gian
  reported_date DATE NOT NULL DEFAULT CURRENT_DATE, -- Ngày báo cáo
  due_date DATE, -- Ngày hạn xử lý
  resolved_date DATE, -- Ngày giải quyết
  closed_date DATE, -- Ngày đóng
  
  -- Tài liệu đính kèm
  attachments TEXT[], -- Danh sách URL file đính kèm (từ Supabase Storage)
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo Indexes cho bảng claims
-- ============================================
CREATE INDEX IF NOT EXISTS idx_claims_claim_code ON claims(claim_code);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_type ON claims(type);
CREATE INDEX IF NOT EXISTS idx_claims_customer_id ON claims(customer_id);
CREATE INDEX IF NOT EXISTS idx_claims_vehicle_id ON claims(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_claims_contract_id ON claims(contract_id);
CREATE INDEX IF NOT EXISTS idx_claims_assigned_to_id ON claims(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_claims_created_by_id ON claims(created_by_id);
CREATE INDEX IF NOT EXISTS idx_claims_reported_date ON claims(reported_date DESC);
CREATE INDEX IF NOT EXISTS idx_claims_created_at ON claims(created_at DESC);

-- 3. Tạo Trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_claims_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_claims_updated_at_trigger ON claims;

CREATE TRIGGER update_claims_updated_at_trigger 
  BEFORE UPDATE ON claims 
  FOR EACH ROW 
  EXECUTE FUNCTION update_claims_updated_at();

-- 4. Tạo function để tự động tạo mã claim code
-- ============================================
CREATE OR REPLACE FUNCTION generate_claim_code()
RETURNS TEXT AS $$
DECLARE
  year_part TEXT;
  last_number INTEGER;
  new_code TEXT;
BEGIN
  -- Lấy năm hiện tại
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Tìm số thứ tự lớn nhất trong năm hiện tại
  SELECT COALESCE(MAX(CAST(SUBSTRING(claim_code FROM 'CLM-' || year_part || '-(.+)$') AS INTEGER)), 0)
  INTO last_number
  FROM claims
  WHERE claim_code LIKE 'CLM-' || year_part || '-%';
  
  -- Tăng số thứ tự lên 1
  last_number := last_number + 1;
  
  -- Tạo mã mới
  new_code := 'CLM-' || year_part || '-' || LPAD(last_number::TEXT, 3, '0');
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 5. Tạo trigger để tự động tạo claim_code khi insert (nếu chưa có)
-- ============================================
CREATE OR REPLACE FUNCTION set_claim_code_if_null()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.claim_code IS NULL OR NEW.claim_code = '' THEN
    NEW.claim_code := generate_claim_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_claim_code_trigger ON claims;

CREATE TRIGGER set_claim_code_trigger
  BEFORE INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION set_claim_code_if_null();

-- ============================================
-- Hoàn thành
-- ============================================
-- Bảng claims đã được tạo với đầy đủ indexes và triggers
-- Bạn có thể bắt đầu sử dụng bảng này để lưu trữ hồ sơ claim
