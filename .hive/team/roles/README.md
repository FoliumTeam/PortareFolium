# Persistent roles

지속형 팀원은 영구 process가 아니라 stable role identity와 갱신 가능한 handoff로 표현.

Setup은 승인한 `.hive/config/role-seeds.yml` entry마다
`<role-id>.md`를 staging에서 materialize. Materialize 이후 이 Markdown이
role identity의 runtime 정본이며 seed의 team member identity 직접 사용 금지.

각 role 문서의 최소 항목:

- `role_id`
- 책임과 제외 범위
- 필요한 context selector
- 허용 도구와 쓰기 범위
- 현재 assignment와 handoff
- 검증 책임

실제 session과 subagent lifecycle은 선택한 host 또는 OMX/OMC가 소유.
Reconfigure와 update의 assignment, handoff, 사용자 body 자동 overwrite 금지.
