-- 007 · v0.6.17 · resume_data.data → meta 구조로 이모지 설정 이전
-- 이력서 섹션별 이모지 토글 (sectionLabels, showEmojis → meta 하위)

UPDATE resume_data
SET data = (data - 'sectionLabels' - 'showEmojis') ||
    jsonb_build_object(
        'meta',
        COALESCE(data->'meta', '{}'::jsonb) ||
        jsonb_build_object(
            'sectionLabels', COALESCE(data->'sectionLabels', '{}'::jsonb),
            'showEmojis',    COALESCE(data->'showEmojis',    '{}'::jsonb)
        )
    )
WHERE lang = 'ko';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.6.17"')
ON CONFLICT (key) DO UPDATE SET value = '"0.6.17"';
