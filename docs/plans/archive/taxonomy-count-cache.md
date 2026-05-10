# Taxonomy count cache 도입 계획

**Status:** Inactive / Deferred  
**Trigger:** 포스트 수가 수천 개 이상으로 증가하거나 TagsPanel 초기 로딩에서 `posts(category, tags)` 전체 조회가 병목으로 확인될 때

## 배경

현재 TagsPanel은 초기 로딩 시 모든 포스트의 `category`, `tags`만 조회한 뒤 앱 서버에서 태그/카테고리 사용 수를 계산한다. `content`를 읽지 않으므로 당장 부담은 낮지만, 포스트 수가 커질수록 TagsPanel 진입마다 `O(posts)` 읽기가 반복된다.

## 목표

- TagsPanel 초기 로딩에서 `posts` 전체 스캔을 제거한다.
- 태그/카테고리 사용 수 조회를 `O(taxonomies)` 또는 `O(changed taxonomies)`에 가깝게 낮춘다.
- 포스트 생성/수정/삭제 시점에만 count 갱신 비용을 지불한다.

## 후보 설계

### Option A: Materialized view

`posts`에서 category와 `unnest(tags)`를 집계하는 materialized view를 만든다.

장점:
- 구현이 비교적 단순하다.
- count 계산 로직이 DB에 모인다.

단점:
- refresh 비용이 필요하다.
- 실시간성이 필요하면 refresh 시점 설계가 필요하다.
- refresh가 결국 전체 집계일 수 있다.

### Option B: Count cache table

예시:

```sql
CREATE TABLE taxonomy_usage_counts (
    kind TEXT NOT NULL CHECK (kind IN ('tag', 'category')),
    key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (kind, key)
);
```

포스트 생성/수정/삭제 시 이전 taxonomy set과 새 taxonomy set의 diff를 계산해 count를 증감한다.

장점:
- TagsPanel count 조회가 매우 가볍다.
- 읽기 비용이 포스트 수가 아니라 taxonomy 수에 비례한다.
- 포스트 수가 커질수록 이점이 커진다.

단점:
- 포스트 write path가 복잡해진다.
- diff 갱신 로직과 정합성 검증이 필요하다.
- DB trigger 또는 application write path 중 책임 위치를 결정해야 한다.

## 권장 방향

장기적으로는 **Option B: Count cache table**을 우선 검토한다. 이 프로젝트의 TagsPanel은 admin read UI이고 count는 자주 조회될 수 있지만, 포스트 write는 상대적으로 덜 빈번하기 때문이다.

## 구현 단계

1. 현재 데이터 기준 backfill SQL 작성
   - category: `GROUP BY category`
   - tag: `unnest(tags)` 후 `GROUP BY tag`
2. `taxonomy_usage_counts` table migration 추가
3. 포스트 저장/삭제 action의 taxonomy diff 지점 식별
4. application-level 갱신 함수 작성
   - `incrementTaxonomyUsage(kind, key, delta)`
   - zero 이하 count 정리 정책 결정
5. TagsPanel bootstrap을 `posts(category, tags)` 전체 조회에서 `taxonomy_usage_counts` 조회로 교체
6. 정합성 검증용 admin-only repair action 또는 SQL 작성
7. 테스트 추가
   - post create/update/delete 시 count 증감
   - tag rename/delete와 category rename/delete 시 count 유지/이관

## 검증 기준

- TagsPanel 초기 로딩에서 `posts` 전체 조회가 사라진다.
- count 값이 현재 lazy post list 결과와 일치한다.
- 포스트 수정으로 tag/category가 변경될 때 count가 정확히 증감한다.
- repair SQL 또는 admin action으로 cache를 재생성할 수 있다.

## 보류 이유

현재 포스트 규모에서는 단순 집계 방식의 운영 부담이 낮다. 우선 GIN index, preview limit, 정렬 제거로 reveal list 비용을 줄이고, count cache는 실제 데이터 증가 또는 성능 지표 악화가 확인될 때 도입한다.
