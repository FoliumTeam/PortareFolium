-- 021 · v0.12.85 · admin_login_attempts 테이블 추가
-- 관리자 로그인 rate limit 공유 저장소

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    key_hash         TEXT        PRIMARY KEY,
    count            INTEGER     NOT NULL DEFAULT 0,
    first_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    blocked_until    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_first_attempt_at
    ON admin_login_attempts (first_attempt_at);

ALTER TABLE admin_login_attempts ENABLE ROW LEVEL SECURITY;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.12.85"')
ON CONFLICT (key) DO UPDATE SET value = '"0.12.85"';
