-- ============================================================
-- migration-whole.sql
-- PortareFolium DB 스키마 전체 동기화
--
-- 대상: feedback 브랜치(b07a2d6a4, 2026-03-18) 이전 또는
--       현재 DB를 가진 모든 사용자
-- 효과: 실행 후 db_schema_version = "0.6.4" 로 설정됨
-- 실행: Supabase 대시보드 → SQL Editor → 전체 내용 붙여넣기 후 실행
-- 안전: idempotent — 이미 최신 DB에 재실행해도 에러 없음
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 신규 테이블 (없을 때만 생성) ─────────────────────────────

CREATE TABLE IF NOT EXISTS site_config (
    key        TEXT        PRIMARY KEY,
    value      JSONB       NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS resume_data (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    lang       TEXT        NOT NULL DEFAULT 'ko',
    data       JSONB       NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lang)
);
INSERT INTO resume_data (lang, data)
VALUES ('ko', '{}'::jsonb)
ON CONFLICT (lang) DO NOTHING;

-- ── 기존 테이블 컬럼 추가 (IF NOT EXISTS — 중복 실행 안전) ──────

ALTER TABLE tags
    ADD COLUMN IF NOT EXISTS color TEXT;

ALTER TABLE posts
    ADD COLUMN IF NOT EXISTS meta_title       TEXT,
    ADD COLUMN IF NOT EXISTS meta_description TEXT,
    ADD COLUMN IF NOT EXISTS og_image         TEXT,
    ADD COLUMN IF NOT EXISTS category         TEXT,
    ADD COLUMN IF NOT EXISTS thumbnail        TEXT,
    ADD COLUMN IF NOT EXISTS job_field        TEXT;

ALTER TABLE portfolio_items
    ADD COLUMN IF NOT EXISTS thumbnail TEXT,
    ADD COLUMN IF NOT EXISTS job_field TEXT;

-- ── books 테이블 ──────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_books_slug      ON books(slug);
CREATE INDEX IF NOT EXISTS idx_books_published ON books(published, order_idx);

-- updated_at 트리거 함수 (이미 존재하면 교체)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_books_updated_at
    BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    -- SELECT 정책 (published 항목만 공개)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'books'
          AND policyname IN ('books_public_read', 'Public read published books')
    ) THEN
        CREATE POLICY "books_public_read"
            ON books FOR SELECT USING (published = true);
    END IF;
    -- ALL 정책 (인증된 사용자 전체 접근)
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'books'
          AND policyname IN ('books_auth_all', 'Authenticated full access')
    ) THEN
        CREATE POLICY "books_auth_all"
            ON books FOR ALL
            USING (auth.role() = 'authenticated')
            WITH CHECK (auth.role() = 'authenticated');
    END IF;
END $$;

-- ── exec_sql 함수 (자동 마이그레이션용, service_role 전용) ────
-- Next.js 전환 후 어드민 대시보드가 자동으로 DDL을 실행할 때 사용

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- ── DB 스키마 버전 초기화 ─────────────────────────────────────
-- 이미 db_schema_version 이 있으면 기존 값 유지 (ON CONFLICT DO NOTHING)

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.6.4"')
ON CONFLICT (key) DO NOTHING;
