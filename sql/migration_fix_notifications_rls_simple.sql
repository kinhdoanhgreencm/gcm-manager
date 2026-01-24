-- Migration: Fix RLS policies for notifications table (Simple version)
-- Cho phép insert notifications từ API route

-- Xóa tất cả policies cũ
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert via function" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;

-- Tạo policy đơn giản: Cho phép tất cả insert (vì dùng custom auth)
CREATE POLICY "Allow all insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Nếu vẫn không hoạt động, có thể tạm thời tắt RLS cho INSERT:
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
-- Nhưng không khuyến khích vì mất bảo mật
