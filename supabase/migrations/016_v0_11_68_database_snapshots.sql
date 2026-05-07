-- 016 · v0.11.68 · DB Snapshot 테이블 전환
-- database_snapshots 추가 + content_snapshots 제거

DROP TABLE IF EXISTS content_snapshots;
DROP FUNCTION IF EXISTS prune_snapshots();

CREATE TABLE IF NOT EXISTS database_snapshots (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    filename    TEXT        NOT NULL,
    data        JSONB       NOT NULL,
    table_names TEXT[]      NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_database_snapshots_created_at
    ON database_snapshots (created_at DESC);

ALTER TABLE database_snapshots ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'database_snapshots'
      AND policyname = 'database_snapshots_admin_all'
  ) THEN
    CREATE POLICY database_snapshots_admin_all ON database_snapshots
      FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION create_database_snapshot()
RETURNS TABLE (
    id UUID,
    filename TEXT,
    table_names TEXT[],
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    snapshot_data JSONB := '{}'::jsonb;
    current_rows JSONB;
    current_table TEXT;
    included_tables TEXT[] := ARRAY[]::TEXT[];
    snapshot_time TIMESTAMPTZ := NOW();
    snapshot_filename TEXT;
BEGIN
    snapshot_filename := 'supabase-db-snapshot-' ||
        to_char(snapshot_time AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24-MI-SS"Z"') ||
        '.json';

    FOR current_table IN
        SELECT tablename
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
          AND tablename <> 'database_snapshots'
        ORDER BY tablename
    LOOP
        EXECUTE format(
            'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM public.%I t',
            current_table
        )
        INTO current_rows;

        snapshot_data := snapshot_data ||
            jsonb_build_object(current_table, current_rows);
        included_tables := array_append(included_tables, current_table);
    END LOOP;

    RETURN QUERY
    INSERT INTO database_snapshots (filename, data, table_names, created_at)
    VALUES (snapshot_filename, snapshot_data, included_tables, snapshot_time)
    RETURNING
        database_snapshots.id,
        database_snapshots.filename,
        database_snapshots.table_names,
        database_snapshots.created_at;
END;
$$;

REVOKE ALL ON FUNCTION create_database_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_database_snapshot() TO service_role;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.11.68"')
ON CONFLICT (key) DO UPDATE SET value = '"0.11.68"';
