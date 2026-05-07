-- 001 · v0.5.2 · tags.color 컬럼 추가
-- 태그 색상 (oklch 컬러 피커)

ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS color text;
