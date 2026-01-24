-- ============================================
-- GCM Manager - Chart of Accounts Table Setup SQL
-- ============================================
-- File này chứa các câu lệnh SQL để tạo bảng chart_of_accounts (Hệ thống tài khoản kế toán)
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- 1. Tạo bảng chart_of_accounts (Hệ thống tài khoản kế toán)
-- ============================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE, -- Mã tài khoản (ví dụ: "111", "131", "511")
  name TEXT NOT NULL, -- Tên tài khoản (ví dụ: "Tiền mặt", "Phải thu khách hàng", "Doanh thu bán hàng")
  parent_id UUID REFERENCES chart_of_accounts(id) ON DELETE CASCADE, -- Tài khoản cha (cho cấu trúc phân cấp)
  account_type TEXT NOT NULL CHECK (account_type IN (
    'ASSET',           -- Tài sản
    'LIABILITY',       -- Nợ phải trả
    'EQUITY',          -- Vốn chủ sở hữu
    'REVENUE',         -- Doanh thu
    'EXPENSE',         -- Chi phí
    'COST_OF_SALES'    -- Giá vốn hàng bán
  )),
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('DEBIT', 'CREDIT')), -- Số dư bình thường
  level INTEGER NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 5), -- Cấp độ (1-5)
  is_active BOOLEAN NOT NULL DEFAULT true, -- Trạng thái hoạt động
  description TEXT, -- Mô tả chi tiết
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo index cho các trường thường dùng
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_parent_id ON chart_of_accounts(parent_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_account_type ON chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_is_active ON chart_of_accounts(is_active);

-- 3. Tạo trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_chart_of_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_chart_of_accounts_updated_at_trigger ON chart_of_accounts;
CREATE TRIGGER update_chart_of_accounts_updated_at_trigger
  BEFORE UPDATE ON chart_of_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_chart_of_accounts_updated_at();

-- 4. Enable Row Level Security (RLS)
-- ============================================
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- Policy: Cho phép tất cả users đăng nhập đọc chart_of_accounts
DROP POLICY IF EXISTS "Allow authenticated users to read chart_of_accounts" ON chart_of_accounts;
CREATE POLICY "Allow authenticated users to read chart_of_accounts"
  ON chart_of_accounts FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Chỉ cho phép ACCOUNTANT và ADMIN tạo/sửa/xóa chart_of_accounts
DROP POLICY IF EXISTS "Allow accountant to manage chart_of_accounts" ON chart_of_accounts;
CREATE POLICY "Allow accountant to manage chart_of_accounts"
  ON chart_of_accounts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id::text = auth.uid()::text 
      AND users.role IN ('ACCOUNTANT', 'ADMIN', 'STRATEGIC_DIRECTOR')
    )
  );

-- 5. Insert dữ liệu mẫu - Hệ thống tài khoản theo chuẩn Việt Nam
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts LIMIT 1) THEN
    
    -- ===== TÀI SẢN (ASSET) =====
    -- 1. Tài sản ngắn hạn
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description) VALUES
      ('111', 'Tiền mặt', 'ASSET', 'DEBIT', 1, 'Tiền mặt tại quỹ'),
      ('112', 'Tiền gửi ngân hàng', 'ASSET', 'DEBIT', 1, 'Tiền gửi tại các ngân hàng'),
      ('131', 'Phải thu khách hàng', 'ASSET', 'DEBIT', 1, 'Công nợ phải thu từ khách hàng'),
      ('133', 'Thuế GTGT được khấu trừ', 'ASSET', 'DEBIT', 1, 'VAT đầu vào được khấu trừ'),
      ('152', 'Nguyên liệu, vật liệu', 'ASSET', 'DEBIT', 1, 'Hàng hóa trong kho (xe chưa bán)'),
      ('156', 'Hàng hóa', 'ASSET', 'DEBIT', 1, 'Hàng hóa trong kho'),
      ('211', 'Tài sản cố định hữu hình', 'ASSET', 'DEBIT', 1, 'Tài sản cố định');
    
    -- 2. Tài sản dài hạn
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description) VALUES
      ('241', 'Xây dựng cơ bản dở dang', 'ASSET', 'DEBIT', 1, 'Chi phí xây dựng cơ bản');
    
    -- ===== NỢ PHẢI TRẢ (LIABILITY) =====
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description) VALUES
      ('331', 'Phải trả người bán', 'LIABILITY', 'CREDIT', 1, 'Công nợ phải trả nhà cung cấp'),
      ('333', 'Thuế và các khoản phải nộp Nhà nước', 'LIABILITY', 'CREDIT', 1, 'Thuế GTGT phải nộp, thuế TNDN...'),
      ('334', 'Phải trả người lao động', 'LIABILITY', 'CREDIT', 1, 'Lương và các khoản phải trả nhân viên'),
      ('338', 'Phải trả, phải nộp khác', 'LIABILITY', 'CREDIT', 1, 'Các khoản phải trả khác'),
      ('341', 'Vay và nợ thuê tài chính', 'LIABILITY', 'CREDIT', 1, 'Vay ngân hàng, nợ thuê tài chính');
    
    -- ===== VỐN CHỦ SỞ HỮU (EQUITY) =====
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description) VALUES
      ('411', 'Vốn đầu tư của chủ sở hữu', 'EQUITY', 'CREDIT', 1, 'Vốn góp ban đầu'),
      ('421', 'Lợi nhuận chưa phân phối', 'EQUITY', 'CREDIT', 1, 'Lợi nhuận chưa phân phối');
    
    -- ===== DOANH THU (REVENUE) =====
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description) VALUES
      ('511', 'Doanh thu bán hàng', 'REVENUE', 'CREDIT', 1, 'Doanh thu bán xe'),
      ('512', 'Doanh thu bán hàng nội bộ', 'REVENUE', 'CREDIT', 1, 'Doanh thu bán nội bộ'),
      ('515', 'Doanh thu hoạt động tài chính', 'REVENUE', 'CREDIT', 1, 'Thu nhập từ hoạt động tài chính'),
      ('711', 'Thu nhập khác', 'REVENUE', 'CREDIT', 1, 'Các khoản thu nhập khác');
    
    -- ===== CHI PHÍ (EXPENSE) =====
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description) VALUES
      ('632', 'Giá vốn hàng bán', 'COST_OF_SALES', 'DEBIT', 1, 'Chi phí giá vốn xe đã bán'),
      ('641', 'Chi phí bán hàng', 'EXPENSE', 'DEBIT', 1, 'Chi phí hoa hồng, marketing, quảng cáo'),
      ('642', 'Chi phí quản lý doanh nghiệp', 'EXPENSE', 'DEBIT', 1, 'Lương quản lý, chi phí văn phòng, vận hành'),
      ('635', 'Chi phí tài chính', 'EXPENSE', 'DEBIT', 1, 'Chi phí lãi vay, chi phí tài chính khác'),
      ('811', 'Chi phí khác', 'EXPENSE', 'DEBIT', 1, 'Các khoản chi phí khác');
    
  END IF;
END $$;

-- 6. Comments và mô tả
-- ============================================
COMMENT ON TABLE chart_of_accounts IS 'Hệ thống tài khoản kế toán theo chuẩn Việt Nam';
COMMENT ON COLUMN chart_of_accounts.code IS 'Mã tài khoản (ví dụ: "111", "131", "511")';
COMMENT ON COLUMN chart_of_accounts.name IS 'Tên tài khoản';
COMMENT ON COLUMN chart_of_accounts.parent_id IS 'Tài khoản cha (cho cấu trúc phân cấp)';
COMMENT ON COLUMN chart_of_accounts.account_type IS 'Loại tài khoản: ASSET (Tài sản), LIABILITY (Nợ), EQUITY (Vốn), REVENUE (Doanh thu), EXPENSE (Chi phí), COST_OF_SALES (Giá vốn)';
COMMENT ON COLUMN chart_of_accounts.normal_balance IS 'Số dư bình thường: DEBIT (Nợ) hoặc CREDIT (Có)';
COMMENT ON COLUMN chart_of_accounts.level IS 'Cấp độ tài khoản (1-5)';

-- ============================================
-- Hoàn tất!
-- ============================================
