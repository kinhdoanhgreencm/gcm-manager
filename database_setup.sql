-- ============================================
-- GCM Manager - Database Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để thiết lập database cho hệ thống quản lý kho xe
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng vehicles (Kho xe)
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE, -- Mã xe theo format GCM-XXX
  vin TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL DEFAULT 'VinFast',
  model TEXT,
  version TEXT,
  year INTEGER NOT NULL,
  color TEXT,
  type TEXT NOT NULL CHECK (type IN ('NEW', 'USED', 'EV')),
  mileage INTEGER,
  battery_health INTEGER,
  cost NUMERIC(15, 2) NOT NULL DEFAULT 0,
  price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'REGISTRATION', 'DELIVERED')),
  supplier_id TEXT,
  entry_date DATE,
  notes TEXT,
  images TEXT[], -- Array of image URLs from Supabase Storage
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Người nhập kho
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.1. Thêm cột code nếu bảng đã tồn tại (Migration)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS code TEXT;

-- 1.2. Thêm cột created_by nếu bảng đã tồn tại (Migration)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Tạo index cho các trường thường dùng để tối ưu query
CREATE INDEX IF NOT EXISTS idx_vehicles_code ON vehicles(code);
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_supplier_id ON vehicles(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_entry_date ON vehicles(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_by ON vehicles(created_by);

-- Tạo function để tự động generate mã xe theo format GCM-XXX
CREATE OR REPLACE FUNCTION generate_vehicle_code()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Chỉ generate code nếu chưa có code
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Lấy số thứ tự tiếp theo từ các xe đã có
    SELECT COALESCE(MAX(
      CASE 
        WHEN code ~ '^GCM-[0-9]+$' THEN 
          CAST(SUBSTRING(code FROM 5) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM vehicles;
    
    -- Format mã: GCM-001, GCM-002, ... GCM-999
    new_code := 'GCM-' || LPAD(next_number::TEXT, 3, '0');
    
    -- Đảm bảo mã là duy nhất (nếu trùng thì tăng số lên)
    WHILE EXISTS (SELECT 1 FROM vehicles WHERE code = new_code) LOOP
      next_number := next_number + 1;
      new_code := 'GCM-' || LPAD(next_number::TEXT, 3, '0');
    END LOOP;
    
    NEW.code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động generate code khi insert xe mới (xóa trigger cũ nếu có)
DROP TRIGGER IF EXISTS generate_vehicle_code_trigger ON vehicles;

CREATE TRIGGER generate_vehicle_code_trigger
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION generate_vehicle_code();

-- Generate code cho các xe đã có sẵn nhưng chưa có code
DO $$
DECLARE
  v_record RECORD;
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Lấy số thứ tự hiện tại từ các xe đã có code
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^GCM-[0-9]+$' THEN 
        CAST(SUBSTRING(code FROM 5) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO next_number
  FROM vehicles
  WHERE code IS NOT NULL AND code != '' AND code ~ '^GCM-[0-9]+$';
  
  -- Generate code cho các xe chưa có code
  FOR v_record IN 
    SELECT id FROM vehicles 
    WHERE code IS NULL OR code = ''
    ORDER BY created_at ASC
  LOOP
    next_number := next_number + 1;
    new_code := 'GCM-' || LPAD(next_number::TEXT, 3, '0');
    
    -- Đảm bảo mã là duy nhất
    WHILE EXISTS (SELECT 1 FROM vehicles WHERE code = new_code) LOOP
      next_number := next_number + 1;
      new_code := 'GCM-' || LPAD(next_number::TEXT, 3, '0');
    END LOOP;
    
    UPDATE vehicles SET code = new_code WHERE id = v_record.id;
  END LOOP;
END $$;

-- Thêm constraint UNIQUE cho cột code (sau khi đã generate code)
DO $$
BEGIN
  -- Xóa constraint cũ nếu có
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'vehicles_code_key'
  ) THEN
    ALTER TABLE vehicles DROP CONSTRAINT vehicles_code_key;
  END IF;
  
  -- Thêm constraint UNIQUE cho cột code
  ALTER TABLE vehicles ADD CONSTRAINT vehicles_code_key UNIQUE (code);
EXCEPTION
  WHEN OTHERS THEN
    -- Nếu có lỗi (ví dụ: có duplicate), bỏ qua
    RAISE NOTICE 'Could not add unique constraint: %', SQLERRM;
END $$;

-- Tạo trigger để tự động cập nhật updated_at khi có thay đổi
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Xóa trigger cũ nếu có, sau đó tạo mới
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;

CREATE TRIGGER update_vehicles_updated_at 
  BEFORE UPDATE ON vehicles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. Cấu hình Row Level Security (RLS)
-- ============================================

-- Bật RLS cho bảng vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Xóa các policies cũ nếu có (để tránh conflict)
DROP POLICY IF EXISTS "Public read access" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can insert" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can update" ON vehicles;
DROP POLICY IF EXISTS "Authenticated users can delete" ON vehicles;

-- Policy: Cho phép tất cả người dùng đọc dữ liệu (public read)
CREATE POLICY "Public read access" ON vehicles
  FOR SELECT
  USING (true);

-- Policy: Cho phép authenticated users thêm xe mới
CREATE POLICY "Authenticated users can insert" ON vehicles
  FOR INSERT
  WITH CHECK (true);

-- Policy: Cho phép authenticated users cập nhật thông tin xe
CREATE POLICY "Authenticated users can update" ON vehicles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép authenticated users xóa xe (nếu cần)
CREATE POLICY "Authenticated users can delete" ON vehicles
  FOR DELETE
  USING (true);

-- ============================================
-- 3. Tạo Storage Bucket Policies cho ảnh xe
-- ============================================
-- Lưu ý: Bạn cần tạo bucket "ERP" trong Supabase Dashboard > Storage trước
-- Sau đó chạy các policy dưới đây

-- Xóa các storage policies cũ nếu có (để tránh conflict)
DROP POLICY IF EXISTS "Public Access - ERP bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload - ERP bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update - ERP bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete - ERP bucket" ON storage.objects;

-- Policy: Cho phép public đọc ảnh
CREATE POLICY "Public Access - ERP bucket" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'ERP');

-- Policy: Cho phép authenticated users upload ảnh
CREATE POLICY "Authenticated users can upload - ERP bucket" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'ERP');

-- Policy: Cho phép authenticated users cập nhật ảnh
CREATE POLICY "Authenticated users can update - ERP bucket" ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'ERP')
  WITH CHECK (bucket_id = 'ERP');

-- Policy: Cho phép authenticated users xóa ảnh
CREATE POLICY "Authenticated users can delete - ERP bucket" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'ERP');

-- ============================================
-- 4. Tạo View để thống kê kho xe (tùy chọn)
-- ============================================

CREATE OR REPLACE VIEW vehicles_summary AS
SELECT 
  COUNT(*) as total_vehicles,
  COUNT(*) FILTER (WHERE status = 'AVAILABLE') as available_count,
  COUNT(*) FILTER (WHERE status = 'RESERVED') as reserved_count,
  COUNT(*) FILTER (WHERE status = 'SOLD') as sold_count,
  COUNT(*) FILTER (WHERE status = 'REGISTRATION') as registration_count,
  SUM(cost) as total_inventory_value,
  SUM(price) as total_listed_value,
  SUM(price - cost) as total_profit_potential
FROM vehicles;

-- ============================================
-- 5. Tạo Function để tìm kiếm xe (tùy chọn)
-- ============================================

CREATE OR REPLACE FUNCTION search_vehicles(search_term TEXT)
RETURNS TABLE (
  id UUID,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  status TEXT,
  price NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.vin,
    v.make,
    v.model,
    v.year,
    v.status,
    v.price
  FROM vehicles v
  WHERE 
    v.vin ILIKE '%' || search_term || '%'
    OR v.model ILIKE '%' || search_term || '%'
    OR v.make ILIKE '%' || search_term || '%'
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 6. Comments và mô tả các trường
-- ============================================

COMMENT ON TABLE vehicles IS 'Bảng lưu trữ thông tin các xe trong kho';
COMMENT ON COLUMN vehicles.code IS 'Mã xe tự động theo format GCM-XXX (VD: GCM-001, GCM-002...) - Tự động generate khi insert';
COMMENT ON COLUMN vehicles.vin IS 'Số VIN (Vehicle Identification Number) - Số khung xe, phải là duy nhất';
COMMENT ON COLUMN vehicles.make IS 'Hãng sản xuất xe, mặc định là VinFast';
COMMENT ON COLUMN vehicles.model IS 'Model xe (VD: VF 7, VF 8, VF e34...)';
COMMENT ON COLUMN vehicles.version IS 'Phiên bản xe (VD: Eco, Plus, Luxury...)';
COMMENT ON COLUMN vehicles.type IS 'Loại xe: NEW (Xe mới), USED (Xe cũ), EV (Xe điện)';
COMMENT ON COLUMN vehicles.status IS 'Trạng thái: AVAILABLE (Sẵn sàng), RESERVED (Đã cọc), SOLD (Đã bán), REGISTRATION (Đang làm hồ sơ), DELIVERED (Đã giao)';
COMMENT ON COLUMN vehicles.mileage IS 'Số km đã đi (chỉ áp dụng cho xe cũ)';
COMMENT ON COLUMN vehicles.battery_health IS 'Sức khỏe pin (Battery SOH %) - chỉ áp dụng cho xe điện';
COMMENT ON COLUMN vehicles.cost IS 'Giá vốn nhập kho (VNĐ)';
COMMENT ON COLUMN vehicles.price IS 'Giá niêm yết bán ra (VNĐ)';
COMMENT ON COLUMN vehicles.supplier_id IS 'ID của nhà cung cấp/nguồn nhập xe';
COMMENT ON COLUMN vehicles.entry_date IS 'Ngày hạch toán nhập kho';
COMMENT ON COLUMN vehicles.images IS 'Mảng các URL ảnh từ Supabase Storage bucket ERP';
COMMENT ON COLUMN vehicles.notes IS 'Ghi chú thêm về xe';
COMMENT ON COLUMN vehicles.created_by IS 'ID của người nhập kho (tham chiếu đến bảng users)';

-- ============================================
-- 7. Dữ liệu mẫu để test (tùy chọn - uncomment để sử dụng)
-- ============================================

/*
-- Thêm dữ liệu mẫu
INSERT INTO vehicles (
  vin, make, model, version, year, color, type, 
  mileage, battery_health, cost, price, status, 
  entry_date, images
) VALUES 
  (
    'VNF7PLUS123456', 
    'VinFast', 
    'VF 7 Plus', 
    'Plus', 
    2024, 
    'Deep Ocean', 
    'EV', 
    NULL, 
    100, 
    950000000, 
    1099000000, 
    'AVAILABLE', 
    CURRENT_DATE,
    ARRAY[]::TEXT[]
  ),
  (
    'VNF8LUX987654', 
    'VinFast', 
    'VF 8 Luxury', 
    'Luxury', 
    2023, 
    'Crimson Red', 
    'EV', 
    NULL, 
    98, 
    1100000000, 
    1250000000, 
    'AVAILABLE', 
    CURRENT_DATE,
    ARRAY[]::TEXT[]
  ),
  (
    'VNFE34XYZ456', 
    'VinFast', 
    'VF e34', 
    NULL, 
    2022, 
    'Brahminy White', 
    'EV', 
    15000, 
    92, 
    620000000, 
    710000000, 
    'AVAILABLE', 
    CURRENT_DATE,
    ARRAY[]::TEXT[]
  );
*/

-- ============================================
-- 8. Kiểm tra cấu trúc bảng sau khi tạo
-- ============================================

-- Chạy câu lệnh này để xem cấu trúc bảng:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'vehicles'
-- ORDER BY ordinal_position;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, bạn cần:
-- 
-- 1. Tạo bucket "ERP" trong Supabase Dashboard > Storage
--    - Vào Storage > New bucket
--    - Tên: ERP
--    - Public bucket: Bật (để có thể truy cập ảnh qua URL)
--    - File size limit: 10MB (hoặc tùy chỉnh)
--    - Allowed MIME types: image/*
--
-- 2. Kiểm tra RLS policies đã được áp dụng:
--    - Vào Authentication > Policies
--    - Kiểm tra các policies cho bảng vehicles
--
-- 3. Test thêm xe mới:
--    - Vào trang /inventory/new
--    - Điền thông tin và upload ảnh
--    - Submit và kiểm tra dữ liệu trong Supabase Dashboard
--
-- 4. Xem dữ liệu:
--    - Vào Table Editor > vehicles để xem danh sách xe
--    - Vào Storage > ERP để xem các ảnh đã upload
--
-- ============================================

