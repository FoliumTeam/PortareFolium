-- 026 · v0.12.172 · post content chunk storage
-- 긴 post content chunk 저장

CREATE TABLE IF NOT EXISTS post_content_revisions (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id      UUID        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    content_hash TEXT        NOT NULL,
    content_size INTEGER     NOT NULL CHECK (content_size >= 0),
    chunk_size   INTEGER     NOT NULL CHECK (chunk_size > 0),
    chunk_count  INTEGER     NOT NULL CHECK (chunk_count > 0),
    active       BOOLEAN     NOT NULL DEFAULT FALSE,
    status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed')),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    committed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS post_content_chunks (
    revision_id UUID    NOT NULL REFERENCES post_content_revisions(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    content     TEXT    NOT NULL,
    checksum    TEXT    NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (revision_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_post_content_revisions_post_active
    ON post_content_revisions(post_id, active, committed_at DESC);

CREATE INDEX IF NOT EXISTS idx_post_content_chunks_revision_index
    ON post_content_chunks(revision_id, chunk_index);

ALTER TABLE post_content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_content_chunks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_content_revisions'
      AND policyname = 'post_content_revisions_public_read'
  ) THEN
    CREATE POLICY "post_content_revisions_public_read"
      ON post_content_revisions FOR SELECT USING (
        status = 'committed'
        AND active = true
        AND EXISTS (
          SELECT 1 FROM posts
          WHERE posts.id = post_content_revisions.post_id
            AND posts.published = true
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_content_revisions'
      AND policyname = 'post_content_revisions_auth_all'
  ) THEN
    CREATE POLICY "post_content_revisions_auth_all"
      ON post_content_revisions FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_content_chunks'
      AND policyname = 'post_content_chunks_public_read'
  ) THEN
    CREATE POLICY "post_content_chunks_public_read"
      ON post_content_chunks FOR SELECT USING (
        EXISTS (
          SELECT 1
          FROM post_content_revisions r
          JOIN posts ON posts.id = r.post_id
          WHERE r.id = post_content_chunks.revision_id
            AND r.status = 'committed'
            AND r.active = true
            AND posts.published = true
        )
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'post_content_chunks'
      AND policyname = 'post_content_chunks_auth_all'
  ) THEN
    CREATE POLICY "post_content_chunks_auth_all"
      ON post_content_chunks FOR ALL
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END $$;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.172"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.172"';

-- @sqlite-sql-start
-- DELETE FROM refuge_rows
-- WHERE table_name IN ('post_content_revisions', 'post_content_chunks');
-- @sqlite-sql-end
