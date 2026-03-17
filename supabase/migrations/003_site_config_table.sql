-- site_config 키-값 설정 테이블 생성
create table if not exists site_config (
  key   text primary key,
  value jsonb not null
);
