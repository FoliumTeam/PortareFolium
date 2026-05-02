-- 022 · v0.12.114 · 영문 resume row 제거
-- resume_data를 ko 단일 source of truth로 정리

DELETE FROM resume_data
WHERE lang = 'en';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.114"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.114"';
-- @sqlite-sql-start
-- DELETE FROM refuge_rows
-- WHERE table_name = 'resume_data'
--   AND identity = 'en';
-- @sqlite-sql-end
