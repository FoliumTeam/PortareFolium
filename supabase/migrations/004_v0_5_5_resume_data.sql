-- 004 · v0.5.5 · resume_data 테이블 생성
-- 이력서 관리 (언어별 데이터)

CREATE TABLE IF NOT EXISTS resume_data (
  id         uuid        primary key default gen_random_uuid(),
  lang       text        not null default 'ko',
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  unique(lang)
);

INSERT INTO resume_data (lang, data)
VALUES ('ko', '{}'::jsonb)
ON CONFLICT (lang) DO NOTHING;
