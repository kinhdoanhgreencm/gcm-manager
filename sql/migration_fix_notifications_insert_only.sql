-- Migration: Fix RLS cho INSERT notifications - Đơn giản nhất
-- Chỉ tập trung vào việc cho phép INSERT

-- Xóa tất cả INSERT policies cũ
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert via function" ON notifications;
DROP POLICY IF EXISTS "Allow insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all insert" ON notifications;

-- Tạo policy mới cho INSERT - Cho phép tất cả
-- Policy này sẽ cho phép INSERT từ API route
CREATE POLICY "insert_notifications_policy"
  ON notifications FOR INSERT
  TO public
  WITH CHECK (true);

-- Kiểm tra policy đã được tạo
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications' AND cmd = 'INSERT';
