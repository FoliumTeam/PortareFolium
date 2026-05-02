-- 017 · v0.11.72 · Gantt Chart archive 테이블 추가
-- CSV 기반 Gantt Chart archive 저장

CREATE TABLE IF NOT EXISTS gantt_chart_archives (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    source_filename TEXT        NOT NULL,
    csv_content     TEXT        NOT NULL,
    tasks           JSONB       NOT NULL DEFAULT '[]'::jsonb,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gantt_chart_archives_created_at
    ON gantt_chart_archives (created_at DESC);

ALTER TABLE gantt_chart_archives ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gantt_chart_archives'
      AND policyname = 'gantt_chart_archives_admin_all'
  ) THEN
    CREATE POLICY gantt_chart_archives_admin_all ON gantt_chart_archives
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_gantt_chart_archives_updated_at ON gantt_chart_archives;

CREATE TRIGGER trg_gantt_chart_archives_updated_at
    BEFORE UPDATE ON gantt_chart_archives
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.72"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.72"';
