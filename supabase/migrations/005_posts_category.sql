-- posts 테이블에 category 컬럼 추가
alter table posts
  add column if not exists category text;
