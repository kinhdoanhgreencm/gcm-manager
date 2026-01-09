# Hướng dẫn thiết lập Supabase

## 1. Biến môi trường

Thêm vào file `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## 2. Tạo bảng `vehicles` trong Supabase

Chạy SQL sau trong SQL Editor của Supabase:

```sql
-- Tạo bảng vehicles
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vin TEXT NOT NULL UNIQUE,
  make TEXT NOT NULL DEFAULT 'VinFast',
  model TEXT,
  version TEXT,
  year INTEGER NOT NULL,
  color TEXT,
  type TEXT NOT NULL CHECK (type IN ('NEW', 'USED', 'EV')),
  mileage INTEGER,
  battery_health INTEGER,
  cost NUMERIC(15, 2) NOT NULL,
  price NUMERIC(15, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD', 'REGISTRATION', 'DELIVERED')),
  supplier_id TEXT,
  entry_date DATE,
  notes TEXT,
  images TEXT[], -- Array of image URLs
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo index cho các trường thường dùng
CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_supplier_id ON vehicles(supplier_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);

-- Tạo trigger để tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_vehicles_updated_at 
  BEFORE UPDATE ON vehicles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

## 3. Tạo Storage Bucket cho ảnh xe

1. Vào **Storage** trong Supabase Dashboard
2. Tạo bucket mới tên `vehicle-images`
3. Cấu hình bucket:
   - **Public bucket**: Bật (để có thể truy cập ảnh qua URL công khai)
   - **File size limit**: 10MB (hoặc tùy chỉnh)
   - **Allowed MIME types**: `image/*`

4. Cấu hình RLS (Row Level Security) cho bucket:

```sql
-- Cho phép public đọc ảnh
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'vehicle-images');

-- Cho phép authenticated users upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-images');

-- Cho phép authenticated users xóa ảnh của mình
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'vehicle-images');
```

## 4. Cấu hình RLS cho bảng vehicles (tùy chọn)

Nếu bạn muốn bảo mật dữ liệu, có thể thêm RLS:

```sql
-- Bật RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Cho phép tất cả người dùng đọc (hoặc chỉnh sửa theo nhu cầu)
CREATE POLICY "Public read access" ON vehicles
  FOR SELECT
  USING (true);

-- Cho phép authenticated users insert
CREATE POLICY "Authenticated users can insert" ON vehicles
  FOR INSERT
  WITH CHECK (true);

-- Cho phép authenticated users update
CREATE POLICY "Authenticated users can update" ON vehicles
  FOR UPDATE
  USING (true);
```

## 5. Kiểm tra

Sau khi thiết lập xong, bạn có thể:
- Tạo xe mới từ trang `/inventory/new`
- Ảnh sẽ được upload lên Supabase Storage
- Dữ liệu xe sẽ được lưu vào bảng `vehicles`

