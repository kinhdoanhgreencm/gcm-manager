-- Migration: Tạo bảng notifications cho hệ thống thông báo
-- Mô tả: Tạo bảng lưu trữ thông báo cho người dùng trong hệ thống

-- 1. Tạo bảng notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL CHECK (type IN ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'CONTRACT', 'PAYMENT', 'DEBT', 'INVENTORY', 'SYSTEM')),
  reference_type TEXT, -- Loại tham chiếu: 'CONTRACT', 'TRANSACTION', 'DEBT', 'VEHICLE', etc.
  reference_id UUID, -- ID của đối tượng tham chiếu
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  action_url TEXT, -- URL để điều hướng khi click vào thông báo
  metadata JSONB, -- Dữ liệu bổ sung dạng JSON
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo indexes để tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_reference ON notifications(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- 3. Tạo trigger để tự động cập nhật updated_at
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

-- 4. Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. Tạo policies cho bảng notifications
-- Policy: Người dùng chỉ có thể xem thông báo của chính mình
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Người dùng có thể cập nhật thông báo của chính mình (đánh dấu đã đọc)
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Hệ thống có thể tạo thông báo cho bất kỳ người dùng nào (thông qua service role)
-- Lưu ý: Policy này sẽ được sử dụng bởi backend/service role
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true); -- Service role sẽ bypass RLS

-- Policy: Người dùng có thể xóa thông báo của chính mình
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Tạo function để tạo thông báo tự động
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'INFO',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    message,
    type,
    reference_type,
    reference_id,
    action_url,
    metadata
  ) VALUES (
    p_user_id,
    p_title,
    p_message,
    p_type,
    p_reference_type,
    p_reference_id,
    p_action_url,
    p_metadata
  ) RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Tạo function để đánh dấu thông báo đã đọc
CREATE OR REPLACE FUNCTION mark_notification_as_read(p_notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = auth.uid()
    AND is_read = FALSE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Tạo function để đánh dấu tất cả thông báo đã đọc
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE user_id = auth.uid()
    AND is_read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Comments
COMMENT ON TABLE notifications IS 'Bảng lưu trữ thông báo cho người dùng trong hệ thống';
COMMENT ON COLUMN notifications.user_id IS 'ID người dùng nhận thông báo';
COMMENT ON COLUMN notifications.title IS 'Tiêu đề thông báo';
COMMENT ON COLUMN notifications.message IS 'Nội dung chi tiết thông báo';
COMMENT ON COLUMN notifications.type IS 'Loại thông báo: INFO, SUCCESS, WARNING, ERROR, CONTRACT, PAYMENT, DEBT, INVENTORY, SYSTEM';
COMMENT ON COLUMN notifications.reference_type IS 'Loại đối tượng tham chiếu (CONTRACT, TRANSACTION, DEBT, VEHICLE, etc.)';
COMMENT ON COLUMN notifications.reference_id IS 'ID của đối tượng tham chiếu';
COMMENT ON COLUMN notifications.is_read IS 'Trạng thái đã đọc (true) hoặc chưa đọc (false)';
COMMENT ON COLUMN notifications.action_url IS 'URL để điều hướng khi click vào thông báo';
COMMENT ON COLUMN notifications.metadata IS 'Dữ liệu bổ sung dạng JSON';

-- 10. Ví dụ: Tạo trigger để tự động tạo thông báo khi có hợp đồng mới
-- (Có thể mở rộng thêm các trigger khác)
CREATE OR REPLACE FUNCTION notify_new_contract()
RETURNS TRIGGER AS $$
BEGIN
  -- Tạo thông báo cho người dùng có quyền duyệt hợp đồng
  -- Ví dụ: Tạo thông báo cho tất cả quản lý
  INSERT INTO notifications (user_id, title, message, type, reference_type, reference_id, action_url)
  SELECT 
    u.id,
    'Hợp đồng mới cần duyệt',
    'Hợp đồng ' || NEW.contract_code || ' đã được tạo và cần duyệt',
    'CONTRACT',
    'CONTRACT',
    NEW.id,
    '/contracts/' || NEW.id
  FROM users u
  WHERE u.role IN ('MANAGER', 'DIRECTOR', 'BUSINESS_DIRECTOR')
    AND u.status = 'ACTIVE';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Uncomment để kích hoạt trigger (tùy chọn)
-- DROP TRIGGER IF EXISTS trigger_notify_new_contract ON contracts;
-- CREATE TRIGGER trigger_notify_new_contract
--   AFTER INSERT ON contracts
--   FOR EACH ROW
--   EXECUTE FUNCTION notify_new_contract();
