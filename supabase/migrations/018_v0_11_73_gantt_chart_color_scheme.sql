-- 018 · v0.11.73 · Gantt Chart color scheme 컬럼 추가
-- Gantt Chart title + color scheme 수정과 preview 개선

ALTER TABLE gantt_chart_archives
  ADD COLUMN IF NOT EXISTS color_scheme TEXT NOT NULL DEFAULT 'emerald';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.73"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.73"';
