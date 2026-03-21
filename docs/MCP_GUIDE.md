# MCP 엔드포인트 가이드

## 개요

`POST /api/mcp` — AI 에이전트가 포트폴리오 사이트 콘텐츠를 읽고 쓸 수 있는 HTTP 기반 MCP(Model Context Protocol) 엔드포인트.

프로토콜: JSON-RPC 2.0 over HTTP (MCP 2024-11-05 spec)

---

## 인증

### 토큰 발급 (어드민 UI)

1. 어드민 대시보드 접속 → 사이드바 **Agent 토큰** 탭 선택
2. Label 입력 (예: `claude-writer`) + 유효 기간 선택
3. **발급** 클릭 → 토큰 즉시 복사 (재표시 불가)

유효 기간 옵션: 15분 / 30분 / 1시간 / 3시간 / 6시간 / 12시간 / 24시간

### 요청 헤더

```
Authorization: Bearer pf_agent_<token>
Content-Type: application/json
```

---

## 요청 형식

모든 요청은 JSON-RPC 2.0 구조를 따름.

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "<tool_name>",
        "arguments": {}
    }
}
```

### 핸드셰이크 (최초 연결 시)

```json
{ "jsonrpc": "2.0", "id": 0, "method": "initialize", "params": {} }
```

### 툴 목록 조회

```json
{ "jsonrpc": "2.0", "id": 1, "method": "tools/list" }
```

---

## 사용 가능한 툴

| 툴 이름                 | 읽기/쓰기 | 설명                        |
| ----------------------- | --------- | --------------------------- |
| `get_schema`            | Read      | 스키마 가이드 반환          |
| `list_posts`            | Read      | 포스트 목록                 |
| `get_post`              | Read      | slug로 포스트 단건 조회     |
| `create_post`           | Write     | 포스트 생성                 |
| `update_post`           | Write     | 포스트 부분 수정            |
| `list_portfolio_items`  | Read      | 포트폴리오 목록             |
| `get_portfolio_item`    | Read      | slug로 포트폴리오 단건 조회 |
| `create_portfolio_item` | Write     | 포트폴리오 생성             |
| `update_portfolio_item` | Write     | 포트폴리오 부분 수정        |
| `get_resume`            | Read      | 이력서 조회                 |
| `update_resume`         | Write     | 이력서 deep-merge 업데이트  |

**Delete 툴 없음** — 삭제는 어드민 UI 전용.

Write 툴은 실행 전 자동으로 스냅샷 저장. 잘못된 수정은 어드민 > 스냅샷에서 복원 가능.

---

## 사용 예시

### 포스트 목록 조회

```bash
curl -X POST https://<domain>/api/mcp \
  -H "Authorization: Bearer pf_agent_<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "list_posts",
      "arguments": { "published": false, "limit": 10 }
    }
  }'
```

### 새 포스트 생성

```bash
curl -X POST https://<domain>/api/mcp \
  -H "Authorization: Bearer pf_agent_<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_post",
      "arguments": {
        "slug": "next-js-app-router-tips",
        "title": "Next.js App Router 실전 팁",
        "content": "# 들어가며\n\n...",
        "category": "web",
        "tags": ["Next.js", "React"],
        "job_field": "web",
        "published": false
      }
    }
  }'
```

### 포스트 수정

```bash
curl -X POST https://<domain>/api/mcp \
  -H "Authorization: Bearer pf_agent_<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "update_post",
      "arguments": {
        "slug": "next-js-app-router-tips",
        "content": "# 들어가며\n\n수정된 내용...",
        "published": true
      }
    }
  }'
```

### 이력서 업데이트

```bash
curl -X POST https://<domain>/api/mcp \
  -H "Authorization: Bearer pf_agent_<token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "update_resume",
      "arguments": {
        "lang": "ko",
        "data": {
          "work": {
            "emoji": "💼",
            "showEmoji": true,
            "entries": [
              {
                "name": "Acme Corp",
                "position": "Frontend Engineer",
                "startDate": "2023-03-01",
                "summary": "Next.js 기반 서비스 개발",
                "jobField": "web"
              }
            ]
          }
        }
      }
    }
  }'
```

---

## AI 에이전트 지시 방법

### 시스템 프롬프트 기본 구조

AI 에이전트에게 MCP를 통해 콘텐츠를 작성하도록 지시할 때 아래 구조를 사용.

```
You are a content writer for a personal portfolio site.
Use the MCP endpoint to read and write content.

Endpoint: https://<domain>/api/mcp
Auth: Bearer <token>
Protocol: JSON-RPC 2.0

Rules:
- Always call get_schema first to understand the data structure.
- Set published: false on all new content unless explicitly told otherwise.
- slugs must be lowercase, hyphen-separated, URL-safe (e.g. "my-new-post").
- Never delete content. Use update_post / update_portfolio_item to revise.
- For resume updates, send only the sections you are changing (deep-merge applied).
```

### 포스트 작성 지시 예시

```
MCP 엔드포인트를 사용해서 아래 주제로 블로그 포스트를 작성하고 저장해줘.

주제: TypeScript 제네릭 실전 활용법
카테고리: web
태그: TypeScript, 제네릭
분량: 1500자 이상 Markdown
published: false (초안으로 저장)

1. get_schema로 posts 컬럼 구조 확인
2. create_post로 저장
3. 저장된 id, slug 반환
```

### 포트폴리오 항목 작성 지시 예시

```
MCP 엔드포인트를 사용해서 아래 프로젝트를 포트폴리오에 추가해줘.

프로젝트명: Portare Folium
slug: portare-folium
설명: Next.js 기반 개인 포트폴리오 사이트
기간: 2024-01-01 ~ 현재 (endDate 생략)
역할: 풀스택 개발
기술 스택: Next.js, TypeScript, Supabase, Tailwind CSS
published: false
```

### 이력서 업데이트 지시 예시

```
MCP 엔드포인트를 사용해서 ko 이력서에 아래 경력을 추가해줘.

1. get_resume로 현재 이력서 조회
2. work.entries 배열에 아래 항목 추가 후 update_resume 호출
   - name: Acme Corp
   - position: Senior Frontend Engineer
   - startDate: 2023-03-01
   - summary: Next.js App Router 기반 B2B SaaS 개발
   - highlights: ["MAU 10만 달성", "Lighthouse 성능 점수 95+"]
   - jobField: web
3. 전체 work 섹션(emoji, showEmoji 포함)을 그대로 유지하고 entries만 교체
```

---

## 응답 형식

### 성공

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "content": [{ "type": "text", "text": "<JSON 결과>" }]
    }
}
```

### 에러

```json
{
    "jsonrpc": "2.0",
    "id": 1,
    "error": {
        "code": -32000,
        "message": "[mcp-tools::handleCreatePost] slug 중복: my-post"
    }
}
```

### 에러 코드

| 코드     | 의미                                |
| -------- | ----------------------------------- |
| `-32001` | 인증 실패 (토큰 없음 / 만료 / 폐기) |
| `-32700` | JSON 파싱 실패                      |
| `-32602` | 파라미터 오류                       |
| `-32601` | 존재하지 않는 method                |
| `-32000` | 툴 실행 에러 (message에 상세 내용)  |

---

## 주의사항

- **slug 중복** — 409 대신 `-32000` 에러로 반환. 다른 slug 선택
- **resume 업데이트** — 섹션 전체를 교체하는 방식. entries 배열을 불완전하게 보내면 기존 항목 유실 가능. 반드시 `get_resume` 먼저 호출 후 전체 entries 구성
- **Published 기본값** — 명시하지 않으면 `false`로 생성
- **스냅샷 복원** — 어드민 > 스냅샷 탭에서 테이블별 조회 및 1-click 복원 가능
- **토큰 보안** — 토큰은 발급 시 1회만 노출. HTTPS 환경에서만 사용 권장
