SET client_encoding = 'UTF8';

DELETE FROM catalogs;
DELETE FROM folders;

INSERT INTO folders (name) VALUES 
  ('Nhân sự'),
  ('Tài chính'),
  ('Kỹ thuật'),
  ('Pháp lý'),
  ('Chung'),
  ('Đấu thầu'),
  ('ISO');

INSERT INTO catalogs (name, type) VALUES 
  ('Hinova JSC', 'investor'),
  ('Sở Nội vụ An Giang', 'investor'),
  ('UBND Tỉnh An Giang', 'investor'),
  ('Dự án nội bộ', 'partner'),
  ('Đối tác A', 'partner');

UPDATE users 
SET name = 'Quản trị viên', department = 'IT', avatar_initials = 'QT' 
WHERE email = 'admin@company.com';

SELECT 'Done!' as result;
