-- DocVault Database Schema
-- Tạo database đúng encoding UTF8 (bắt buộc để hiển thị tiếng Việt):
--   psql -U postgres -c "CREATE DATABASE docvault ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C' TEMPLATE template0;"
--   psql -U postgres -d docvault -f schema.sql
--
-- NẾU ĐÃ tạo DB mà bị lỗi font tiếng Việt, chạy lệnh này trong psql rồi restart PostgreSQL:
--   UPDATE pg_database SET datcollate='C', datctype='C' WHERE datname='docvault';

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles
CREATE TYPE user_role AS ENUM ('admin', 'editor', 'viewer');
CREATE TYPE access_level AS ENUM ('public', 'internal', 'private');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  department VARCHAR(100),
  avatar_initials VARCHAR(3),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Folders / Categories
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  folder_id UUID REFERENCES folders(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES users(id),
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(20) NOT NULL,
  file_size BIGINT NOT NULL,
  access_level access_level NOT NULL DEFAULT 'internal',
  current_version VARCHAR(20) DEFAULT 'v1.0',
  download_count INT DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document versions (version history)
CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  version VARCHAR(20) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  change_note TEXT,
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Document permissions (per-user overrides)
CREATE TABLE document_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT true,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  granted_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, user_id)
);

-- Activity log
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL, -- 'upload', 'download', 'view', 'edit', 'delete', 'share'
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_documents_folder ON documents(folder_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_access_level ON documents(access_level);
CREATE INDEX idx_documents_title ON documents USING gin(to_tsvector('simple', title));
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);

-- Seed: default folders
INSERT INTO folders (id, name) VALUES
  (uuid_generate_v4(), 'Nhân sự'),
  (uuid_generate_v4(), 'Tài chính'),
  (uuid_generate_v4(), 'Kỹ thuật'),
  (uuid_generate_v4(), 'Pháp lý'),
  (uuid_generate_v4(), 'Chung');

-- Seed: default admin user (password: Admin@123)
INSERT INTO users (name, email, password_hash, role, department, avatar_initials)
VALUES (
  'Quản trị viên',
  'admin@company.com',
  '$2a$10$xWQVfduqde.E4zEzhnw5fuDwkJCqcPE0/3JZJBNM1UPg/hVWbmlee',
  'admin',
  'IT',
  'QT'
);
