-- ============================================
-- GCM Manager - Update Supplier Debt Calculation Logic
-- ============================================
-- File này cập nhật logic tính công nợ (debt) cho nhà cung cấp
-- Công nợ = Tổng giá trị nhập (total_import_value) - Tổng thanh toán từ transactions
-- Chỉ tính công nợ nếu payment_terms = 'DEFERRED'
-- ============================================

-- 1. Cập nhật function update_supplier_stats() để tính debt
-- ============================================

CREATE OR REPLACE FUNCTION update_supplier_stats()
RETURNS TRIGGER AS $$
DECLARE
  supplier_id_value TEXT;
BEGIN
  -- Xác định supplier_id từ trigger
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    supplier_id_value := COALESCE(NEW.supplier_id, OLD.supplier_id);
  ELSE
    supplier_id_value := OLD.supplier_id;
  END IF;
  
  -- Chỉ cập nhật nếu có supplier_id
  IF supplier_id_value IS NOT NULL AND supplier_id_value != '' THEN
    -- Cập nhật total_vehicles, total_import_value và debt
    -- So sánh supplier_id (TEXT) với id (UUID) bằng cách convert UUID sang TEXT
    UPDATE suppliers s
    SET 
      total_vehicles = (
        SELECT COUNT(*) 
        FROM vehicles 
        WHERE supplier_id = supplier_id_value OR supplier_id = s.id::TEXT OR supplier_id = s.code
      ),
      total_import_value = (
        SELECT COALESCE(SUM(cost), 0)
        FROM vehicles 
        WHERE supplier_id = supplier_id_value OR supplier_id = s.id::TEXT OR supplier_id = s.code
      ),
      debt = CASE
        -- Nếu payment_terms = 'DEFERRED', tính công nợ = total_import_value - tổng thanh toán
        WHEN s.payment_terms = 'DEFERRED' THEN
          COALESCE((
            SELECT SUM(cost)
            FROM vehicles 
            WHERE (supplier_id = supplier_id_value OR supplier_id = s.id::TEXT OR supplier_id = s.code)
          ), 0) - COALESCE((
            -- Tính tổng thanh toán từ transactions (nếu bảng transactions tồn tại)
            SELECT SUM(amount)
            FROM transactions
            WHERE reference_type = 'SUPPLIER'
              AND (reference_id = supplier_id_value OR reference_id = s.id::TEXT OR reference_id = s.code)
              AND type = 'EXPENSE'
              AND status IN ('APPROVED', 'LOCKED')
          ), 0)
        -- Nếu payment_terms = 'IMMEDIATE', debt = 0
        ELSE 0
      END,
      updated_at = NOW()
    WHERE s.id::TEXT = supplier_id_value OR s.code = supplier_id_value;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 2. Tạo function để cập nhật debt từ transactions (nếu bảng transactions tồn tại)
-- ============================================

CREATE OR REPLACE FUNCTION update_supplier_debt_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  supplier_id_value TEXT;
BEGIN
  -- Chỉ xử lý nếu reference_type = 'SUPPLIER' và type = 'EXPENSE'
  IF NEW.reference_type = 'SUPPLIER' AND NEW.type = 'EXPENSE' AND NEW.status IN ('APPROVED', 'LOCKED') THEN
    supplier_id_value := NEW.reference_id;
    
    IF supplier_id_value IS NOT NULL AND supplier_id_value != '' THEN
      -- Cập nhật debt cho nhà cung cấp
      UPDATE suppliers s
      SET 
        debt = CASE
          WHEN s.payment_terms = 'DEFERRED' THEN
            COALESCE((
              SELECT SUM(cost)
              FROM vehicles 
              WHERE (supplier_id = supplier_id_value OR supplier_id = s.id::TEXT OR supplier_id = s.code)
            ), 0) - COALESCE((
              SELECT SUM(amount)
              FROM transactions
              WHERE reference_type = 'SUPPLIER'
                AND (reference_id = supplier_id_value OR reference_id = s.id::TEXT OR reference_id = s.code)
                AND type = 'EXPENSE'
                AND status IN ('APPROVED', 'LOCKED')
            ), 0)
          ELSE 0
        END,
        updated_at = NOW()
      WHERE s.id::TEXT = supplier_id_value OR s.code = supplier_id_value;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Tạo trigger để cập nhật debt khi có transaction mới
-- ============================================
DROP TRIGGER IF EXISTS update_supplier_debt_from_transaction_trigger ON transactions;

CREATE TRIGGER update_supplier_debt_from_transaction_trigger
  AFTER INSERT OR UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_debt_from_transaction();

-- 3. Cập nhật lại debt cho tất cả suppliers hiện có
-- ============================================

CREATE OR REPLACE FUNCTION refresh_all_supplier_debt()
RETURNS void AS $$
BEGIN
  UPDATE suppliers s
  SET 
    total_vehicles = (
      SELECT COUNT(*) 
      FROM vehicles v
      WHERE v.supplier_id = s.id::TEXT OR v.supplier_id = s.code
    ),
    total_import_value = (
      SELECT COALESCE(SUM(cost), 0)
      FROM vehicles v
      WHERE v.supplier_id = s.id::TEXT OR v.supplier_id = s.code
    ),
    debt = CASE
      WHEN s.payment_terms = 'DEFERRED' THEN
        GREATEST(0, COALESCE((
          SELECT SUM(cost)
          FROM vehicles v
          WHERE v.supplier_id = s.id::TEXT OR v.supplier_id = s.code
        ), 0) - COALESCE((
          -- Tính tổng thanh toán từ transactions (nếu bảng transactions tồn tại)
          SELECT SUM(amount)
          FROM transactions t
          WHERE t.reference_type = 'SUPPLIER'
            AND (t.reference_id = s.id::TEXT OR t.reference_id = s.code)
            AND t.type = 'EXPENSE'
            AND t.status IN ('APPROVED', 'LOCKED')
        ), 0))
      ELSE 0
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Chạy function để cập nhật lại debt cho tất cả suppliers
-- Lưu ý: Uncomment dòng này nếu bạn muốn cập nhật ngay
-- SELECT refresh_all_supplier_debt();

-- ============================================
-- Hoàn tất!
-- ============================================
-- Sau khi chạy file này:
-- 
-- 1. Function update_supplier_stats() đã được cập nhật để tính debt tự động
-- 2. Debt sẽ được tính = total_import_value - tổng thanh toán (nếu payment_terms = DEFERRED)
-- 3. Nếu payment_terms = IMMEDIATE, debt = 0
-- 
-- Lưu ý: 
-- - Trigger update_supplier_debt_from_transaction_trigger đã được kích hoạt
-- - Khi có transaction mới (INSERT/UPDATE) với reference_type = 'SUPPLIER' và type = 'EXPENSE', debt sẽ tự động cập nhật
-- - Để cập nhật debt cho tất cả suppliers hiện có, chạy: SELECT refresh_all_supplier_debt();
--
-- ============================================

