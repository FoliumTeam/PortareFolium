-- 028 · v0.12.190 · 기본 직무 분야 제거
-- 직무 분야 공개 경로는 job_fields 등록 목록을 정본으로 사용
DELETE FROM public.site_config
WHERE key = 'job_field';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.190"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.190"';
