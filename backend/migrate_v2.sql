-- ═══════════════════════════════════════════════════════════════
-- HNV-Store Migration v2 — chạy 1 lần trên DB hiện có
-- psql -U postgres -d docvault -f migrate_v2.sql
-- ═══════════════════════════════════════════════════════════════

-- 1. Bảng danh mục động (chủ đầu tư, đối tác)
CREATE TABLE IF NOT EXISTS catalogs (
  id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50)  NOT NULL,  -- 'investor' | 'partner'
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_catalogs_type ON catalogs(type);

-- 2. Thêm cột vào bảng documents
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS doc_date      DATE,          -- ngày tài liệu
  ADD COLUMN IF NOT EXISTS period_type   VARCHAR(20),   -- 'week'|'month'|'year'|'custom'
  ADD COLUMN IF NOT EXISTS period_from   DATE,
  ADD COLUMN IF NOT EXISTS period_to     DATE,
  ADD COLUMN IF NOT EXISTS province      VARCHAR(100),  -- tỉnh/thành phố
  ADD COLUMN IF NOT EXISTS investor_id   UUID REFERENCES catalogs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS partner_id    UUID REFERENCES catalogs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_type  VARCHAR(20);   -- 'company'|'partner'

-- 3. Seed thư mục mới
INSERT INTO folders (name)
SELECT 'Đấu thầu' WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'Đấu thầu');
INSERT INTO folders (name)
SELECT 'ISO' WHERE NOT EXISTS (SELECT 1 FROM folders WHERE name = 'ISO');

-- 4. Seed chủ đầu tư mẫu
INSERT INTO catalogs (name, type) VALUES
  ('Sở Nội vụ An Giang',       'investor'),
  ('UBND Tỉnh An Giang',       'investor'),
  ('Hinova JSC',               'investor')
ON CONFLICT DO NOTHING;

-- 5. Seed đối tác mẫu
INSERT INTO catalogs (name, type) VALUES
  ('Dự án nội bộ',   'partner'),
  ('Đối tác A',      'partner')
ON CONFLICT DO NOTHING;

SELECT 'Migration v2 hoàn tất!' AS result;
