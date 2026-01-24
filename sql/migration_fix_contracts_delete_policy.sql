-- ============================================
-- GCM Manager - Fix Contracts Delete Policy
-- ============================================
-- File này sửa RLS policy cho phép xóa hợp đồng trong mọi trạng thái
-- Logic kiểm tra giao dịch thu chi được xử lý ở application level
-- ============================================

-- Xóa policy cũ chỉ cho phép xóa DRAFT hoặc CANCELLED
DROP POLICY IF EXISTS "Public delete access for draft or cancelled contracts" ON contracts;

-- Tạo policy mới cho phép xóa hợp đồng trong mọi trạng thái
-- (Logic kiểm tra transaction được xử lý ở application level)
CREATE POLICY "Public delete access for all contracts"
  ON contracts FOR DELETE
  USING (true);

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này, RLS policy sẽ cho phép:
-- - Xóa hợp đồng trong mọi trạng thái
-- - Logic kiểm tra giao dịch thu chi được xử lý ở application level
-- ============================================
