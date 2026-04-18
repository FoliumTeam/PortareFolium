# IMAGE_ORPHAN_CLEANUP

## 개요

`RichMarkdownEditor`에서 본문 이미지가 삭제되거나, snapshot이 삭제되거나, snapshot이 전혀 없는 엔티티를 다시 열었을 때 R2에 남은 true-orphan 이미지를 정리하는 구조다.

여기서 "true-orphan"은 아래 어떤 곳에서도 더 이상 참조되지 않는 이미지다.

- 현재 editor content
- thumbnail field
- 해당 엔티티의 surviving snapshot 전체
- 같은 base를 공유하는 sidecar 파일

cleanup은 save 시점에 돌지 않는다. action-triggered 방식으로만 돈다.

## 대상 범위

현재 cleanup은 `post`, `portfolio`만 대상으로 한다.

- `blog/{slug}/...`
- `portfolio/{slug}/...`

`books`는 현재 범위에 포함되지 않는다.

## 핵심 파일

- `src/components/admin/RichMarkdownEditor.tsx`
- `src/components/admin/EditorStatePreservation.tsx`
- `src/components/admin/panels/PostsPanel.tsx`
- `src/components/admin/panels/PortfolioPanel.tsx`
- `src/lib/orphan-cleanup.ts`
- `src/lib/snapshot-cleanup.ts`
- `src/lib/image-upload.ts`
- `src/app/api/storage-ops/route.ts`

## true-orphan 판정 규칙

cleanup은 곧바로 "삭제된 것처럼 보이는 URL"을 지우지 않는다. 항상 현재 살아 있는 reference를 다시 모은 다음에 최종 삭제 여부를 결정한다.

reference set 구성 순서:

1. `currentContent`에서 이미지 URL 추출
2. `thumbnail`에서 이미지 URL 추출
3. `editor_states`의 surviving snapshot content 전부에서 이미지 URL 추출
4. 각 URL을 `baseKey()`로 정규화

정규화 이유:

- `foo.webp`
- `foo.thumb.webp`
- `foo.poster.webp`

위 3개는 같은 base lifecycle로 본다. base가 살아 있으면 sidecar도 같이 보존한다.

## URL 추출 방식

`src/lib/orphan-cleanup.ts`의 `extractKeysFromText(text, folderPath)`가 텍스트 전체에서 `folderPath` 하위 URL을 추출한다.

이 방식은 아래 표현을 모두 커버한다.

- 일반 markdown image `![](url)`
- plain URL
- `ImageGroup`의 `images='[...]'`
- snapshot content 안의 과거 본문 문자열

즉, cleanup은 특정 markdown 문법만 보지 않는다. 문자열 내부의 실제 R2 URL을 기준으로 판정한다.

## Trigger 1

본문에서 이미지가 제거될 때 실행되는 경로다.

위치:

- `src/components/admin/RichMarkdownEditor.tsx`

동작:

1. `onUpdate`에서 editor doc 기준 before/after 이미지 URL set 비교
2. 제거된 URL을 `removedQueueRef`에 누적
3. 1000ms global debounce
4. `onImagesRemoved(urls)` 호출
5. 상위 panel이 `cleanupTrueOrphans({ candidates })` 호출

특징:

- save와 무관
- 여러 삭제가 1초 안에 연속 발생하면 한 번으로 합쳐짐
- 실제 삭제 전에도 current content, thumbnail, snapshot 전체를 다시 조회함

### Trigger 1에서 수집하는 이미지 종류

`collectImageSrcs()`는 아래 둘 다 수집한다.

- 일반 `image` node의 `src`
- `imageGroup` node의 `images[]`

따라서 `ImageGroup` 내부 이미지 삭제나 `ImageGroup` 전체 삭제도 Trigger 1 대상이다.

## Trigger 2

snapshot 삭제 후 실행되는 경로다.

위치:

- `src/components/admin/EditorStatePreservation.tsx`
- `src/lib/snapshot-cleanup.ts`

포함되는 삭제 시점:

- auto-save eviction
- 개별 snapshot 삭제
- bulk snapshot 삭제
- init 과정에서 기존 snapshot 정리

동작:

1. snapshot delete 이후 cleanup helper 호출
2. surviving snapshot 기준으로 다시 reference set 구성
3. 현재 content, thumbnail, surviving snapshot 어디에도 없는 base만 삭제

의미:

snapshot이 마지막 참조를 쥐고 있던 이미지라도, snapshot이 삭제된 뒤 다른 reference가 없다면 이 경로에서 정리된다.

## Trigger 3

snapshot이 전혀 없는 엔티티를 editor에서 열 때 실행되는 safety-net 경로다.

위치:

- `src/components/admin/panels/PostsPanel.tsx`
- `src/components/admin/panels/PortfolioPanel.tsx`
- `src/lib/snapshot-cleanup.ts`

동작:

1. `editor_states.count` 확인
2. count가 `0`일 때만 cleanup 실행
3. entity folder 전체를 대상으로 true-orphan sweep 실행

의미:

중간에 snapshot이 외부 요인으로 지워졌거나, 과거 cleanup 실패로 stale 파일이 남아 있어도 editor open 시 복구 가능하다.

## source mode와 orphan cleanup

source mode에서 `ImageGroup`을 지우는 경우도 cleanup 대상에 포함된다.

경로:

1. source textarea에서 `ImageGroup` JSX/directive 삭제
2. `exitSourceMode()`에서 source 문자열을 다시 editor content로 반영
3. 이후 `onUpdate` 실행
4. `collectImageSrcs()`가 이전 doc의 `imageGroup.images[]`와 새 doc의 이미지 목록을 비교
5. 제거된 child image URL이 Trigger 1 후보로 잡힘

또한 Trigger 2, Trigger 3는 문자열 기반 추출을 사용하므로, source mode에서 group이 제거되어 content 문자열에 child URL이 사라진 상태도 정확히 반영한다.

주의:

source textarea에서 지운 직후, 아직 WYSIWYG로 돌아오기 전에는 editor doc가 갱신되지 않았으므로 Trigger 1이 즉시 발화하지는 않는다. 하지만 source mode 종료 후 Trigger 1이 정상 작동하고, 이후 Trigger 2/T3도 동일하게 orphan 판정에 반영한다.

## ImageGroup과 cleanup

현재 `ImageGroup` 관련 cleanup 보장은 아래와 같다.

- `ImageGroup` 전체 삭제
    - group child 이미지 URL 전체가 제거된 것으로 계산
- `ImageGroup` 내부 개별 이미지 삭제
    - `images[]` 배열 diff로 제거된 URL만 후보 계산
- source mode에서 `ImageGroup` 삭제
    - source → WYSIWYG 재적용 후 Trigger 1 반영
    - 또는 Trigger 2/T3에서 문자열 기준 반영

## 삭제 안전 장치

cleanup은 불확실할 때 지우지 않는다.

안전 장치:

- `listStorageFiles()` 실패 시 skip
- listed 결과가 비어 있으면 skip
- `referencedBases.size === 0`인데 `currentContent`는 비어 있지 않으면 skip
- `candidates`가 주어진 경우 그 범위만 검사

즉, parser 이상이나 일시적 조회 실패 때 공격적으로 지우지 않도록 설계되어 있다.

## baseKey 규칙

`src/lib/orphan-cleanup.ts`의 `baseKey()`는 아래 규칙으로 정규화한다.

- `.thumb.webp` 제거
- `.poster.webp` 제거
- 마지막 확장자 제거

예:

- `blog/foo/a.webp` → `blog/foo/a`
- `blog/foo/a.thumb.webp` → `blog/foo/a`
- `blog/foo/a.poster.webp` → `blog/foo/a`

이 규칙 때문에 base 하나가 살아 있으면 sidecar도 같이 살아남는다.

## save와 분리한 이유

save 시점 cleanup은 UX를 망가뜨릴 가능성이 크다.

- save latency 증가
- 임시 삭제 후 undo 같은 편집 흐름과 충돌
- autosave와 storage delete가 강하게 결합

그래서 cleanup은 save pipeline에서 분리했고, 명시적 action과 editor open safety-net에서만 실행한다.

## 검증 포인트

확인할 항목:

- 본문 일반 이미지 삭제 후 R2 key 삭제
- 같은 이미지를 두 번 참조할 때 한 번만 삭제하면 R2 key 보존
- `ImageGroup` 내부 이미지 삭제 후 해당 URL만 cleanup 후보 계산
- `ImageGroup` 전체 삭제 후 child URL 전체 cleanup 후보 계산
- source mode에서 `ImageGroup` 삭제 후 source 종료 시 child URL cleanup 후보 계산
- snapshot이 참조 중인 이미지가 있으면 삭제되지 않음
- snapshot 삭제 후 마지막 참조가 사라지면 삭제됨
- snapshot이 없는 엔티티 open 시 stale key sweep
