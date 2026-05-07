-- 019 · v0.11.74 · Gantt Chart bar style 컬럼 추가
-- Gantt Chart rounded/square bar style 설정

ALTER TABLE gantt_chart_archives
  ADD COLUMN IF NOT EXISTS bar_style TEXT NOT NULL DEFAULT 'rounded';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.74"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.74"';
