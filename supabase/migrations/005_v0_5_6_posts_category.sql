-- 005 · v0.5.6 · posts.category 컬럼 추가
-- 포스트 카테고리

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS category text;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.5.6"')
ON CONFLICT (key) DO UPDATE SET value = '"0.5.6"';
