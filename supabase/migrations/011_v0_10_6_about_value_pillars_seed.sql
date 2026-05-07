-- 011 · v0.10.6 · 랜딩 히어로 데이터 DB 시딩
-- about_data에 valuePillars + coreCompetencies 시딩

UPDATE about_data
SET data = data || '{
  "valuePillars": [
    {"label": "Pillar 1", "sub": "Sub 1", "description": "Admin에서 Value Pillar를 입력하세요"},
    {"label": "Pillar 2", "sub": "Sub 2", "description": "Admin에서 Value Pillar를 입력하세요"},
    {"label": "Pillar 3", "sub": "Sub 3", "description": "Admin에서 Value Pillar를 입력하세요"}
  ],
  "coreCompetencies": [
    {"title": "Value 1", "description": "Admin에서 Core Compentency를 입력하세요"},
    {"title": "Value 2", "description": "Admin에서 Core Compentency를 입력하세요"},
    {"title": "Value 3", "description": "Admin에서 Core Compentency를 입력하세요"}
  ]
}'::jsonb
WHERE NOT (data ? 'valuePillars');

INSERT INTO site_config (key, value)
VALUES ('db_schema_version', '"0.10.6"')
ON CONFLICT (key) DO UPDATE SET value = '"0.10.6"';
