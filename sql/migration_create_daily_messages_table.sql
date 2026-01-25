-- ============================================
-- Migration: Create Daily Messages Table
-- ============================================
-- Tạo bảng daily_messages để lưu trữ lời nhắc hàng ngày từ Ban Giám Đốc
-- ============================================

-- 1. Tạo bảng daily_messages
-- ============================================
CREATE TABLE IF NOT EXISTS daily_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message TEXT NOT NULL, -- Nội dung lời nhắc
  department TEXT, -- Bộ phận (Bộ phận Kinh doanh, Quản lý Kho hàng, etc.)
  created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Người tạo/cập nhật
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tạo index cho các trường thường dùng
-- ============================================
CREATE INDEX IF NOT EXISTS idx_daily_messages_department ON daily_messages(department);
CREATE INDEX IF NOT EXISTS idx_daily_messages_created_at ON daily_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_messages_updated_at ON daily_messages(updated_at DESC);

-- 3. Tạo trigger để tự động cập nhật updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_daily_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_messages_updated_at_trigger ON daily_messages;
CREATE TRIGGER update_daily_messages_updated_at_trigger
  BEFORE UPDATE ON daily_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_messages_updated_at();

-- 4. Tạo dữ liệu mặc định cho các bộ phận (chỉ insert nếu chưa có)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM daily_messages WHERE department = 'Bộ phận Kinh doanh') THEN
    INSERT INTO daily_messages (department, message, created_by)
    VALUES ('Bộ phận Kinh doanh', 'Mỗi khách hàng không chỉ là một giao dịch, mà là một cơ hội để chúng ta lan tỏa phong cách sống xanh cùng Cần Thơ GF.', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM daily_messages WHERE department = 'Quản lý Kho hàng') THEN
    INSERT INTO daily_messages (department, message, created_by)
    VALUES ('Quản lý Kho hàng', 'Sự tỉ mỉ trong kiểm kê là nền tảng của niềm tin. Một kho hàng ngăn nắp là khởi đầu của mọi sự hanh thông.', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM daily_messages WHERE department = 'Kế toán & Tài chính') THEN
    INSERT INTO daily_messages (department, message, created_by)
    VALUES ('Kế toán & Tài chính', 'Con số minh bạch, dòng tiền vững vàng. Chúng ta là người giữ lửa cho sự ổn định và phát triển của Cần Thơ GF.', NULL);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM daily_messages WHERE department = 'Chăm sóc khách hàng') THEN
    INSERT INTO daily_messages (department, message, created_by)
    VALUES ('Chăm sóc khách hàng', 'Nụ cười của khách hàng khi nhận bàn giao xe là thước đo thành công lớn nhất của toàn đội ngũ chúng ta.', NULL);
  END IF;
END $$;

-- 5. Cấu hình RLS (Row Level Security) - Cho phép tất cả user đọc
-- ============================================
-- Lưu ý: Quyền cập nhật được kiểm tra trong API route, không qua RLS
ALTER TABLE daily_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Tất cả user có thể đọc
CREATE POLICY "Users can read daily messages"
  ON daily_messages
  FOR SELECT
  USING (true);

-- Policy: Cho phép insert/update qua service role (API sẽ kiểm tra quyền)
CREATE POLICY "Service role can manage daily messages"
  ON daily_messages
  FOR ALL
  USING (true)
  WITH CHECK (true);
