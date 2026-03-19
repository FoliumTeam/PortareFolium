-- v0.6.4_exec_sql.sql
-- exec_sql: service_role 전용 DDL 실행 함수
--
-- 용도: Next.js 전환 후 서버 사이드 자동 마이그레이션에서 DDL 구문 실행
-- 보안: PUBLIC 권한 제거, service_role 에만 EXECUTE 권한 부여
--
-- 참고: migration-whole.sql 을 실행한 사용자는 이미 적용됨
--       직접 setup.sql 을 실행한 신규 사용자도 이미 적용됨

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    EXECUTE sql;
END;
$$;

REVOKE ALL ON FUNCTION exec_sql(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION exec_sql(text) TO service_role;
