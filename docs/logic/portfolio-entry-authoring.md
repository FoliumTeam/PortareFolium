# Portfolio Entry Authoring Guide

이 문서는 새로운 portfolio entry를 recruiter-first case study 형식으로 작성하고 Published 상태로 전환하기 위한 전체 절차를 설명한다. 신규 entry는 `caseStudyVersion: 2`를 사용한다.

일반적인 entry 작성은 source code 변경이 아니다. `/admin`의 Portfolio editor 또는 MCP의 `create_portfolio_item`·`update_portfolio_item`으로 `portfolio_items` row를 작성하면 된다. 새 field, media 형식, link 종류 또는 rendering section을 추가할 때만 application code 변경이 필요하다.

## 1. 최종 화면에서 전달해야 하는 정보

Recruiter가 다음 내용을 순서대로 빠르게 확인할 수 있어야 한다.

1. 어떤 프로젝트인지: title, one-line pitch, engine, platform
2. 어떤 조건에서 진행했는지: 기간, team size, 역할
3. 본인이 실제로 맡은 것은 무엇인지: ownership
4. 어떤 결과를 만들었는지: outcomes와 evidence
5. 결과를 확인할 수 있는지: gallery, play/release/source link
6. 중요한 문제를 어떻게 해결했는지: 2~3개의 Deep Dive
7. 협업 프로젝트라면 누구와 함께했는지: credits

Public page의 주요 section 순서는 hero → project facts → ownership → outcomes → actions → evidence gallery → Deep Dive → devlogs → credits다. `featured: true`인 Published entry는 Selected Work에, 나머지는 Other Work에 표시된다. 각 그룹에서는 `order_idx`가 낮은 entry가 먼저 표시된다.

## 2. 작성 전에 준비할 context packet

정보를 editor에 바로 입력하지 말고 아래 context를 먼저 한곳에 모은다. 확인되지 않은 수치나 기여를 추측해서 작성하지 않는다.

### 프로젝트 기본 정보

| 항목            | 준비할 내용                                               |
| --------------- | --------------------------------------------------------- |
| Identity        | 정식 프로젝트명, 영문 또는 kebab-case slug, 한 문장 설명  |
| Classification  | `game` 또는 `web`, tags, engine, target platforms         |
| Timeline        | 시작일, 종료일 또는 ongoing 여부                          |
| Team            | team size, 본인의 공식 역할, collaborator 이름과 역할     |
| Availability    | play, demo, release, source URL의 공개 가능 여부          |
| Confidentiality | NDA, 비공개 source, 사용자 정보, 회사 내부 지표 포함 여부 |

### 개인 기여 자료

`ownership`은 팀 전체가 한 일을 쓰는 영역이 아니다. 본인이 직접 설계·구현·검증한 책임을 동사 중심으로 1~5개 준비한다.

좋은 예:

- Unreal Engine 5 Gameplay Ability System 기반 전투 상태 전이 설계 및 구현
- animation notify와 hit detection 사이의 frame timing 문제 진단 및 수정
- 4인 팀의 Git branching, code review, build integration 담당

피해야 할 예:

- 게임 개발 참여
- 프로그래밍 담당
- 여러 기능 구현

### 결과와 근거

`outcomes`는 최대 3개다. 각 항목은 결과와 그 결과를 확인한 방법을 함께 준비한다.

| 결과 유형         | 결과 예시                            | 근거 예시                                   |
| ----------------- | ------------------------------------ | ------------------------------------------- |
| Performance       | frame time 또는 memory 감소          | Unreal Insights capture, profiler 전후 측정 |
| Reliability       | crash, desync, race condition 제거   | 재현 test, QA session, automated test       |
| Delivery          | release 또는 showcase 완료           | store page, build, event selection          |
| Player experience | 조작 지연·실패율 개선                | playtest 기록, telemetry, 사용자 feedback   |
| Team impact       | 반복 작업 또는 integration 시간 감소 | tool 사용 전후 시간, build log              |

정확한 숫자가 없다면 숫자를 만들지 않는다. 대신 검증 가능한 상태 변화와 확인 방법을 쓴다.

### Deep Dive 후보

서로 다른 2개, 최대 3개의 기술적 의사결정을 고른다. 각 후보마다 다음 질문에 답할 수 있어야 한다.

- Problem: 사용자 또는 개발 과정에서 실제로 무엇이 실패했는가
- Decision: 여러 선택지 중 무엇을 선택했고 왜 선택했는가
- Implementation: 본인이 작성한 핵심 구조, algorithm, data flow 또는 code는 무엇인가
- Result: 무엇으로 성공 여부를 확인했는가
- Trade-off: 비용, 제한, 미해결 위험 또는 다음 개선점은 무엇인가

긴 개발 일지를 요약하는 것이 아니라 의사결정의 원인과 결과를 보여주는 것이 목적이다.

### Media manifest

각 media가 어떤 주장을 증명하는지 먼저 정리한다.

| 순서   | 목적                                 | 필요한 정보                         |
| ------ | ------------------------------------ | ----------------------------------- |
| 1      | 대표 장면 또는 완성된 결과           | 16:9 image 또는 poster가 있는 video |
| 2      | 핵심 mechanic·tool·system            | URL, alt, evidence caption          |
| 3      | before/after 또는 debugging evidence | URL, alt, 측정 결과 caption         |
| 4 이후 | 보조 evidence                        | 중복되지 않는 장면만 추가           |

권장 사항:

- 첫 media는 card와 detail hero에서도 이해 가능한 대표 장면으로 선택
- caption은 화면 설명보다 해당 화면이 증명하는 결과를 명시
- alt는 image 안의 핵심 장면과 의미를 설명
- 같은 장면의 미세한 변형을 여러 장 넣지 않기
- 얼굴, 계정명, token, 사내 dashboard 등 민감 정보 제거
- 자신이 제작하지 않은 asset은 credit과 사용 권한 확인

Admin image uploader는 `portfolio/<slug>/` 아래에 image를 저장하며 현재 video upload를 지원하지 않는다. Video entry는 허용된 R2 host에 이미 존재하는 HTTPS URL과 poster image URL을 준비해야 한다.

## 3. Entry data contract

### Row-level fields

| Field              | 필수 여부         | 용도와 작성 규칙                                                      |
| ------------------ | ----------------- | --------------------------------------------------------------------- |
| `slug`             | 저장 필수         | unique URL key. 새 entry는 영문 kebab-case 권장. Admin UI 최대 80자   |
| `title`            | 저장 필수         | 프로젝트의 공식 이름                                                  |
| `description`      | 권장              | card fallback 요약. one-line pitch와 중복하지 말고 프로젝트 맥락 보충 |
| `tags`             | 권장              | 기술·장르 분류. comma-separated UI, DB에서는 `string[]`               |
| `thumbnail`        | 조건부            | gallery가 없을 때 primary media fallback. image URL 사용              |
| `content`          | v2 Published 필수 | 정확히 2~3개의 Deep Dive를 담는 MDX                                   |
| `featured`         | 선택              | `true`면 Selected Work, `false`면 Other Work                          |
| `order_idx`        | 권장              | 그룹 안의 표시 순서. 낮은 숫자가 먼저 표시                            |
| `published`        | 필수              | 새 entry는 항상 `false`로 시작                                        |
| `job_field`        | 권장              | 현재 공개 filter용 `game` 또는 `web`                                  |
| `meta_title`       | 선택              | 비우면 title 사용                                                     |
| `meta_description` | 권장              | 검색 결과와 공유 설명                                                 |
| `og_image`         | 권장              | SNS 공유 image. 비우면 다른 대표 image fallback 사용                  |

### Common project fields inside `data`

| Field             | 형식                          | 설명                                                             |
| ----------------- | ----------------------------- | ---------------------------------------------------------------- |
| `startDate`       | `YYYY-MM-DD` string           | 프로젝트 시작일                                                  |
| `endDate`         | `YYYY-MM-DD` string 또는 생략 | ongoing이면 생략                                                 |
| `goal`            | string                        | 프로젝트 또는 제품 목표                                          |
| `role`            | string                        | 공식 역할명                                                      |
| `teamSize`        | number                        | 본인을 포함한 전체 인원                                          |
| `github`          | URL                           | legacy-compatible source URL. v2에서는 `links`도 작성            |
| `liveUrl`         | URL                           | legacy-compatible live URL. v2에서는 `links` 사용 권장           |
| `accomplishments` | `string[]`                    | legacy-compatible 성과. v2에서는 `outcomes` 사용                 |
| `jobField`        | string 또는 `string[]`        | 다중 분야 metadata. row-level `job_field`가 공개 filter에서 우선 |

### Required v2 fields inside `data`

| Field              | 형식과 제한                          | Published 조건                              |
| ------------------ | ------------------------------------ | ------------------------------------------- |
| `caseStudyVersion` | 정확히 number `2`                    | 필수                                        |
| `oneLinePitch`     | string, 최대 180자                   | non-empty                                   |
| `engine`           | string, 최대 80자                    | non-empty                                   |
| `platforms`        | string array, 최대 5개, 항목당 80자  | 최소 1개                                    |
| `ownership`        | string array, 최대 5개, 항목당 160자 | 최소 1개                                    |
| `outcomes`         | object array, 최대 3개               | 유효한 result 최소 1개                      |
| `gallery`          | image/video array, 최대 8개          | gallery 또는 thumbnail로 primary media 필요 |
| `links`            | object array, 최대 4개               | 선택                                        |
| `devlogs`          | object array, 최대 5개               | 선택                                        |
| `credits`          | object array, 최대 20개              | `teamSize > 1`이면 최소 1개                 |

### Nested object formats

```json
{
    "outcomes": [
        {
            "result": "측정되거나 확인된 결과, 최대 180자",
            "evidence": "측정 방법 또는 확인 가능한 근거, 최대 240자"
        }
    ],
    "gallery": [
        {
            "type": "image",
            "src": "/relative/path.webp",
            "alt": "image가 보여주는 장면, 최대 180자",
            "caption": "이 장면이 증명하는 내용, 최대 240자"
        },
        {
            "type": "video",
            "src": "https://configured-r2-host.example/video.mp4",
            "poster": "/relative/poster.webp",
            "alt": "video 내용 설명",
            "caption": "video가 증명하는 동작 또는 결과"
        }
    ],
    "links": [
        {
            "kind": "play",
            "url": "https://example.com/play",
            "label": "Play Build"
        }
    ],
    "devlogs": [
        {
            "title": "관련 기술 기록",
            "url": "/blog/related-devlog"
        }
    ],
    "credits": [
        {
            "name": "협업자 이름",
            "role": "담당 역할",
            "url": "https://optional-profile.example"
        }
    ]
}
```

`links.kind`는 `demo`, `play`, `release`, `source` 중 하나다. Link URL은 `/`로 시작하는 same-origin relative URL 또는 HTTPS URL만 허용한다. Media URL은 relative URL 또는 `R2_PUBLIC_URL`과 hostname이 같은 HTTPS URL만 허용한다. URL 최대 길이는 2048자다. Image에는 `poster`를 넣지 않고 video에는 반드시 `poster`를 넣는다.

## 4. Deep Dive MDX contract

`content`에는 정확히 2개 또는 3개의 level-2 heading만 사용한다. 각 `##` section은 하나의 Deep Dive로 계산되므로 서론·결론에 별도의 `##`를 만들지 않는다.

각 Deep Dive 안에는 아래 level-3 heading이 영문 그대로, 같은 순서로 모두 존재해야 한다.

1. `### Problem`
2. `### Decision`
3. `### Implementation`
4. `### Result`
5. `### Trade-off`

복사 가능한 template:

````mdx
## [핵심 기술 의사결정 1]

### Problem

[어떤 사용자·system 문제가 어떤 조건에서 발생했는지 2~4문장]

### Decision

[검토한 선택지, 최종 선택, 선택 기준과 이유]

### Implementation

[본인이 구현한 data flow와 핵심 구조]

```text
[의사결정을 이해하는 데 꼭 필요한 10~30줄의 code 또는 pseudocode]
```

### Result

[검증 방법, 전후 비교, 측정값 또는 release 결과]

### Trade-off

[남은 비용, 적용 범위, 실패 가능성 또는 후속 개선]

## [핵심 기술 의사결정 2]

### Problem

[문제]

### Decision

[결정과 이유]

### Implementation

[핵심 구현]

### Result

[검증 결과]

### Trade-off

[trade-off]
````

Code는 구현량을 보여주기 위해 길게 붙이지 않는다. 의사결정과 ownership을 증명하는 최소 부분만 사용하고 secret, private repository path, 내부 endpoint, 사용자 data를 제거한다. MDX는 trusted admin/MCP content로 실행되므로 외부 제공 JSX, `import`, `<script>` 또는 검증하지 않은 component를 삽입하지 않는다.

## 5. Complete v2 example

아래 payload는 값의 위치와 형식을 보여주는 예시다. 실제 결과, 이름, URL로 교체한 뒤 사용한다.

```json
{
    "slug": "arena-combat-prototype",
    "title": "Arena Combat Prototype",
    "description": "근접 전투의 입력 반응성과 animation state 안정성을 검증한 팀 프로젝트",
    "tags": ["Unreal Engine 5", "C++", "Gameplay Ability System"],
    "thumbnail": "/portfolio/arena-combat-prototype/hero.webp",
    "content": "## Combat state authority\n\n### Problem\n\n[...]\n\n### Decision\n\n[...]\n\n### Implementation\n\n[...]\n\n### Result\n\n[...]\n\n### Trade-off\n\n[...]\n\n## Hit detection timing\n\n### Problem\n\n[...]\n\n### Decision\n\n[...]\n\n### Implementation\n\n[...]\n\n### Result\n\n[...]\n\n### Trade-off\n\n[...]",
    "featured": true,
    "order_idx": 0,
    "published": false,
    "job_field": "game",
    "meta_title": "Arena Combat Prototype — Gameplay Programmer",
    "meta_description": "Unreal Engine 5 C++ 전투 system의 상태 전이와 hit detection 문제를 해결한 case study",
    "og_image": "/portfolio/arena-combat-prototype/hero.webp",
    "data": {
        "caseStudyVersion": 2,
        "startDate": "2026-01-01",
        "endDate": "2026-03-31",
        "goal": "반응성이 높고 확장 가능한 arena combat vertical slice 제작",
        "role": "Gameplay Programmer",
        "teamSize": 4,
        "jobField": ["game"],
        "oneLinePitch": "측정 가능한 전투 반응성과 안정적인 animation state를 만든 Unreal Engine 5 vertical slice",
        "engine": "Unreal Engine 5",
        "platforms": ["Windows"],
        "ownership": [
            "Gameplay Ability System 기반 combat state와 cancel rule 설계",
            "animation notify 기반 hit detection과 damage pipeline 구현"
        ],
        "outcomes": [
            {
                "result": "[검증된 결과로 교체]",
                "evidence": "[profiler, playtest, release page 등 실제 근거로 교체]"
            }
        ],
        "gallery": [
            {
                "type": "image",
                "src": "/portfolio/arena-combat-prototype/hero.webp",
                "alt": "arena에서 근접 전투를 수행하는 player character",
                "caption": "최종 combat loop와 hit reaction이 함께 동작하는 build"
            }
        ],
        "links": [
            {
                "kind": "play",
                "url": "https://example.com/build",
                "label": "Play Build"
            },
            {
                "kind": "source",
                "url": "https://github.com/example/repository",
                "label": "Source"
            }
        ],
        "devlogs": [],
        "credits": [
            {
                "name": "[협업자 이름]",
                "role": "[담당 역할]"
            }
        ]
    }
}
```

## 6. Admin authoring workflow

1. `/admin`에 credentials로 로그인한다.
2. Portfolio panel에서 **사례 연구 템플릿으로 생성**을 선택한다.
3. title을 입력하고 자동 생성된 slug를 확인한다. Slug는 asset folder `portfolio/<slug>/`에도 사용되므로 첫 저장 전에 확정하는 것이 좋다.
4. **설정**에서 기본 정보, project 상세, v2 case study field, SEO, category를 작성한다.
5. Rich Markdown Editor의 template에 2~3개의 Deep Dive를 작성한다.
6. Editor에 image를 upload하고 필요한 URL을 thumbnail, gallery, OG image에 연결한다.
7. `published: false` 상태로 **저장**한다. 새 entry는 첫 수동 저장 전까지 auto-save되지 않으며 첫 저장 이후 auto-save가 동작한다.
8. 저장된 field와 문구를 다시 fact-check한다. 특히 ownership, outcome, credit, 외부 URL을 확인한다.
9. Published toggle을 켠다. Server가 v2 publication contract를 검사하며 실패하면 누락 field와 Deep Dive 오류를 반환한다.
10. Published 이후 **미리보기**를 열어 desktop과 mobile에서 card, hero, action, gallery, content, credits를 확인한다.
11. Selected Work에 둘 entry만 `featured: true`로 지정하고 `order_idx`를 조정한다.

현재 public query는 `published: true`만 허용하므로 Draft URL은 404가 되고 Admin 미리보기 button도 Draft에서는 비활성화된다. Public 공개 없이 Draft를 보여주는 별도 preview route는 없다. Published 전 visual 확인이 필요하면 local/refuge data 또는 별도 preview 기능을 구현해야 한다.

## 7. MCP authoring workflow

Endpoint는 `/api/mcp`이며 Bearer token이 필요하다. Token을 문서, source code, shell history 또는 entry content에 저장하지 않는다.

1. `tools/list`로 현재 tool과 schema를 확인한다.
2. 기존 entry를 수정한다면 `get_portfolio_item`으로 현재 row를 먼저 읽는다.
3. `create_portfolio_item`으로 `published: false` Draft를 만든다.
4. `update_portfolio_item`으로 content와 data를 단계적으로 보강한다.
5. 다시 `get_portfolio_item`으로 저장 결과를 확인한다.
6. 모든 Published 조건을 점검한 뒤 마지막 별도 호출에서 `published: true`로 변경한다.

Draft 생성 호출 예시:

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "create_portfolio_item",
        "arguments": {
            "slug": "arena-combat-prototype",
            "title": "Arena Combat Prototype",
            "job_field": "game",
            "featured": false,
            "order_idx": 0,
            "published": false,
            "data": {
                "caseStudyVersion": 2
            }
        }
    }
}
```

최종 Published 호출 예시:

```json
{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
        "name": "update_portfolio_item",
        "arguments": {
            "slug": "arena-combat-prototype",
            "published": true
        }
    }
}
```

MCP patch 규칙:

- 생략한 row field와 `data` key는 유지
- 전달한 array와 object는 해당 key 단위로 교체되므로 수정할 array 전체를 전달
- 알려진 `data` key에 `null`을 전달하면 해당 key 삭제
- `data` 안에 row-level key를 넣어도 적용하지 않음
- 알 수 없는 forward-compatible key는 기존 값과 함께 보존
- Published 상태 row를 수정할 때는 수정 후 전체 row가 publication validation을 통과해야 함

## 8. Published validation checklist

아래 항목이 하나라도 실패하면 v2 entry를 Published로 저장할 수 없다.

- [ ] `caseStudyVersion`이 number `2`
- [ ] title과 unique slug 존재
- [ ] one-line pitch 존재, 180자 이하
- [ ] engine 존재, 80자 이하
- [ ] platform 1~5개
- [ ] ownership 1~5개
- [ ] outcome 1~3개, 각 result non-empty
- [ ] 첫 valid gallery media 또는 thumbnail 존재
- [ ] gallery의 모든 entry가 URL·type·poster·alt 규칙 통과
- [ ] `teamSize > 1`이면 credit 최소 1개
- [ ] content에 `##` Deep Dive가 정확히 2개 또는 3개
- [ ] 각 Deep Dive에 필수 `###` heading이 정확한 순서로 존재
- [ ] collection별 최대 개수와 text 길이 제한 준수
- [ ] 외부 link가 HTTPS이고 실제로 열림
- [ ] ownership과 outcome을 제3자가 읽어도 본인의 기여 범위가 명확함
- [ ] screenshot와 video에 secret·개인정보·권한 없는 asset이 없음
- [ ] desktop/mobile에서 horizontal overflow, broken media, console error 없음

## 9. Common validation failures

| Error 의미            | 확인할 부분                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| 한 줄 소개 필요       | `data.oneLinePitch`가 비어 있거나 180자 이후 잘렸는지 확인                   |
| Engine 정보 필요      | `data.engine` 확인                                                           |
| Platform 필요         | `data.platforms`가 non-empty string array인지 확인                           |
| 개인 기여 필요        | `data.ownership`에 구체적 책임 최소 1개 추가                                 |
| 검증 가능한 결과 필요 | `data.outcomes[].result`가 비어 있지 않은지 확인                             |
| 대표 media 필요       | valid gallery 첫 항목 또는 thumbnail 추가                                    |
| Credit 필요           | team size를 정확히 입력하거나 collaborator credit 추가                       |
| Gallery invalid       | media URL host, video poster, image poster 금지, alt 확인                    |
| Deep Dive 개수 오류   | content의 모든 `##` heading을 확인. 정확히 2~3개만 유지                      |
| Deep Dive 순서 오류   | 각 section의 `Problem → Decision → Implementation → Result → Trade-off` 확인 |
| MDX parse 오류        | 닫히지 않은 JSX/code fence, `<` 문자, 잘못된 MDX expression 확인             |

## 10. When application code must change

Content 작성만으로 해결되는 경우에는 아래 source를 수정하지 않는다. Contract 자체를 확장해야 할 때만 관련 경로와 test를 함께 수정한다.

| 변경 유형                | 수정 대상                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------- |
| v2 field 추가            | `src/types/portfolio.ts`, `src/lib/portfolio.ts`, `src/lib/portfolio-admin.ts`                |
| Admin input 추가         | `src/components/admin/PortfolioCaseStudyFields.tsx`, `src/components/admin/MetadataSheet.tsx` |
| 저장·Published 규칙 변경 | `src/app/admin/actions/portfolio.ts`, `src/lib/portfolio.ts`                                  |
| MCP schema·patch 변경    | `src/lib/mcp-tools.ts`                                                                        |
| detail section 변경      | `src/app/(frontend)/portfolio/[slug]/page.tsx`                                                |
| card 정보 변경           | `src/components/portfolio/PortfolioProjectCard.tsx`, `PortfolioProjectGrid.tsx`               |
| media rendering 변경     | `src/components/portfolio/PortfolioGallery.tsx`                                               |
| action kind 추가         | `src/types/portfolio.ts`, `src/lib/portfolio.ts`, `PortfolioActions.tsx`, Admin/MCP schema    |
| query 공개 범위 변경     | `src/lib/queries.ts`, public route query                                                      |

Contract 변경 시 최소 검증:

```powershell
pnpm exec vitest run src/__tests__/portfolio.test.ts src/__tests__/portfolio-admin.test.ts src/__tests__/portfolio-actions.test.ts src/__tests__/mcp-portfolio.test.ts
pnpm exec playwright test e2e/portfolio-case-study.spec.ts e2e/responsive.spec.ts --project=chromium --project=mobile-chrome
pnpm build
```

Public query의 `published: true` guard, unknown data key 보존, incomplete Draft 저장, Published validation을 우회하는 create/update/batch/MCP 경로가 없는지 함께 확인한다.

## 11. Definition of done

Portfolio entry는 다음 상태일 때 완료다.

- 사실 context와 collaborator credit이 검토됨
- card만 읽어도 역할과 가장 중요한 outcome을 이해할 수 있음
- 각 Deep Dive가 문제보다 decision과 개인 implementation을 중심으로 작성됨
- gallery의 모든 media가 하나 이상의 claim을 증명함
- 모든 link와 media가 실제로 열림
- Published validation 통과
- Selected/Other 위치와 order 확인
- desktop과 mobile public page 검수 완료
- Resume와 portfolio의 역할명·기간·성과 표현이 서로 모순되지 않음
