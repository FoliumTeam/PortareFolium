-- posts 테이블에 SEO 및 OG 메타 컬럼 추가
alter table posts
  add column if not exists meta_title      text,
  add column if not exists meta_description text,
  add column if not exists og_image        text;
