-- 020 · v0.11.81 · Gantt Chart category_colors 컬럼 추가
-- 카테고리별 색상 커스터마이징 (category_colors JSONB)

ALTER TABLE gantt_chart_archives
  ADD COLUMN IF NOT EXISTS category_colors JSONB NOT NULL DEFAULT '{}';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.81"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.81"';
