-- 023 · v0.12.148 · posts.tags GIN 인덱스 추가
-- TagsPanel 사용 포스트 preview의 태그 배열 containment 조회 최적화

CREATE INDEX IF NOT EXISTS idx_posts_tags_gin
ON posts USING GIN (tags);

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.148"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.148"';
