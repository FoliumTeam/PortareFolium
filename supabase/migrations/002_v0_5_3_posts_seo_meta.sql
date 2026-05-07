-- 002 · v0.5.3 · posts SEO 메타 컬럼 추가
-- 포스트 SEO (meta_title, meta_description, og_image)

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS meta_title       text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image         text;
