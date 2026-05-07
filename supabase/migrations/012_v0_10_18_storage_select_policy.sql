-- 012 · v0.10.18 · Storage 파일 목록 정책 보안 강화
-- images bucket SELECT 정책: public → authenticated only
-- Manual note: storage.objects 테이블은 supabase_storage_admin 소유 — DDL 정책 변경은 Supabase Dashboard SQL Editor에서만 실행 가능

DROP POLICY IF EXISTS images_public_read ON storage.objects;

CREATE POLICY images_authenticated_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'images');

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.10.18"')
ON CONFLICT (key) DO UPDATE SET value = '"0.10.18"';
