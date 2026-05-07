-- 015 · v0.11.21 · coreCompetencies 이동: about_data → resume_data
-- 핵심역량 데이터를 이력서 테이블로 통합

UPDATE resume_data
SET data = data || jsonb_build_object(
    'coreCompetencies',
    COALESCE(
        (SELECT data->'coreCompetencies' FROM about_data LIMIT 1),
        '[]'::jsonb
    )
)
WHERE lang = 'ko'
  AND NOT (data ? 'coreCompetencies');

UPDATE about_data
SET data = data - 'coreCompetencies'
WHERE data ? 'coreCompetencies';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.21"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.21"';
