// DB 마이그레이션 정의 목록

// djb2 해시: SQL 내용 변경 감지용
export function sqlHash(sql: string): string {
    let h = 5381;
    for (let i = 0; i < sql.length; i++) h = (h * 33) ^ sql.charCodeAt(i);
    return (h >>> 0).toString(16);
}

// 적용 완료 기록 (id + 적용 당시 SQL 해시)
export interface AppliedRecord {
    id: string;
    hash: string;
}

export interface Migration {
    id: string;
    // 설명
    title: string;
    // 관련 기능
    feature: string;
    sql: string;
}

export const MIGRATIONS: Migration[] = [
    {
        id: "001_tags_color",
        title: "tags.color 컬럼 추가",
        feature: "태그 색상 (oklch 컬러 피커)",
        sql: `alter table tags
  add column if not exists color text;`,
    },
    {
        id: "002_posts_meta_fields",
        title: "posts SEO 메타 컬럼 추가",
        feature: "포스트 SEO (meta_title, meta_description, og_image)",
        sql: `alter table posts
  add column if not exists meta_title       text,
  add column if not exists meta_description text,
  add column if not exists og_image         text;`,
    },
    {
        id: "003_site_config_table",
        title: "site_config 테이블 생성",
        feature: "사이트 설정 (색상 스킴, TOC 스타일 등)",
        sql: `create table if not exists site_config (
  key   text primary key,
  value jsonb not null
);`,
    },
    {
        id: "004_resume_data_table",
        title: "resume_data 테이블 생성",
        feature: "이력서 관리 (언어별 데이터)",
        sql: `create table if not exists resume_data (
  id         uuid        primary key default gen_random_uuid(),
  lang       text        not null default 'ko',
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  unique(lang)
);

insert into resume_data (lang, data)
values ('ko', '{}'::jsonb)
on conflict (lang) do nothing;`,
    },
    {
        id: "005_posts_category",
        title: "posts.category 컬럼 추가",
        feature: "포스트 카테고리",
        sql: `alter table posts
  add column if not exists category text;`,
    },
];
