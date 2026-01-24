-- ============================================
-- Migration: Add promotions field to contracts table
-- ============================================
-- File này thêm trường promotions_json vào bảng contracts để lưu thông tin các chương trình khuyến mãi đã áp dụng
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Thêm cột promotions_json vào bảng contracts
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS promotions_json JSONB DEFAULT NULL;

-- Comment cho cột mới
COMMENT ON COLUMN contracts.promotions_json IS 'Danh sách các chương trình khuyến mãi đã áp dụng cho hợp đồng (JSON array)';

-- ============================================
-- Hoàn tất!
-- ============================================






