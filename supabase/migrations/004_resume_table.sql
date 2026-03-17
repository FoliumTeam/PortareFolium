-- resume 테이블 생성 (JSON Resume 스키마 단일 행 저장)
create table if not exists resume (
  id      text primary key default 'main',
  data    jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

-- 기본 행 삽입 (없을 경우에만)
insert into resume (id, data)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;
