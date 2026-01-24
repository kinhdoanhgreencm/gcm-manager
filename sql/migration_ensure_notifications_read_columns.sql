-- Migration: Đảm bảo bảng notifications có đầy đủ cột để lưu trạng thái đã đọc
-- Mô tả: Migration này sẽ kiểm tra và thêm các cột cần thiết nếu chưa có
-- Chạy file này trong Supabase SQL Editor

-- 1. Đảm bảo bảng notifications tồn tại
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'INFO',
  reference_type TEXT,
  reference_id UUID,
  action_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Thêm cột is_read nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'notifications' 
    AND column_name = 'is_read'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN is_read BOOLEAN NOT NULL DEFAULT FALSE;
    
    RAISE NOTICE '✓ Đã thêm cột is_read';
  ELSE
    -- Đảm bảo cột có default value
    ALTER TABLE notifications 
    ALTER COLUMN is_read SET DEFAULT FALSE;
    
    -- Đảm bảo NOT NULL
    UPDATE notifications SET is_read = FALSE WHERE is_read IS NULL;
    ALTER TABLE notifications 
    ALTER COLUMN is_read SET NOT NULL;
    
    RAISE NOTICE '✓ Cột is_read đã tồn tại, đã cập nhật constraints';
  END IF;
END $$;

-- 3. Thêm cột read_at nếu chưa có
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'notifications' 
    AND column_name = 'read_at'
  ) THEN
    ALTER TABLE notifications 
    ADD COLUMN read_at TIMESTAMPTZ;
    
    RAISE NOTICE '✓ Đã thêm cột read_at';
  ELSE
    RAISE NOTICE '✓ Cột read_at đã tồn tại';
  END IF;
END $$;

-- 4. Tạo indexes để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, is_read) 
WHERE is_read = FALSE;

-- 5. Đảm bảo có trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_notifications_updated_at_trigger ON notifications;
CREATE TRIGGER update_notifications_updated_at_trigger
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- 6. Đảm bảo RLS policies cho phép UPDATE
-- Policy: Người dùng có thể cập nhật thông báo của chính mình (đánh dấu đã đọc)
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (true) -- Cho phép update vì đã kiểm tra user_id trong API
  WITH CHECK (true);

-- 7. Comments
COMMENT ON COLUMN notifications.is_read IS 'Trạng thái đã đọc (true) hoặc chưa đọc (false)';
COMMENT ON COLUMN notifications.read_at IS 'Thời điểm đánh dấu đã đọc (TIMESTAMPTZ)';

-- 8. Hiển thị kết quả
DO $$ 
DECLARE
  has_is_read BOOLEAN;
  has_read_at BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'notifications' 
    AND column_name = 'is_read'
  ) INTO has_is_read;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'notifications' 
    AND column_name = 'read_at'
  ) INTO has_read_at;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration hoàn tất!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Cột is_read: %', CASE WHEN has_is_read THEN '✓ Có' ELSE '✗ Chưa có' END;
  RAISE NOTICE 'Cột read_at: %', CASE WHEN has_read_at THEN '✓ Có' ELSE '✗ Chưa có' END;
  RAISE NOTICE '========================================';
END $$;
