-- ============================================
-- GCM Manager - Carriers Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng carriers (Đơn vị vận chuyển)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng carriers (Đơn vị vận chuyển)
-- ============================================
CREATE TABLE IF NOT EXISTS carriers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE, -- Mã đơn vị vận chuyển (tùy chọn)
  name TEXT NOT NULL, -- Tên đơn vị vận chuyển
  phone TEXT, -- Số điện thoại
  email TEXT, -- Email
  address TEXT, -- Địa chỉ
  contact_person TEXT, -- Người liên hệ
  tax_code TEXT, -- Mã số thuế (tùy chọn)
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  notes TEXT, -- Ghi chú
  -- Tracking
  created_by TEXT, -- ID người tạo (user ID)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo index cho các trường thường dùng để tối ưu query
-- ============================================
CREATE INDEX IF NOT EXISTS idx_carriers_code ON carriers(code);
CREATE INDEX IF NOT EXISTS idx_carriers_name ON carriers(name);
CREATE INDEX IF NOT EXISTS idx_carriers_status ON carriers(status);
CREATE INDEX IF NOT EXISTS idx_carriers_created_by ON carriers(created_by);
CREATE INDEX IF NOT EXISTS idx_carriers_created_at ON carriers(created_at DESC);

-- 3. Tạo function để tự động cập nhật updated_at khi có thay đổi
-- ============================================
-- Function này có thể đã được tạo trong database_setup.sql
-- Sử dụng CREATE OR REPLACE để đảm bảo function tồn tại
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động cập nhật updated_at
DROP TRIGGER IF EXISTS update_carriers_updated_at ON carriers;

CREATE TRIGGER update_carriers_updated_at 
  BEFORE UPDATE ON carriers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Cấu hình Row Level Security (RLS)
-- ============================================

-- Bật RLS cho bảng carriers
ALTER TABLE carriers ENABLE ROW LEVEL SECURITY;

-- Xóa các policies cũ nếu có (để tránh conflict)
DROP POLICY IF EXISTS "Public read access" ON carriers;
DROP POLICY IF EXISTS "Authenticated users can insert" ON carriers;
DROP POLICY IF EXISTS "Authenticated users can update" ON carriers;
DROP POLICY IF EXISTS "Authenticated users can delete" ON carriers;

-- Policy: Cho phép tất cả người dùng đọc dữ liệu (public read)
CREATE POLICY "Public read access" ON carriers
  FOR SELECT
  USING (true);

-- Policy: Cho phép authenticated users thêm đơn vị vận chuyển mới
CREATE POLICY "Authenticated users can insert" ON carriers
  FOR INSERT
  WITH CHECK (true);

-- Policy: Cho phép authenticated users cập nhật thông tin đơn vị vận chuyển
CREATE POLICY "Authenticated users can update" ON carriers
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép authenticated users xóa đơn vị vận chuyển (nếu cần)
CREATE POLICY "Authenticated users can delete" ON carriers
  FOR DELETE
  USING (true);

-- 5. Tạo View để thống kê đơn vị vận chuyển (tùy chọn)
-- ============================================

CREATE OR REPLACE VIEW carriers_summary AS
SELECT 
  COUNT(*) as total_carriers,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as active_count,
  COUNT(*) FILTER (WHERE status = 'INACTIVE') as inactive_count
FROM carriers;

-- 6. Tạo Function để tìm kiếm đơn vị vận chuyển
-- ============================================

CREATE OR REPLACE FUNCTION search_carriers(search_term TEXT)
RETURNS TABLE (
  id UUID,
  code TEXT,
  name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.code,
    c.name,
    c.phone,
    c.email,
    c.status
  FROM carriers c
  WHERE 
    c.name ILIKE '%' || search_term || '%'
    OR c.code ILIKE '%' || search_term || '%'
    OR c.phone ILIKE '%' || search_term || '%'
    OR c.email ILIKE '%' || search_term || '%'
    OR c.contact_person ILIKE '%' || search_term || '%'
  ORDER BY c.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- 7. Comments và mô tả các trường
-- ============================================

COMMENT ON TABLE carriers IS 'Bảng lưu trữ thông tin các đơn vị vận chuyển';
COMMENT ON COLUMN carriers.code IS 'Mã đơn vị vận chuyển (tùy chọn)';
COMMENT ON COLUMN carriers.name IS 'Tên đơn vị vận chuyển (bắt buộc)';
COMMENT ON COLUMN carriers.phone IS 'Số điện thoại liên hệ';
COMMENT ON COLUMN carriers.email IS 'Email liên hệ';
COMMENT ON COLUMN carriers.address IS 'Địa chỉ';
COMMENT ON COLUMN carriers.contact_person IS 'Tên người liên hệ';
COMMENT ON COLUMN carriers.tax_code IS 'Mã số thuế (tùy chọn)';
COMMENT ON COLUMN carriers.status IS 'Trạng thái: ACTIVE (Hoạt động), INACTIVE (Dừng hoạt động)';
COMMENT ON COLUMN carriers.notes IS 'Ghi chú';
COMMENT ON COLUMN carriers.created_by IS 'ID người tạo (user ID)';
COMMENT ON COLUMN carriers.created_at IS 'Thời gian tạo';
COMMENT ON COLUMN carriers.updated_at IS 'Thời gian cập nhật lần cuối';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, bạn cần:
-- 
-- 1. Kiểm tra RLS policies đã được áp dụng:
--    - Vào Authentication > Policies
--    - Kiểm tra các policies cho bảng carriers
--
-- 2. Test thêm đơn vị vận chuyển mới:
--    - Vào trang /carriers/new
--    - Điền thông tin form
--    - Submit và kiểm tra dữ liệu trong Supabase Dashboard
--
-- 3. Xem dữ liệu:
--    - Vào Table Editor > carriers để xem danh sách đơn vị vận chuyển
--
-- ============================================
