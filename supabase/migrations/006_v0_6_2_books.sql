-- 006 · v0.6.2 · books 테이블 생성
-- 도서 리뷰 (포트폴리오 연관 도서, books 상세 페이지)

CREATE TABLE IF NOT EXISTS books (
  id               uuid     primary key default gen_random_uuid(),
  slug             text     unique not null,
  title            text     not null,
  author           text,
  cover_url        text,
  description      text,
  content          text     not null default '',
  rating           smallint check (rating >= 1 and rating <= 5),
  tags             text[]   not null default '{}',
  job_field        text[]   not null default '{}',
  published        boolean  not null default false,
  featured         boolean  not null default false,
  order_idx        integer  not null default 0,
  data             jsonb    not null default '{}',
  meta_title       text,
  meta_description text,
  og_image         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'books'
      AND policyname IN ('books_public_read', 'Public read published books')
  ) THEN
    CREATE POLICY "books_public_read"
      ON books FOR SELECT USING (published = true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'books'
      AND policyname IN ('books_auth_all', 'Authenticated full access')
  ) THEN
    CREATE POLICY "books_auth_all"
      ON books FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;
