-- ============================================
-- GCM Manager - Add trigger to auto-update updated_by column
-- ============================================
-- File này thêm trigger để tự động cập nhật updated_by khi có thay đổi thông tin xe
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Đảm bảo cột updated_by tồn tại
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Tạo function để tự động cập nhật updated_by từ session user
-- Lưu ý: Function này sẽ lấy user_id từ JWT token trong session
CREATE OR REPLACE FUNCTION update_vehicle_updated_by()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Lấy user_id từ JWT token (nếu có)
  -- Trong Supabase, có thể sử dụng auth.uid() để lấy user ID từ session
  -- Tuy nhiên, vì đây là server-side, ta sẽ để NULL nếu không có session
  -- Application code sẽ tự set updated_by khi update
  
  -- Chỉ cập nhật updated_at, updated_by sẽ được set từ application code
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để tự động cập nhật updated_at (nếu chưa có)
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_updated_by();

-- Thêm comment
COMMENT ON COLUMN vehicles.updated_by IS 'ID của người cập nhật thông tin xe lần cuối (tham chiếu đến bảng users). Được set tự động từ application code khi có thay đổi.';

