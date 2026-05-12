-- Migration v2b: thêm cột province cho catalogs
ALTER TABLE catalogs ADD COLUMN IF NOT EXISTS province VARCHAR(100);
SELECT 'Migration v2b hoàn tất!' AS result;
