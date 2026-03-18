-- resume_data 테이블 생성 (언어별 이력서 JSON 저장)
create table if not exists resume_data (
  id         uuid        primary key default gen_random_uuid(),
  lang       text        not null default 'ko',
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  unique(lang)
);

-- 기본 한국어 행 삽입 (없을 경우에만)
insert into resume_data (lang, data)
values ('ko', '{}'::jsonb)
on conflict (lang) do nothing;
