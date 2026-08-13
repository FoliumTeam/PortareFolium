# Knowledge schema

## Wiki frontmatter

```yaml
---
schema_version: 1
id: wiki-<stable-id>
kind: source-summary | entity | concept | comparison | synthesis | open-question
summary: 한두 문장
tags: [example]
aliases: [alternate-name]
sources: [raw:.hive/knowledge/Raw/<source>/<revision>.<ext>#sha256:<digest>]
links: [related-page-id]
contradictions:
    - source_a: raw:<immutable-locator-a>
      source_b: raw:<immutable-locator-b>
      summary: 충돌하는 주장 요약
status: active | contradicted | open-question
created_at: RFC-3339
updated_at: RFC-3339
---
```

- `id`, tag와 link는 lowercase slug.
- tags, aliases, sources와 links는 lexicographic sort·unique 배열.
- body의 `[[page-id]]`도 backlink graph에 포함.
- active page는 immutable Raw locator citation을 하나 이상 포함.
- contradiction은 서로 다른 두 cited source를 함께 기록.
- `deprecated`, `superseded`, `archived` page의 active tree 잔류 금지.
- suppression `reason`은 삭제 prose가 아닌 shipped stable reason-code enum
  (`credential-erasure`, `duplicate`, `invalid`, `legal-erasure`, `obsolete`,
  `out-of-scope`, `retention-expired`, `superseded`, `user-request`).
- suppression locator는 `wiki:<id>`, `external:<id>` 또는 immutable Raw locator.
- 필요한 이력은 Git에서 조회.

Machine contract는 shipped `knowledge-page.schema.json`과
`knowledge-suppression.schema.json` 준수.
