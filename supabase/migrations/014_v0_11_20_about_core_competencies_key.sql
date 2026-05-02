-- 014 · v0.11.20 · about_data JSONB 키 이름 변경: coreValues → coreCompetencies
-- 핵심역량 편집 UI를 ResumePanel로 이동, DB JSONB 키 일치

UPDATE about_data
SET data = jsonb_set(
    data - 'coreValues',
    '{coreCompetencies}',
    COALESCE(data->'coreValues', '[]'::jsonb)
)
WHERE data ? 'coreValues';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.20"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.20"';
