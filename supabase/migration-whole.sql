-- ============================================================
-- migration-whole.sql
-- PortareFolium DB 스키마 전체 동기화
--
-- 대상: 모든 사용자 (최초 설치 또는 구버전 DB 보유)
-- 효과: 실행 후 db_schema_version = "0.11.74" 로 설정됨
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
-- Next.js 어드민 대시보드가 자동으로 DDL을 실행할 때 사용

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;

-- ── resume_data: sectionLabels/showEmojis → meta 이전 (v0.6.17) ──
-- 이미 meta 구조인 경우 COALESCE로 기존 값을 보존하며 안전하게 병합

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

-- ── resume_data: section → {emoji, showEmoji, entries} 구조 이전 (v0.6.18) ──
-- data가 빈 객체일 때 jsonb_object_agg가 NULL을 반환하므로 COALESCE로 보호

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

-- ── ai_agent_tokens 테이블 생성 (v0.6.20) ───────────────────

CREATE TABLE IF NOT EXISTS ai_agent_tokens (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash     TEXT        NOT NULL UNIQUE,
    label          TEXT        NOT NULL,
    duration_min   INTEGER     NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    revoked        BOOLEAN     NOT NULL DEFAULT FALSE,
    last_used_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ai_agent_tokens ENABLE ROW LEVEL SECURITY;

-- ── admin_login_attempts 테이블 (v0.12.85) ──────────────────

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    key_hash         TEXT        PRIMARY KEY,
    count            INTEGER     NOT NULL DEFAULT 0,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_first_attempt_at
    ON admin_login_attempts (first_attempt_at);

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

-- ── editor_states 테이블 (v0.8.3) ────────────────────────────

CREATE TABLE IF NOT EXISTS editor_states (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type  TEXT        NOT NULL,
    entity_slug  TEXT        NOT NULL,
    label        TEXT        NOT NULL,
    content      TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS gantt_chart_archives (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    source_filename TEXT        NOT NULL,
    csv_content     TEXT        NOT NULL,
    tasks           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    color_scheme    TEXT        NOT NULL DEFAULT 'emerald',
    bar_style       TEXT        NOT NULL DEFAULT 'rounded',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_states_entity
    ON editor_states (entity_type, entity_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gantt_chart_archives_created_at
    ON gantt_chart_archives (created_at DESC);

ALTER TABLE editor_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_chart_archives ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'editor_states_admin_all'
    ) THEN
        CREATE POLICY editor_states_admin_all ON editor_states
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'gantt_chart_archives'
          AND policyname = 'gantt_chart_archives_admin_all'
    ) THEN
        CREATE POLICY gantt_chart_archives_admin_all ON gantt_chart_archives
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

DROP TRIGGER IF EXISTS trg_gantt_chart_archives_updated_at ON gantt_chart_archives;

CREATE OR REPLACE TRIGGER trg_gantt_chart_archives_updated_at
    BEFORE UPDATE ON gantt_chart_archives
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── DB Snapshot 테이블 전환 (v0.11.68) ───────────────────────

DROP TABLE IF EXISTS content_snapshots;
DROP FUNCTION IF EXISTS prune_snapshots();

CREATE TABLE IF NOT EXISTS database_snapshots (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    filename    TEXT        NOT NULL,
    data        JSONB       NOT NULL,
    table_names TEXT[]      NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_database_snapshots_created_at
    ON database_snapshots (created_at DESC);

ALTER TABLE database_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'database_snapshots'
          AND policyname = 'database_snapshots_admin_all'
    ) THEN
        CREATE POLICY database_snapshots_admin_all ON database_snapshots
            FOR ALL TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION create_database_snapshot()
RETURNS TABLE (
    id UUID,
    filename TEXT,
    table_names TEXT[],
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    snapshot_data JSONB := '{}'::jsonb;
    current_rows JSONB;
    current_table TEXT;
    included_tables TEXT[] := ARRAY[]::TEXT[];
    snapshot_time TIMESTAMPTZ := NOW();
    snapshot_filename TEXT;
BEGIN
    snapshot_filename := 'supabase-db-snapshot-' ||
        to_char(snapshot_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24-MI-SS"Z"') ||
        '.json';

    FOR current_table IN
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename <> 'database_snapshots'
        ORDER BY tablename
    LOOP
        EXECUTE format(
            'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t',
            current_table
        )
        INTO current_rows;

        snapshot_data := snapshot_data ||
            jsonb_build_object(current_table, current_rows);
        included_tables := array_append(included_tables, current_table);
    END LOOP;

    RETURN QUERY
    INSERT INTO database_snapshots (filename, data, table_names, created_at)
    VALUES (snapshot_filename, snapshot_data, included_tables, snapshot_time)
    RETURNING
        database_snapshots.id,
        database_snapshots.filename,
        database_snapshots.table_names,
        database_snapshots.created_at;
END;
$$;

REVOKE ALL ON FUNCTION create_database_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_database_snapshot() TO service_role;

-- ── about_data valuePillars/coreValues 시딩 (v0.10.6) ────────

UPDATE about_data
SET data = data || '{
  "valuePillars": [
    {"label": "Pillar 1", "sub": "Sub 1", "description": "Admin에서 Value Pillar를 입력하세요"},
    {"label": "Pillar 2", "sub": "Sub 2", "description": "Admin에서 Value Pillar를 입력하세요"},
    {"label": "Pillar 3", "sub": "Sub 3", "description": "Admin에서 Value Pillar를 입력하세요"}
  ]
}'::jsonb
WHERE NOT (data ? 'valuePillars');

-- ── Storage policy 보안 강화 (v0.10.18 + v0.10.19) ──────────
-- SELECT: public → authenticated only
-- UPDATE/DELETE: authenticated 추가

DROP POLICY IF EXISTS images_public_read ON storage.objects;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND policyname = 'images_authenticated_select'
    ) THEN
        CREATE POLICY images_authenticated_select ON storage.objects
            FOR SELECT TO authenticated USING (bucket_id = 'images');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND policyname = 'images_authenticated_update'
    ) THEN
        CREATE POLICY images_authenticated_update ON storage.objects
            FOR UPDATE TO authenticated USING (bucket_id = 'images');
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'objects' AND policyname = 'images_authenticated_delete'
    ) THEN
        CREATE POLICY images_authenticated_delete ON storage.objects
            FOR DELETE TO authenticated USING (bucket_id = 'images');
    END IF;
END $$;

-- ── about_data coreValues → coreCompetencies 키 이름 변경 (v0.11.20) ────────

UPDATE about_data
SET data = jsonb_set(
    data - 'coreValues',
    '{coreCompetencies}',
    COALESCE(data->'coreValues', '[]'::jsonb)
)
WHERE data ? 'coreValues';

-- ── coreCompetencies 이동: about_data → resume_data (v0.11.21) ──────────────

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

-- ── DB 스키마 버전 설정 ───────────────────────────────────────
-- 항상 최신 버전으로 덮어씀 (migration-whole.sql은 전체 재동기화 목적)

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.74"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.74"';
