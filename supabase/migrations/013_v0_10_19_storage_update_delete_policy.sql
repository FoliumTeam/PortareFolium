-- 013 · v0.10.19 · Storage UPDATE/DELETE 정책 추가
-- images bucket에셋 이전(move) + 삭제(remove) 권한
-- Manual note: storage.objects DDL 정책 — Supabase Dashboard SQL Editor에서 실행

CREATE POLICY images_authenticated_update ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'images');

CREATE POLICY images_authenticated_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'images');

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.10.19"')
ON CONFLICT (key) DO UPDATE SET value = '"0.10.19"';
