// DB 마이그레이션 버전 관리 모듈
// 버전 체계: migration.version = 해당 마이그레이션이 추가된 package.json 버전과 동일
// 향후 마이그레이션 추가 시 SQL 끝에 db_schema_version 업데이트 구문 포함 필요

import packageJson from "../../package.json";

// 현재 앱 버전 (package.json 기준)
export const APP_VERSION: string = packageJson.version;

export interface Migration {
    version: string;
    title: string;
    feature: string;
    sql: string;
}

// a < b → -1 | a === b → 0 | a > b → 1
export function compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff < 0 ? -1 : 1;
    }
    return 0;
}

// dbVersion보다 높은 버전의 마이그레이션만 반환 (오름차순)
export function getPendingMigrations(dbVersion: string): Migration[] {
    return [...MIGRATIONS]
        .filter((m) => compareVersions(m.version, dbVersion) > 0)
        .sort((a, b) => compareVersions(a.version, b.version));
}

// 기존 마이그레이션의 version은 git log로 각 파일이 추가된 시점의
// package.json 버전을 확인해 맞춘다. 아래는 CHANGES.md 기준 근사치.
// migration-whole.sql 실행 후 db_schema_version = "0.6.4" 이므로
// 아래 항목들(version <= "0.6.4")은 모두 "적용 완료"로 표시된다.
export const MIGRATIONS: Migration[] = [
    {
        version: "0.5.2",
        title: "tags.color 컬럼 추가",
        feature: "태그 색상 (oklch 컬러 피커)",
        sql: `ALTER TABLE tags
  ADD COLUMN IF NOT EXISTS color text;`,
    },
    {
        version: "0.5.3",
        title: "posts SEO 메타 컬럼 추가",
        feature: "포스트 SEO (meta_title, meta_description, og_image)",
        sql: `ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS meta_title       text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS og_image         text;`,
    },
    {
        version: "0.5.4",
        title: "site_config 테이블 생성",
        feature: "사이트 설정 (색상 스킴, TOC 스타일 등)",
        sql: `CREATE TABLE IF NOT EXISTS site_config (
  key   text primary key,
  value jsonb not null
);`,
    },
    {
        version: "0.5.5",
        title: "resume_data 테이블 생성",
        feature: "이력서 관리 (언어별 데이터)",
        sql: `CREATE TABLE IF NOT EXISTS resume_data (
  id         uuid        primary key default gen_random_uuid(),
  lang       text        not null default 'ko',
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  unique(lang)
);

INSERT INTO resume_data (lang, data)
VALUES ('ko', '{}'::jsonb)
ON CONFLICT (lang) DO NOTHING;`,
    },
    {
        version: "0.5.6",
        title: "posts.category 컬럼 추가",
        feature: "포스트 카테고리",
        sql: `ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS category text;`,
    },
    {
        version: "0.6.2",
        title: "books 테이블 생성",
        feature: "도서 리뷰 (포트폴리오 연관 도서, books 상세 페이지)",
        sql: `CREATE TABLE IF NOT EXISTS books (
  id               uuid     primary key default gen_random_uuid(),
  slug             text     unique not null,
  title            text     not null,
  author           text,
  cover_url        text,
  description      text,
  content          text     not null default '',
  rating           smallint check (rating >= 1 and rating <= 5),
  tags             text[]   not null default '{}',
  job_field        text[]   not null default '{}',
  published        boolean  not null default false,
  featured         boolean  not null default false,
  order_idx        integer  not null default 0,
  data             jsonb    not null default '{}',
  meta_title       text,
  meta_description text,
  og_image         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'books'
      AND policyname IN ('books_public_read', 'Public read published books')
  ) THEN
    CREATE POLICY "books_public_read"
      ON books FOR SELECT USING (published = true);
  END IF;
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
END $$;`,
    },
    // 향후 마이그레이션 추가 예시:
    // {
    //   version: "0.6.5",  ← package.json 버전과 동일하게
    //   title: "컬럼명 설명",
    //   feature: "관련 기능 이름",
    //   sql: `ALTER TABLE some_table ADD COLUMN IF NOT EXISTS some_col text;
    //
    // -- db_schema_version 자동 업데이트 (수동 실행 시에도 버전이 기록됨)
    // INSERT INTO site_config (key, value)
    // VALUES ('db_schema_version', '"0.6.5"')
    // ON CONFLICT (key) DO UPDATE SET value = '"0.6.5"';`,
    // },
];
