-- ======================================================
-- Makham Food Ordering System — Supabase Setup Script
-- รันสคริปต์นี้ใน Supabase SQL Editor
-- ======================================================

-- 1. สร้างตาราง categories
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 2. สร้างตาราง menu_items
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  image_url text DEFAULT '',
  is_available boolean DEFAULT true,
  is_sold_out boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. สร้างตาราง orders
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text NOT NULL UNIQUE,
  order_type text NOT NULL,
  customer jsonb NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  delivery jsonb,
  payment jsonb NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  delivery_fee numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  note text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. สร้างตาราง settings
CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY,
  store jsonb NOT NULL,
  promptpay jsonb NOT NULL,
  delivery jsonb NOT NULL
);

-- 5. ปิด RLS (Row Level Security) เพื่อให้ anon key เข้าถึงได้
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;

-- 6. ใส่ค่าเริ่มต้นของ settings
INSERT INTO settings (id, store, promptpay, delivery)
VALUES (
  'main',
  '{"name": "ร้านมะขาม", "address": "", "lat": 13.7563, "lng": 100.5018}',
  '{"phone": "", "accountName": ""}',
  '{"pricePerKm": 10, "minDistance": 1, "minFee": 30, "maxDistance": 20}'
)
ON CONFLICT (id) DO NOTHING;
