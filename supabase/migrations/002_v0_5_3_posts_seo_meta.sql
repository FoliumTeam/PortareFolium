-- 002 · v0.5.3 · posts SEO 메타 컬럼 추가
-- 포스트 SEO (meta_title, meta_description, og_image)

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS meta_title       text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image         text;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.5.3"')
ON CONFLICT (key) DO UPDATE SET value = '"0.5.3"';
