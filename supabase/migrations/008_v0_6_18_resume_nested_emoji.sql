-- 008 · v0.6.18 · resume_data 섹션별 emoji/showEmoji nested 구조로 이전
-- 이력서 섹션 이모지 설정 per-section 중첩 구조 (ResumeSection<T>)

UPDATE resume_data
SET data = COALESCE(
  (
    SELECT jsonb_object_agg(
      section_key,
      CASE
        WHEN section_key = 'basics' THEN section_val
        WHEN jsonb_typeof(section_val) = 'array' THEN
          jsonb_build_object(
            'emoji',     COALESCE(data->'meta'->'sectionLabels'->section_key, '"✔️"'),
            'showEmoji', COALESCE(data->'meta'->'showEmojis'->section_key, 'false'),
            'entries',   section_val
          )
        ELSE section_val
      END
    )
    FROM jsonb_each(data - 'meta') AS t(section_key, section_val)
  ),
  '{}'::jsonb
)
WHERE lang = 'ko';

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.6.18"')
ON CONFLICT (key) DO UPDATE SET value = '"0.6.18"';
