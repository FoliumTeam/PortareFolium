-- 030 · v0.13.16 · 언어별 콘텐츠 저장 공간 추가
-- 한국어 원본·주소 보존과 영어·일본어 독립 저장

CREATE TABLE IF NOT EXISTS about_data_i18n (LIKE about_data INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (lang, id)
);
ALTER TABLE about_data_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE about_data_i18n FROM anon, authenticated;
GRANT ALL ON TABLE about_data_i18n TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS about_data_i18n_lang ON about_data_i18n (lang);
DROP TRIGGER IF EXISTS about_data_i18n_updated_at ON about_data_i18n;
CREATE TRIGGER about_data_i18n_updated_at BEFORE UPDATE ON about_data_i18n
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS posts_i18n (LIKE posts INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (lang, id)
);
ALTER TABLE posts_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE posts_i18n FROM anon, authenticated;
GRANT ALL ON TABLE posts_i18n TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS posts_i18n_lang_slug ON posts_i18n (lang, slug);
DROP TRIGGER IF EXISTS posts_i18n_updated_at ON posts_i18n;
CREATE TRIGGER posts_i18n_updated_at BEFORE UPDATE ON posts_i18n
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS portfolio_items_i18n (LIKE portfolio_items INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (lang, id)
);
ALTER TABLE portfolio_items_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE portfolio_items_i18n FROM anon, authenticated;
GRANT ALL ON TABLE portfolio_items_i18n TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS portfolio_items_i18n_lang_slug ON portfolio_items_i18n (lang, slug);
DROP TRIGGER IF EXISTS portfolio_items_i18n_updated_at ON portfolio_items_i18n;
CREATE TRIGGER portfolio_items_i18n_updated_at BEFORE UPDATE ON portfolio_items_i18n
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS books_i18n (LIKE books INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (lang, id)
);
ALTER TABLE books_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE books_i18n FROM anon, authenticated;
GRANT ALL ON TABLE books_i18n TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS books_i18n_lang_slug ON books_i18n (lang, slug);
DROP TRIGGER IF EXISTS books_i18n_updated_at ON books_i18n;
CREATE TRIGGER books_i18n_updated_at BEFORE UPDATE ON books_i18n
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS editor_states_i18n (LIKE editor_states INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (lang, id)
);
ALTER TABLE editor_states_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE editor_states_i18n FROM anon, authenticated;
GRANT ALL ON TABLE editor_states_i18n TO service_role;

CREATE TABLE IF NOT EXISTS post_content_revisions_i18n (LIKE post_content_revisions INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (lang, id)
);
ALTER TABLE post_content_revisions_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE post_content_revisions_i18n FROM anon, authenticated;
GRANT ALL ON TABLE post_content_revisions_i18n TO service_role;

CREATE TABLE IF NOT EXISTS post_content_chunks_i18n (LIKE post_content_chunks INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (revision_id, chunk_index, lang)
);
ALTER TABLE post_content_chunks_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE post_content_chunks_i18n FROM anon, authenticated;
GRANT ALL ON TABLE post_content_chunks_i18n TO service_role;

CREATE TABLE IF NOT EXISTS tags_i18n (LIKE tags INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (slug, lang)
);
ALTER TABLE tags_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE tags_i18n FROM anon, authenticated;
GRANT ALL ON TABLE tags_i18n TO service_role;

CREATE TABLE IF NOT EXISTS post_categories_i18n (LIKE post_categories INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (name, lang)
);
ALTER TABLE post_categories_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE post_categories_i18n FROM anon, authenticated;
GRANT ALL ON TABLE post_categories_i18n TO service_role;

CREATE TABLE IF NOT EXISTS application_profiles_i18n (LIKE application_profiles INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (lang, id)
);
ALTER TABLE application_profiles_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE application_profiles_i18n FROM anon, authenticated;
GRANT ALL ON TABLE application_profiles_i18n TO service_role;
CREATE UNIQUE INDEX IF NOT EXISTS application_profiles_i18n_lang_token ON application_profiles_i18n (lang, public_token);
DROP TRIGGER IF EXISTS application_profiles_i18n_updated_at ON application_profiles_i18n;
CREATE TRIGGER application_profiles_i18n_updated_at BEFORE UPDATE ON application_profiles_i18n
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS site_config_i18n (LIKE site_config INCLUDING DEFAULTS INCLUDING CONSTRAINTS,
    lang TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'ja')),
    PRIMARY KEY (key, lang)
);
ALTER TABLE site_config_i18n ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE site_config_i18n FROM anon, authenticated;
GRANT ALL ON TABLE site_config_i18n TO service_role;
DROP TRIGGER IF EXISTS site_config_i18n_updated_at ON site_config_i18n;
CREATE TRIGGER site_config_i18n_updated_at BEFORE UPDATE ON site_config_i18n
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO resume_data (lang, data) VALUES ('en', '{}'::jsonb), ('ja', '{}'::jsonb)
ON CONFLICT (lang) DO NOTHING;

CREATE OR REPLACE VIEW post_tags_i18n WITH (security_invoker = true) AS
SELECT p.id AS post_id, p.lang, btrim(tag) AS tag_slug, p.pub_date, p.created_at
FROM posts_i18n p CROSS JOIN LATERAL unnest(p.tags) tag
WHERE btrim(tag) <> '';

CREATE OR REPLACE VIEW post_tag_counts_i18n WITH (security_invoker = true) AS
SELECT lang, tag_slug, COUNT(*)::int AS count FROM post_tags_i18n GROUP BY lang, tag_slug;

CREATE OR REPLACE VIEW post_category_counts_i18n WITH (security_invoker = true) AS
SELECT lang, btrim(category) AS category, COUNT(*)::int AS count FROM posts_i18n
WHERE category IS NOT NULL AND btrim(category) <> '' GROUP BY lang, btrim(category);

REVOKE ALL ON TABLE post_tags_i18n, post_tag_counts_i18n, post_category_counts_i18n FROM anon, authenticated;
GRANT SELECT ON TABLE post_tags_i18n, post_tag_counts_i18n, post_category_counts_i18n TO service_role;

INSERT INTO site_config (key, value) VALUES ('db_schema_version', '"0.13.16"')
ON CONFLICT (key) DO UPDATE SET value = '"0.13.16"';

-- @sqlite-sql-start
-- INSERT OR IGNORE INTO refuge_rows (table_name, identity, row_json)
-- VALUES ('resume_data', 'en', '{"id":"i18n-en","lang":"en","data":{}}'),
-- ('resume_data', 'ja', '{"id":"i18n-ja","lang":"ja","data":{}}');
-- @sqlite-sql-end
