// DB 마이그레이션 정의 목록

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
        id: "003_site_config_table",
        title: "site_config 테이블 생성",
        feature: "사이트 설정 (색상 스킴, TOC 스타일 등)",
        sql: `create table if not exists site_config (
  key   text primary key,
  value jsonb not null
);`,
    },
    {
        id: "004_resume_table",
        title: "resume 테이블 생성",
        feature: "이력서 관리",
        sql: `create table if not exists resume (
  id         text primary key default 'main',
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

insert into resume (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;`,
    },
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
        id: "005_posts_category",
        title: "posts.category 컬럼 추가",
        feature: "포스트 카테고리",
        sql: `alter table posts
  add column if not exists category text;`,
    },
];
