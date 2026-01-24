-- ============================================
-- Migration: Create Promotions Table
-- ============================================
-- Tạo bảng promotions để lưu trữ thông tin các chương trình khuyến mãi
-- ============================================

-- 1. Tạo bảng promotions
-- ============================================
CREATE TABLE IF NOT EXISTS promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- Mã khuyến mãi (VD: KM001, KM002)
  name TEXT NOT NULL, -- Tên chương trình khuyến mãi
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT', 'GIFT')), -- Loại giảm giá
  discount_value NUMERIC(15, 2) NOT NULL DEFAULT 0, -- Giá trị giảm giá (phần trăm hoặc số tiền)
  description TEXT, -- Mô tả chi tiết
  start_date DATE, -- Ngày bắt đầu áp dụng
  end_date DATE, -- Ngày kết thúc
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'EXPIRED')), -- Trạng thái
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Người tạo
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo index cho các trường thường dùng
-- ============================================
CREATE INDEX IF NOT EXISTS idx_promotions_code ON promotions(code);
CREATE INDEX IF NOT EXISTS idx_promotions_status ON promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_start_date ON promotions(start_date);
CREATE INDEX IF NOT EXISTS idx_promotions_end_date ON promotions(end_date);
CREATE INDEX IF NOT EXISTS idx_promotions_created_at ON promotions(created_at DESC);

-- 3. Tạo trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_promotions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_promotions_updated_at_trigger ON promotions;
CREATE TRIGGER update_promotions_updated_at_trigger
  BEFORE UPDATE ON promotions
  FOR EACH ROW
  EXECUTE FUNCTION update_promotions_updated_at();

-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- 5. Tạo policies cho RLS
-- ============================================
-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Allow anon read promotions" ON promotions;
DROP POLICY IF EXISTS "Allow authenticated read promotions" ON promotions;
DROP POLICY IF EXISTS "Allow anon insert promotions" ON promotions;
DROP POLICY IF EXISTS "Allow authenticated insert promotions" ON promotions;
DROP POLICY IF EXISTS "Allow anon update promotions" ON promotions;
DROP POLICY IF EXISTS "Allow authenticated update promotions" ON promotions;
DROP POLICY IF EXISTS "Allow anon delete promotions" ON promotions;
DROP POLICY IF EXISTS "Allow authenticated delete promotions" ON promotions;

-- Policy: Cho phép anon role đọc promotions (vì app sử dụng custom authentication)
CREATE POLICY "Allow anon read promotions"
  ON promotions
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Cho phép authenticated role đọc promotions
CREATE POLICY "Allow authenticated read promotions"
  ON promotions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép anon role insert promotions (vì app sử dụng custom authentication)
CREATE POLICY "Allow anon insert promotions"
  ON promotions
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Cho phép authenticated role insert promotions
CREATE POLICY "Allow authenticated insert promotions"
  ON promotions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Cho phép anon role update promotions
CREATE POLICY "Allow anon update promotions"
  ON promotions
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép authenticated role update promotions
CREATE POLICY "Allow authenticated update promotions"
  ON promotions
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép anon role delete promotions
CREATE POLICY "Allow anon delete promotions"
  ON promotions
  FOR DELETE
  TO anon
  USING (true);

-- Policy: Cho phép authenticated role delete promotions
CREATE POLICY "Allow authenticated delete promotions"
  ON promotions
  FOR DELETE
  TO authenticated
  USING (true);

-- 6. Insert dữ liệu mẫu
-- ============================================
INSERT INTO promotions (code, name, discount_type, discount_value, description, status) VALUES
  ('KM001', 'Giảm giá đầu năm - 5%', 'PERCENTAGE', 5, 'Giảm 5% cho khách hàng mua xe trong tháng đầu năm', 'ACTIVE'),
  ('KM002', 'Khuyến mãi VinFast - 10 triệu', 'FIXED_AMOUNT', 10000000, 'Giảm trực tiếp 10 triệu cho các mẫu xe VinFast', 'ACTIVE'),
  ('KM003', 'Tặng phụ kiện cao cấp', 'GIFT', 0, 'Tặng bộ phụ kiện cao cấp trị giá 5 triệu', 'ACTIVE'),
  ('KM004', 'Giảm giá đặc biệt - 7%', 'PERCENTAGE', 7, 'Giảm 7% cho khách hàng VIP', 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- 7. Comments
-- ============================================
COMMENT ON TABLE promotions IS 'Bảng lưu trữ thông tin các chương trình khuyến mãi';
COMMENT ON COLUMN promotions.code IS 'Mã khuyến mãi duy nhất (VD: KM001, KM002)';
COMMENT ON COLUMN promotions.name IS 'Tên chương trình khuyến mãi';
COMMENT ON COLUMN promotions.discount_type IS 'Loại giảm giá: PERCENTAGE (phần trăm), FIXED_AMOUNT (số tiền cố định), GIFT (tặng quà)';
COMMENT ON COLUMN promotions.discount_value IS 'Giá trị giảm giá (phần trăm hoặc số tiền VND)';
COMMENT ON COLUMN promotions.start_date IS 'Ngày bắt đầu áp dụng khuyến mãi';
COMMENT ON COLUMN promotions.end_date IS 'Ngày kết thúc khuyến mãi';
COMMENT ON COLUMN promotions.status IS 'Trạng thái: ACTIVE (đang áp dụng), INACTIVE (tạm ngưng), EXPIRED (hết hạn)';

