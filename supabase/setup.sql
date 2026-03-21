-- ============================================================
-- setup.sql
-- PortareFolium 포트폴리오 전체 스키마 초기화
--
-- 실행: Supabase 대시보드 → SQL Editor → 이 파일 내용 붙여넣기 후 실행
-- ============================================================

-- ── 확장 ────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 테이블 ──────────────────────────────────────────────────

-- 사이트 전역 설정 (key-value 저장소)
CREATE TABLE IF NOT EXISTS site_config (
    key         TEXT        PRIMARY KEY,
    value       JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- About 페이지 데이터
CREATE TABLE IF NOT EXISTS about_data (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    data        JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 이력서 데이터 (lang 별로 하나씩: 'ko', 'en')
CREATE TABLE IF NOT EXISTS resume_data (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lang        TEXT        NOT NULL DEFAULT 'ko',
    data        JSONB       NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lang)
);

-- 블로그 포스트
CREATE TABLE IF NOT EXISTS posts (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             TEXT        NOT NULL UNIQUE,
    title            TEXT        NOT NULL,
    description      TEXT,
    pub_date         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    category         TEXT,
    tags             TEXT[]      NOT NULL DEFAULT '{}',
    job_field        TEXT,
    thumbnail        TEXT,
    content          TEXT        NOT NULL DEFAULT '',
    published        BOOLEAN     NOT NULL DEFAULT FALSE,
    meta_title       TEXT,
    meta_description TEXT,
    og_image         TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 포트폴리오 아이템
CREATE TABLE IF NOT EXISTS portfolio_items (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             TEXT        NOT NULL UNIQUE,
    title            TEXT        NOT NULL,
    description      TEXT,
    tags             TEXT[]      NOT NULL DEFAULT '{}',
    job_field        TEXT,
    thumbnail        TEXT,
    content          TEXT        NOT NULL DEFAULT '',
    data             JSONB       NOT NULL DEFAULT '{}',
    featured         BOOLEAN     NOT NULL DEFAULT FALSE,
    order_idx        INT         NOT NULL DEFAULT 0,
    published        BOOLEAN     NOT NULL DEFAULT FALSE,
    meta_title       TEXT,
    meta_description TEXT,
    og_image         TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 태그 (slug, 표시명, 색상)
CREATE TABLE IF NOT EXISTS tags (
    slug        TEXT        PRIMARY KEY,
    name        TEXT        NOT NULL,
    color       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 도서 리뷰
CREATE TABLE IF NOT EXISTS books (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    slug             TEXT        UNIQUE NOT NULL,
    title            TEXT        NOT NULL,
    author           TEXT,
    cover_url        TEXT,
    description      TEXT,
    content          TEXT        NOT NULL DEFAULT '',
    rating           SMALLINT    CHECK (rating >= 1 AND rating <= 5),
    tags             TEXT[]      NOT NULL DEFAULT '{}',
    job_field        TEXT[]      NOT NULL DEFAULT '{}',
    published        BOOLEAN     NOT NULL DEFAULT false,
    featured         BOOLEAN     NOT NULL DEFAULT false,
    order_idx        INTEGER     NOT NULL DEFAULT 0,
    data             JSONB       NOT NULL DEFAULT '{}',
    meta_title       TEXT,
    meta_description TEXT,
    og_image         TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 인덱스 ──────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_posts_slug        ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_published   ON posts(published, pub_date DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category    ON posts(category);
CREATE INDEX IF NOT EXISTS idx_portfolio_slug    ON portfolio_items(slug);
CREATE INDEX IF NOT EXISTS idx_portfolio_feat    ON portfolio_items(featured, order_idx);
CREATE INDEX IF NOT EXISTS idx_books_slug        ON books(slug);
CREATE INDEX IF NOT EXISTS idx_books_published   ON books(published, order_idx);

-- ── updated_at 자동 갱신 트리거 ─────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_portfolio_updated_at
    BEFORE UPDATE ON portfolio_items
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_about_updated_at
    BEFORE UPDATE ON about_data
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_resume_updated_at
    BEFORE UPDATE ON resume_data
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_site_config_updated_at
    BEFORE UPDATE ON site_config
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE site_config      ENABLE ROW LEVEL SECURITY;
ALTER TABLE about_data       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resume_data      ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags             ENABLE ROW LEVEL SECURITY;

-- site_config: 누구나 읽기 / 인증된 사용자만 쓰기
CREATE POLICY "site_config_public_read"
    ON site_config FOR SELECT USING (true);

CREATE POLICY "site_config_auth_write"
    ON site_config FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- about_data: 누구나 읽기 / 인증된 사용자만 쓰기
CREATE POLICY "about_public_read"
    ON about_data FOR SELECT USING (true);

CREATE POLICY "about_auth_write"
    ON about_data FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- resume_data: 누구나 읽기 / 인증된 사용자만 쓰기
CREATE POLICY "resume_public_read"
    ON resume_data FOR SELECT USING (true);

CREATE POLICY "resume_auth_write"
    ON resume_data FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- posts: published=true 인 것만 공개 읽기 / 인증된 사용자는 전체 접근
CREATE POLICY "posts_public_read"
    ON posts FOR SELECT USING (published = true);

CREATE POLICY "posts_auth_all"
    ON posts FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- portfolio_items: published=true 인 것만 공개 읽기 / 인증된 사용자는 전체 접근
CREATE POLICY "portfolio_public_read"
    ON portfolio_items FOR SELECT USING (published = true);

CREATE POLICY "portfolio_auth_all"
    ON portfolio_items FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- tags: 누구나 읽기 / 인증된 사용자만 쓰기
CREATE POLICY "tags_public_read"
    ON tags FOR SELECT USING (true);

CREATE POLICY "tags_auth_write"
    ON tags FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- books: published=true 인 것만 공개 읽기 / 인증된 사용자는 전체 접근
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books_public_read"
    ON books FOR SELECT USING (published = true);

CREATE POLICY "books_auth_all"
    ON books FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- ── exec_sql 함수 (service_role 전용 DDL 실행) ───────────────

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- ── Storage: images 버킷 ─────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "images_public_read"  ON storage.objects;
DROP POLICY IF EXISTS "images_auth_upload"  ON storage.objects;
DROP POLICY IF EXISTS "images_auth_delete"  ON storage.objects;

CREATE POLICY "images_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "images_auth_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "images_auth_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'images');

-- ── 초기 site_config 데이터 ──────────────────────────────────

INSERT INTO site_config (key, value) VALUES
    ('color_scheme',       '"blue"'),
    ('site_name',          '"PortareFolium"'),
    ('job_field',          '"game"'),
    ('job_fields',         '[{"id":"web","name":"Web","emoji":"🌐"},{"id":"game","name":"Game","emoji":"🎮"}]'),
    ('seo_config',         '{"default_title":"PortareFolium","default_description":"포트폴리오 & 기술 블로그","default_og_image":""}'),
    ('resume_layout',      '"modern"'),
    -- 신규 설치: setup.sql이 최신 스키마를 적용하므로 현재 버전으로 초기화
    ('db_schema_version',  '"0.6.4"')
ON CONFLICT (key) DO NOTHING;
