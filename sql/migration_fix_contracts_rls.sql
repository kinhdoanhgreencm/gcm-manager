-- ============================================
-- GCM Manager - Fix Contracts RLS Policies
-- ============================================
-- File này sửa RLS policies cho bảng contracts để cho phép insert/update
-- vì app sử dụng custom authentication (không phải Supabase Auth)
-- ============================================

-- Xóa các policies cũ
DROP POLICY IF EXISTS "Allow authenticated users to read contracts" ON contracts;
DROP POLICY IF EXISTS "Allow authenticated users to insert contracts" ON contracts;
DROP POLICY IF EXISTS "Allow creator or updated_by to update contracts" ON contracts;
DROP POLICY IF EXISTS "Allow creator to delete draft or cancelled contracts" ON contracts;

DROP POLICY IF EXISTS "Allow authenticated users to read payment_schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Allow authenticated users to insert payment_schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Allow authenticated users to update payment_schedules" ON payment_schedules;
DROP POLICY IF EXISTS "Allow authenticated users to delete payment_schedules" ON payment_schedules;

-- Tạo lại policies cho bảng contracts
-- Policy: Cho phép tất cả users đọc contracts (public read)
CREATE POLICY "Public read access for contracts"
  ON contracts FOR SELECT
  USING (true);

-- Policy: Cho phép tất cả users tạo contracts (vì app dùng custom auth)
CREATE POLICY "Public insert access for contracts"
  ON contracts FOR INSERT
  WITH CHECK (true);

-- Policy: Cho phép tất cả users cập nhật contracts
CREATE POLICY "Public update access for contracts"
  ON contracts FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép tất cả users xóa contracts (chỉ khi status = DRAFT hoặc CANCELLED)
CREATE POLICY "Public delete access for draft or cancelled contracts"
  ON contracts FOR DELETE
  USING (status IN ('DRAFT', 'CANCELLED'));

-- Tạo lại policies cho bảng payment_schedules
-- Policy: Cho phép tất cả users đọc payment_schedules
CREATE POLICY "Public read access for payment_schedules"
  ON payment_schedules FOR SELECT
  USING (true);

-- Policy: Cho phép tất cả users tạo payment_schedules
CREATE POLICY "Public insert access for payment_schedules"
  ON payment_schedules FOR INSERT
  WITH CHECK (true);

-- Policy: Cho phép tất cả users cập nhật payment_schedules
CREATE POLICY "Public update access for payment_schedules"
  ON payment_schedules FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Cho phép tất cả users xóa payment_schedules
CREATE POLICY "Public delete access for payment_schedules"
  ON payment_schedules FOR DELETE
  USING (true);

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, RLS policies sẽ cho phép:
-- - Tất cả users (kể cả không đăng nhập) có thể đọc contracts
-- - Tất cả users có thể insert/update contracts
-- - Chỉ có thể xóa contracts khi status = DRAFT hoặc CANCELLED
--
-- Lưu ý: Vì app sử dụng custom authentication (localStorage),
-- nên không thể sử dụng auth.uid() trong RLS policies.
-- Bảo mật được đảm bảo ở application level.
-- ============================================

