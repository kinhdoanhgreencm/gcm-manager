-- ============================================
-- Migration: Fix Accounts RLS Policy
-- ============================================
-- File này sửa RLS policy cho bảng accounts để cho phép đọc dữ liệu
-- khi sử dụng custom authentication (không dùng Supabase Auth)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Xóa policy cũ yêu cầu authenticated role
DROP POLICY IF EXISTS "Allow authenticated users to read accounts" ON accounts;
DROP POLICY IF EXISTS "Allow authenticated users to insert accounts" ON accounts;
DROP POLICY IF EXISTS "Allow authenticated users to update accounts" ON accounts;

-- Policy: Cho phép anon role (unauthenticated requests) đọc accounts
-- Vì app sử dụng custom authentication nên Supabase client không được authenticate
CREATE POLICY "Allow anon read access to accounts"
  ON accounts FOR SELECT
  TO anon
  USING (true);

-- Policy: Cho phép authenticated role (nếu có) đọc accounts
CREATE POLICY "Allow authenticated read access to accounts"
  ON accounts FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Cho phép authenticated users (qua Supabase Auth) tạo accounts
-- Nếu bạn muốn giới hạn, có thể thay đổi TO public thành TO authenticated
CREATE POLICY "Allow authenticated users to insert accounts"
  ON accounts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Nếu bạn cần cho phép insert từ anon role (khi dùng custom auth):
-- Uncomment dòng dưới và comment dòng trên
-- CREATE POLICY "Allow public insert to accounts"
--   ON accounts FOR INSERT
--   TO public
--   WITH CHECK (true);

-- Policy: Cho phép authenticated users cập nhật accounts
CREATE POLICY "Allow authenticated users to update accounts"
  ON accounts FOR UPDATE
  TO authenticated
  USING (true);

-- Nếu bạn cần cho phép update từ anon role (khi dùng custom auth):
-- Uncomment dòng dưới và comment dòng trên
-- CREATE POLICY "Allow public update to accounts"
--   ON accounts FOR UPDATE
--   TO public
--   USING (true)
--   WITH CHECK (true);

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy script này:
-- 1. Bảng accounts sẽ cho phép đọc dữ liệu mà không cần Supabase authentication
-- 2. Các tài khoản ngân hàng sẽ hiển thị trong trang Finance
-- 3. Nếu vẫn không hiển thị, kiểm tra:
--    - Migration script migration_add_company_bank_accounts.sql đã được chạy chưa
--    - Kiểm tra dữ liệu trong bảng accounts bằng: SELECT * FROM accounts;
-- ============================================

