-- Migration: Thêm cột is_read và read_at vào bảng notifications
-- Mô tả: Thêm các cột cần thiết để lưu trạng thái đã đọc của thông báo
-- Chạy file này trong Supabase SQL Editor nếu bảng notifications chưa có các cột này

-- 1. Thêm cột is_read nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'is_read'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    
    -- Cập nhật tất cả thông báo hiện có là chưa đọc
    UPDATE notifications SET is_read = FALSE WHERE is_read IS NULL;
    
    RAISE NOTICE 'Đã thêm cột is_read';
  ELSE
    RAISE NOTICE 'Cột is_read đã tồn tại';
  END IF;
END $$;

-- 2. Thêm cột read_at nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN read_at TIMESTAMPTZ;
    
    RAISE NOTICE 'Đã thêm cột read_at';
  ELSE
    RAISE NOTICE 'Cột read_at đã tồn tại';
  END IF;
END $$;

-- 3. Tạo index cho is_read nếu chưa có (để tối ưu truy vấn)
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- 4. Tạo index kết hợp user_id và is_read để tối ưu truy vấn thông báo chưa đọc
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = FALSE;

-- 5. Đảm bảo có constraint NOT NULL cho is_read (nếu cần)
DO $$ 
BEGIN
  -- Kiểm tra xem cột is_read có cho phép NULL không
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'notifications' 
    AND column_name = 'is_read'
    AND is_nullable = 'YES'
  ) THEN
    -- Cập nhật tất cả giá trị NULL thành FALSE
    UPDATE notifications SET is_read = FALSE WHERE is_read IS NULL;
    
    -- Thêm NOT NULL constraint
    ALTER TABLE notifications 
    ALTER COLUMN is_read SET NOT NULL;
    
    -- Đặt default value
    ALTER TABLE notifications 
    ALTER COLUMN is_read SET DEFAULT FALSE;
    
    RAISE NOTICE 'Đã thêm NOT NULL constraint cho is_read';
  ELSE
    RAISE NOTICE 'Cột is_read đã có NOT NULL constraint';
  END IF;
END $$;

-- 6. Comments
COMMENT ON COLUMN notifications.is_read IS 'Trạng thái đã đọc (true) hoặc chưa đọc (false)';
COMMENT ON COLUMN notifications.read_at IS 'Thời điểm đánh dấu đã đọc';

-- 7. Kiểm tra kết quả
DO $$ 
BEGIN
  RAISE NOTICE 'Migration hoàn tất!';
  RAISE NOTICE 'Các cột đã được thêm vào bảng notifications:';
  RAISE NOTICE '- is_read: BOOLEAN DEFAULT FALSE';
  RAISE NOTICE '- read_at: TIMESTAMPTZ';
END $$;
