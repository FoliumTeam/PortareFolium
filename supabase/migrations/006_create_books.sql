-- 006_create_books.sql
-- 도서 리뷰 테이블 생성

CREATE TABLE IF NOT EXISTS books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text UNIQUE NOT NULL,
    title text NOT NULL,
    author text,
    cover_url text,
    description text,
    content text NOT NULL DEFAULT '',
    rating smallint CHECK (rating >= 1 AND rating <= 5),
    tags text[] NOT NULL DEFAULT '{}',
    job_field text[] NOT NULL DEFAULT '{}',
    published boolean NOT NULL DEFAULT false,
    featured boolean NOT NULL DEFAULT false,
    order_idx integer NOT NULL DEFAULT 0,
    data jsonb NOT NULL DEFAULT '{}',
    meta_title text,
    meta_description text,
    og_image text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- 익명 사용자: published된 도서만 조회
CREATE POLICY "Public read published books"
    ON books FOR SELECT TO anon
    USING (published = true);

-- 인증된 사용자: 전체 접근
CREATE POLICY "Authenticated full access"
    ON books FOR ALL TO authenticated
    USING (true) WITH CHECK (true);
