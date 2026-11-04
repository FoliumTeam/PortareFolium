-- 031 · v0.13.19 · 이력서·소개 언어 사본 공개 상태 추가
-- 원문 복사본의 검토 전 공개 방지와 기존 한국어 공개 유지

ALTER TABLE resume_data ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE about_data ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE about_data_i18n ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;

INSERT INTO site_config (key, value) VALUES ('db_schema_version', '"0.13.19"')
ON CONFLICT (key) DO UPDATE SET value = '"0.13.19"';

-- @sqlite-sql-start
-- UPDATE refuge_rows SET row_json = json_set(row_json, '$.published', json('true'))
-- WHERE table_name IN ('resume_data', 'about_data') AND json_type(row_json, '$.published') IS NULL;
-- UPDATE refuge_rows SET row_json = json_set(row_json, '$.published', json('false'))
-- WHERE table_name = 'about_data_i18n' AND json_type(row_json, '$.published') IS NULL;
-- @sqlite-sql-end
