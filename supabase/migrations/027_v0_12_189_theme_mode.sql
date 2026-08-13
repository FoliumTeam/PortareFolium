-- 027 · v0.12.189 · 사이트 화면 모드 설정
-- 공개 사이트 라이트·다크·시스템 화면 모드 정책

INSERT INTO site_config (key, value)
VALUES ('theme_mode', '"light"')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.189"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.189"';

-- @sqlite-sql-start
-- INSERT INTO refuge_rows (table_name, identity, row_json, updated_at)
-- VALUES ('site_config', 'theme_mode', '{"key":"theme_mode","value":"light"}', CURRENT_TIMESTAMP)
-- ON CONFLICT (table_name, identity) DO UPDATE SET
--   row_json = excluded.row_json,
--   updated_at = CURRENT_TIMESTAMP;
-- @sqlite-sql-end
