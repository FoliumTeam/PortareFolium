-- 003 · v0.5.4 · site_config 테이블 생성
-- 사이트 설정 (색상 스킴, TOC 스타일 등)

CREATE TABLE IF NOT EXISTS site_config (
  key   text primary key,
  value jsonb not null
);
