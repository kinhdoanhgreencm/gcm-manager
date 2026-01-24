-- Migration: Fix RLS policies for notifications table
-- Vì ứng dụng sử dụng custom auth (không dùng Supabase Auth),
-- nên cần tạo function với SECURITY DEFINER để bypass RLS

-- Xóa policy cũ
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert via function" ON notifications;

-- Tạo function để insert notifications (bypass RLS)
CREATE OR REPLACE FUNCTION insert_notifications(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'INFO',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  title TEXT,
  message TEXT,
  type TEXT,
  reference_type TEXT,
  reference_id UUID,
  action_url TEXT,
  metadata JSONB,
  is_read BOOLEAN,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Tạo thông báo cho từng user
  FOREACH v_user_id IN ARRAY p_user_ids
  LOOP
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
      v_user_id,
      p_title,
      p_message,
      p_type,
      p_reference_type,
      p_reference_id,
      p_action_url,
      p_metadata
    );
  END LOOP;

  -- Trả về tất cả notifications vừa tạo
  RETURN QUERY
  SELECT n.*
  FROM notifications n
  WHERE n.user_id = ANY(p_user_ids)
    AND n.title = p_title
    AND n.created_at >= NOW() - INTERVAL '1 second'
  ORDER BY n.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tạo policy mới: Cho phép tất cả users insert (vì dùng custom auth, không có Supabase Auth)
-- Policy này sẽ cho phép insert từ API route
CREATE POLICY "Allow insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Comment
COMMENT ON FUNCTION insert_notifications IS 'Function để tạo thông báo cho nhiều users, bypass RLS';
