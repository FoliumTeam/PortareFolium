-- 025 · v0.12.150 · post_categories registry 추가
-- TagsPanel에서 사용 포스트가 0개인 카테고리도 직접 생성/관리

CREATE TABLE IF NOT EXISTS post_categories (
    name        TEXT        PRIMARY KEY,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_post_categories_created_at
ON post_categories (created_at DESC);

INSERT INTO post_categories (name)
SELECT DISTINCT btrim(category) AS name
FROM posts
WHERE category IS NOT NULL
  AND btrim(category) <> ''
ON CONFLICT (name) DO NOTHING;

ALTER TABLE post_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_categories_public_read" ON post_categories;
CREATE POLICY "post_categories_public_read"
    ON post_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "post_categories_auth_write" ON post_categories;
CREATE POLICY "post_categories_auth_write"
    ON post_categories FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE OR REPLACE VIEW post_category_counts
WITH (security_invoker = true) AS
WITH post_counts AS (
    SELECT
        btrim(category) AS category,
        COUNT(*)::int AS count
    FROM posts
    WHERE category IS NOT NULL
      AND btrim(category) <> ''
    GROUP BY btrim(category)
)
SELECT
    post_categories.name AS category,
    COALESCE(post_counts.count, 0)::int AS count
FROM post_categories
LEFT JOIN post_counts ON post_counts.category = post_categories.name
UNION
SELECT
    post_counts.category,
    post_counts.count
FROM post_counts
LEFT JOIN post_categories ON post_categories.name = post_counts.category
WHERE post_categories.name IS NULL;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.150"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.150"';
