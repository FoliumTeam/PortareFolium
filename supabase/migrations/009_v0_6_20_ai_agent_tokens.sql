-- 009 · v0.6.20 · ai_agent_tokens 테이블 생성
-- MCP Agent API 토큰 인증

CREATE TABLE IF NOT EXISTS ai_agent_tokens (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash     TEXT        NOT NULL UNIQUE,
  label          TEXT        NOT NULL,
  duration_min   INTEGER     NOT NULL,
  expires_at     TIMESTAMPTZ NOT NULL,
  revoked        BOOLEAN     NOT NULL DEFAULT FALSE,
  last_used_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE ai_agent_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.6.20"')
ON CONFLICT (key) DO UPDATE SET value = '"0.6.20"';
