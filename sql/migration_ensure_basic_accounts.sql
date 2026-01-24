-- ============================================
-- Migration: Đảm bảo các tài khoản cơ bản tồn tại và active
-- ============================================
-- File này đảm bảo các tài khoản kế toán cơ bản (111, 112, 131, 511, 641, 642, 152) 
-- tồn tại và đang active để đồng bộ từ Thu chi sang Kế toán hoạt động đúng
-- Chạy file này trong SQL Editor của Supabase Dashboard
-- ============================================

-- Đảm bảo tài khoản 111 - Tiền mặt tồn tại và active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '111') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description, is_active)
    VALUES ('111', 'Tiền mặt', 'ASSET', 'DEBIT', 1, 'Tiền mặt tại quỹ', true);
    RAISE NOTICE 'Đã tạo tài khoản 111 - Tiền mặt';
  ELSE
    -- Đảm bảo tài khoản đang active
    UPDATE chart_of_accounts 
    SET is_active = true 
    WHERE code = '111' AND is_active = false;
    RAISE NOTICE 'Đã đảm bảo tài khoản 111 - Tiền mặt đang active';
  END IF;
END $$;

-- Đảm bảo tài khoản 112 - Tiền gửi ngân hàng tồn tại và active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '112') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description, is_active)
    VALUES ('112', 'Tiền gửi ngân hàng', 'ASSET', 'DEBIT', 1, 'Tiền gửi tại các ngân hàng', true);
    RAISE NOTICE 'Đã tạo tài khoản 112 - Tiền gửi ngân hàng';
  ELSE
    -- Đảm bảo tài khoản đang active
    UPDATE chart_of_accounts 
    SET is_active = true 
    WHERE code = '112' AND is_active = false;
    RAISE NOTICE 'Đã đảm bảo tài khoản 112 - Tiền gửi ngân hàng đang active';
  END IF;
END $$;

-- Đảm bảo tài khoản 131 - Phải thu khách hàng tồn tại và active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '131') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description, is_active)
    VALUES ('131', 'Phải thu khách hàng', 'ASSET', 'DEBIT', 1, 'Công nợ phải thu từ khách hàng', true);
    RAISE NOTICE 'Đã tạo tài khoản 131 - Phải thu khách hàng';
  ELSE
    UPDATE chart_of_accounts 
    SET is_active = true 
    WHERE code = '131' AND is_active = false;
    RAISE NOTICE 'Đã đảm bảo tài khoản 131 - Phải thu khách hàng đang active';
  END IF;
END $$;

-- Đảm bảo tài khoản 152 - Hàng hóa tồn tại và active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '152') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description, is_active)
    VALUES ('152', 'Hàng hóa', 'ASSET', 'DEBIT', 1, 'Hàng hóa trong kho (xe chưa bán)', true);
    RAISE NOTICE 'Đã tạo tài khoản 152 - Hàng hóa';
  ELSE
    UPDATE chart_of_accounts 
    SET is_active = true 
    WHERE code = '152' AND is_active = false;
    RAISE NOTICE 'Đã đảm bảo tài khoản 152 - Hàng hóa đang active';
  END IF;
END $$;

-- Đảm bảo tài khoản 511 - Doanh thu bán hàng tồn tại và active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '511') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description, is_active)
    VALUES ('511', 'Doanh thu bán hàng', 'REVENUE', 'CREDIT', 1, 'Doanh thu bán xe', true);
    RAISE NOTICE 'Đã tạo tài khoản 511 - Doanh thu bán hàng';
  ELSE
    UPDATE chart_of_accounts 
    SET is_active = true 
    WHERE code = '511' AND is_active = false;
    RAISE NOTICE 'Đã đảm bảo tài khoản 511 - Doanh thu bán hàng đang active';
  END IF;
END $$;

-- Đảm bảo tài khoản 641 - Chi phí bán hàng tồn tại và active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '641') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description, is_active)
    VALUES ('641', 'Chi phí bán hàng', 'EXPENSE', 'DEBIT', 1, 'Chi phí hoa hồng, marketing, quảng cáo', true);
    RAISE NOTICE 'Đã tạo tài khoản 641 - Chi phí bán hàng';
  ELSE
    UPDATE chart_of_accounts 
    SET is_active = true 
    WHERE code = '641' AND is_active = false;
    RAISE NOTICE 'Đã đảm bảo tài khoản 641 - Chi phí bán hàng đang active';
  END IF;
END $$;

-- Đảm bảo tài khoản 642 - Chi phí quản lý doanh nghiệp tồn tại và active
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM chart_of_accounts WHERE code = '642') THEN
    INSERT INTO chart_of_accounts (code, name, account_type, normal_balance, level, description, is_active)
    VALUES ('642', 'Chi phí quản lý doanh nghiệp', 'EXPENSE', 'DEBIT', 1, 'Lương quản lý, chi phí văn phòng, vận hành', true);
    RAISE NOTICE 'Đã tạo tài khoản 642 - Chi phí quản lý doanh nghiệp';
  ELSE
    UPDATE chart_of_accounts 
    SET is_active = true 
    WHERE code = '642' AND is_active = false;
    RAISE NOTICE 'Đã đảm bảo tài khoản 642 - Chi phí quản lý doanh nghiệp đang active';
  END IF;
END $$;

-- Hiển thị kết quả
SELECT 
  code,
  name,
  account_type,
  is_active,
  CASE 
    WHEN is_active THEN '✓ Active'
    ELSE '✗ Inactive'
  END as status
FROM chart_of_accounts
WHERE code IN ('111', '112', '131', '152', '511', '641', '642')
ORDER BY code;

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy script này, tất cả các tài khoản cơ bản đã được đảm bảo:
-- - 111: Tiền mặt
-- - 112: Tiền gửi ngân hàng
-- - 131: Phải thu khách hàng
-- - 152: Hàng hóa
-- - 511: Doanh thu bán hàng
-- - 641: Chi phí bán hàng
-- - 642: Chi phí quản lý doanh nghiệp
--
-- Bây giờ bạn có thể thử đồng bộ lại từ Thu chi sang Kế toán.
-- ============================================
