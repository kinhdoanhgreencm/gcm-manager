-- ============================================
-- Migration: Đổi cột entry_date từ DATE sang TIMESTAMPTZ
-- ============================================
-- File này đổi kiểu dữ liệu của cột entry_date trong bảng vehicles
-- từ DATE (chỉ ngày) sang TIMESTAMPTZ (ngày và giờ) để lưu thông tin đầy đủ
-- về thời điểm hạch toán nhập kho
-- ============================================

-- Bước 1: Kiểm tra và chuyển đổi dữ liệu hiện có
-- Nếu entry_date đã có giá trị DATE, chuyển thành TIMESTAMPTZ với giờ mặc định là 00:00:00
DO $$
BEGIN
  -- Chuyển đổi các giá trị DATE hiện có thành TIMESTAMPTZ
  -- Nếu entry_date là DATE, PostgreSQL sẽ tự động chuyển đổi khi đổi kiểu cột
  -- Nhưng để đảm bảo, ta sẽ cập nhật các giá trị NULL hoặc set giờ mặc định
  UPDATE vehicles
  SET entry_date = entry_date::TIMESTAMPTZ
  WHERE entry_date IS NOT NULL;
  
  RAISE NOTICE 'Đã chuyển đổi dữ liệu entry_date từ DATE sang TIMESTAMPTZ';
END $$;

-- Bước 2: Đổi kiểu dữ liệu của cột entry_date từ DATE sang TIMESTAMPTZ
ALTER TABLE vehicles 
  ALTER COLUMN entry_date TYPE TIMESTAMPTZ USING entry_date::TIMESTAMPTZ;

-- Bước 3: Cập nhật comment để phản ánh thay đổi
COMMENT ON COLUMN vehicles.entry_date IS 'Ngày và giờ hạch toán nhập kho (TIMESTAMPTZ)';

-- Bước 4: Kiểm tra index (index đã tồn tại từ trước, không cần tạo lại)
-- Index idx_vehicles_entry_date vẫn hoạt động tốt với TIMESTAMPTZ

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy migration này:
-- 1. Cột entry_date sẽ lưu cả ngày và giờ (TIMESTAMPTZ)
-- 2. Các giá trị DATE cũ sẽ được chuyển thành TIMESTAMPTZ với giờ 00:00:00
-- 3. Code frontend đã sẵn sàng xử lý TIMESTAMPTZ (format "hh:mm dd/mm/yyyy")
-- ============================================
