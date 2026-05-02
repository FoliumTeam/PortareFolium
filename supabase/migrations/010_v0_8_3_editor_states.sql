-- 010 · v0.8.3 · 에디터 상태 보존 테이블
-- editor_states

CREATE TABLE IF NOT EXISTS editor_states (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type  TEXT        NOT NULL,
    entity_slug  TEXT        NOT NULL,
    label        TEXT        NOT NULL,
    content      TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editor_states_entity
    ON editor_states (entity_type, entity_slug, created_at DESC);

ALTER TABLE editor_states ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'editor_states_admin_all'
  ) THEN
    CREATE POLICY editor_states_admin_all ON editor_states
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.8.3"')
ON CONFLICT (key) DO UPDATE SET value = '"0.8.3"';
