-- 024 · v0.12.149 · post_tags 정규화 조회 테이블 추가
-- TagsPanel 태그별 사용 포스트 preview를 tag_slug + pub_date 인덱스로 최적화

CREATE TABLE IF NOT EXISTS post_tags (
    post_id    UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    tag_slug   TEXT        NOT NULL,
    pub_date   TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, tag_slug)
);

CREATE INDEX IF NOT EXISTS idx_post_tags_tag_pub_date
ON post_tags (tag_slug, pub_date DESC, post_id);

CREATE INDEX IF NOT EXISTS idx_posts_category_pub_date
ON posts (category, pub_date DESC);

INSERT INTO post_tags (post_id, tag_slug, pub_date)
SELECT
    posts.id,
    normalized_tags.tag_slug,
    posts.pub_date
FROM posts
CROSS JOIN LATERAL (
    SELECT DISTINCT btrim(tag) AS tag_slug
    FROM unnest(posts.tags) AS tag
    WHERE btrim(tag) <> ''
) AS normalized_tags
ON CONFLICT (post_id, tag_slug)
DO UPDATE SET pub_date = EXCLUDED.pub_date;

CREATE OR REPLACE FUNCTION sync_post_tags()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM post_tags WHERE post_id = NEW.id;

    INSERT INTO post_tags (post_id, tag_slug, pub_date)
    SELECT
        NEW.id,
        normalized_tags.tag_slug,
        NEW.pub_date
    FROM (
        SELECT DISTINCT btrim(tag) AS tag_slug
        FROM unnest(COALESCE(NEW.tags, '{}'::text[])) AS tag
        WHERE btrim(tag) <> ''
    ) AS normalized_tags
    ON CONFLICT (post_id, tag_slug)
    DO UPDATE SET pub_date = EXCLUDED.pub_date;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_post_tags ON posts;
CREATE TRIGGER trg_sync_post_tags
    AFTER INSERT OR UPDATE OF tags, pub_date ON posts
    FOR EACH ROW EXECUTE FUNCTION sync_post_tags();

ALTER TABLE post_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_tags_public_read" ON post_tags;
CREATE POLICY "post_tags_public_read"
    ON post_tags FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM posts
            WHERE posts.id = post_tags.post_id
              AND posts.published = true
        )
    );

DROP POLICY IF EXISTS "post_tags_auth_all" ON post_tags;
CREATE POLICY "post_tags_auth_all"
    ON post_tags FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE VIEW post_tag_counts
WITH (security_invoker = true) AS
SELECT
    tag_slug,
    COUNT(*)::int AS count
FROM post_tags
GROUP BY tag_slug;

CREATE OR REPLACE VIEW post_category_counts
WITH (security_invoker = true) AS
SELECT
    btrim(category) AS category,
    COUNT(*)::int AS count
FROM posts
WHERE category IS NOT NULL
  AND btrim(category) <> ''
GROUP BY btrim(category);

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.149"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.149"';
