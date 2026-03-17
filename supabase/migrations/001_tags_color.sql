-- tags 테이블에 color 컬럼 추가 (oklch 색상 문자열)
alter table tags
  add column if not exists color text;
