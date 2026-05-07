-- 005 · v0.5.6 · posts.category 컬럼 추가
-- 포스트 카테고리

ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS category text;
