-- ============================================
-- GCM Manager - Upgrade Vehicle Code Format
-- ============================================
-- File này nâng cấp format mã xe từ GCM-XXX (3 chữ số) 
-- thành CTGF-XXXX (4 chữ số) để hỗ trợ nhiều hơn 999 xe
-- Chỉ sử dụng format CTGF-XXXX, không hỗ trợ format cũ GCM-XXX
-- ============================================

-- 1. Chuyển đổi các mã cũ GCM-XXX sang format mới CTGF-XXXX
-- ============================================
DO $$
DECLARE
  v_record RECORD;
  old_number INTEGER;
  new_code TEXT;
BEGIN
  -- Chuyển đổi tất cả mã GCM-XXX sang CTGF-XXXX
  FOR v_record IN 
    SELECT id, code FROM vehicles 
    WHERE code ~ '^GCM-[0-9]+$'
    ORDER BY CAST(SUBSTRING(code FROM 5) AS INTEGER) ASC
  LOOP
    -- Lấy số từ mã cũ
    old_number := CAST(SUBSTRING(v_record.code FROM 5) AS INTEGER);
    -- Tạo mã mới với format CTGF-XXXX
    new_code := 'CTGF-' || LPAD(old_number::TEXT, 4, '0');
    
    -- Đảm bảo mã mới là duy nhất
    WHILE EXISTS (SELECT 1 FROM vehicles WHERE code = new_code AND id != v_record.id) LOOP
      old_number := old_number + 1;
      new_code := 'CTGF-' || LPAD(old_number::TEXT, 4, '0');
    END LOOP;
    
    -- Cập nhật mã
    UPDATE vehicles SET code = new_code WHERE id = v_record.id;
  END LOOP;
END $$;

-- 2. Cập nhật function generate_vehicle_code() để chỉ dùng format CTGF-XXXX
-- ============================================
CREATE OR REPLACE FUNCTION generate_vehicle_code()
RETURNS TRIGGER AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Chỉ generate code nếu chưa có code
  IF NEW.code IS NULL OR NEW.code = '' THEN
    -- Lấy số thứ tự tiếp theo từ các xe đã có (chỉ format CTGF-XXXX)
    SELECT COALESCE(MAX(
      CASE 
        WHEN code ~ '^CTGF-[0-9]+$' THEN 
          CAST(SUBSTRING(code FROM 6) AS INTEGER)
        ELSE 0
      END
    ), 0) + 1
    INTO next_number
    FROM vehicles
    WHERE code ~ '^CTGF-[0-9]+$';
    
    -- Format mã: CTGF-0001, CTGF-0002, ... CTGF-9999
    new_code := 'CTGF-' || LPAD(next_number::TEXT, 4, '0');
    
    -- Đảm bảo mã là duy nhất (nếu trùng thì tăng số lên)
    WHILE EXISTS (SELECT 1 FROM vehicles WHERE code = new_code) LOOP
      next_number := next_number + 1;
      new_code := 'CTGF-' || LPAD(next_number::TEXT, 4, '0');
    END LOOP;
    
    NEW.code := new_code;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Cập nhật trigger (đảm bảo trigger đã được tạo)
-- ============================================
DROP TRIGGER IF EXISTS generate_vehicle_code_trigger ON vehicles;

CREATE TRIGGER generate_vehicle_code_trigger
  BEFORE INSERT ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION generate_vehicle_code();

-- 4. Generate code mới cho các xe chưa có code (chỉ format CTGF-XXXX)
-- ============================================
DO $$
DECLARE
  v_record RECORD;
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- Lấy số thứ tự hiện tại từ các xe đã có code (chỉ format CTGF-XXXX)
  SELECT COALESCE(MAX(
    CASE 
      WHEN code ~ '^CTGF-[0-9]+$' THEN 
        CAST(SUBSTRING(code FROM 6) AS INTEGER)
      ELSE 0
    END
  ), 0) INTO next_number
  FROM vehicles
  WHERE code IS NOT NULL 
    AND code != '' 
    AND code ~ '^CTGF-[0-9]+$';
  
  -- Generate code mới (format CTGF-XXXX) cho các xe chưa có code
  FOR v_record IN 
    SELECT id FROM vehicles 
    WHERE code IS NULL OR code = ''
    ORDER BY created_at ASC
  LOOP
    next_number := next_number + 1;
    new_code := 'CTGF-' || LPAD(next_number::TEXT, 4, '0');
    
    -- Đảm bảo mã là duy nhất
    WHILE EXISTS (SELECT 1 FROM vehicles WHERE code = new_code) LOOP
      next_number := next_number + 1;
      new_code := 'CTGF-' || LPAD(next_number::TEXT, 4, '0');
    END LOOP;
    
    UPDATE vehicles SET code = new_code WHERE id = v_record.id;
  END LOOP;
END $$;

-- 5. Cập nhật comment cho cột code
-- ============================================
COMMENT ON COLUMN vehicles.code IS 'Mã xe tự động theo format CTGF-XXXX (VD: CTGF-0001, CTGF-0002...) - Tự động generate khi insert nếu không được nhập thủ công. Hỗ trợ tối đa 9999 xe. Chỉ sử dụng format CTGF-XXXX.';

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- - Tất cả mã xe cũ (GCM-XXX) sẽ được chuyển đổi sang format mới (CTGF-XXXX)
-- - Format mã xe chỉ còn CTGF-XXXX (4 chữ số)
-- - Hỗ trợ tối đa 9999 xe (thay vì 999 xe)
-- - Các xe mới sẽ tự động được tạo mã theo format CTGF-XXXX
-- - Người dùng có thể nhập mã thủ công trong form (chỉ format CTGF-XXXX), nếu để trống sẽ tự động generate
-- ============================================
