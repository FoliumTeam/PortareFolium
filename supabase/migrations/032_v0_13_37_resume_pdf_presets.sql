-- 032 · v0.13.37 · 이력서 PDF 맞춤 설정 프리셋
-- 사이트 표시 설정과 별개로 PDF마다 바꾼 값만 저장. 관리자 전용 (공개 읽기 없음)
CREATE TABLE IF NOT EXISTS resume_pdf_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 120),
  source_kind text NOT NULL CHECK (source_kind IN ('job_field', 'application_profile')),
  job_field text NOT NULL CHECK (job_field ~ '^[A-Za-z0-9_-]{1,64}$'),
  application_profile_id uuid,
  lang text NOT NULL CHECK (lang IN ('ko', 'ja')),
  variant text NOT NULL CHECK (variant IN ('C', 'F')),
  options jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((source_kind = 'application_profile') = (application_profile_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS resume_pdf_presets_source_idx
  ON resume_pdf_presets (source_kind, job_field, application_profile_id, updated_at DESC);

DROP TRIGGER IF EXISTS resume_pdf_presets_updated_at ON resume_pdf_presets;
CREATE TRIGGER resume_pdf_presets_updated_at BEFORE UPDATE ON resume_pdf_presets
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE resume_pdf_presets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE resume_pdf_presets FROM anon, authenticated;
GRANT ALL ON TABLE resume_pdf_presets TO service_role;

INSERT INTO site_config (key, value) VALUES ('db_schema_version', '"0.13.37"')
ON CONFLICT (key) DO UPDATE SET value = '"0.13.37"';

-- @sqlite-sql-start
-- INSERT INTO refuge_rows (table_name, identity, row_json, updated_at)
-- VALUES ('site_config', 'db_schema_version', '{"key":"db_schema_version","value":"0.13.37"}', CURRENT_TIMESTAMP)
-- ON CONFLICT(table_name, identity) DO UPDATE SET row_json = excluded.row_json, updated_at = excluded.updated_at;
-- @sqlite-sql-end
