# 공개 경로 성능 계약

## 적용 범위

- recruiter 공개 경로: `/`, `/{jobField}`, Resume, Portfolio, Blog, Published 상세
- 제외 경로: `/admin`, 인증, API, Draft preview

## 확인된 원인과 해결

| 항목          | 이전 상태                                          | 현재 계약                                                     |
| ------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| `/{jobField}` | Streaming SSR, `private, no-store`, 지속 `MISS`    | `generateStaticParams` + `dynamic = "force-static"`, 정적 ISR |
| 공개 인증     | Portfolio·Resume Server Component 관리자 세션 조회 | client session 또는 Admin 경계                                |
| Data cache    | `React.cache`만 적용                               | `unstable_cache`, `public-content` tag, 1시간                 |
| 갱신          | route path 중심                                    | `revalidatePath` + `revalidateTag` 동시 실행                  |
| Region        | Seoul edge → 미국 Function 가능성                  | Supabase·Vercel Function Tokyo 정렬                           |

## 구현 규칙

1. 공개 dynamic param 목록은 `generateStaticParams`로 생성
2. 상위 공개 dynamic segment에 `revalidate = 3600`, `dynamic = "force-static"` 선언
3. 공개 렌더 경로에 request-dependent 인증 API 추가 금지
4. 공개 query는 모듈 레벨 `unstable_cache`로 감싸고 key·tag·revalidate 명시
5. Published content mutation마다 path와 `public-content` tag 동시 무효화
6. query 추가 전 화면 필요 column과 독립 병렬 실행 가능성 확인

## 배포 검증

### build

```powershell
pnpm build
```

- 대상 공개 route: `○` 또는 `●`
- 공개 route `ƒ`: 0개

### production header

```powershell
curl.exe -sS -D - -o NUL https://gvm1229-portfolio.vercel.app/web
```

- 첫 요청: `X-Vercel-Cache: PRERENDER` 또는 `MISS` 허용
- 반복 요청: `X-Vercel-Cache: HIT` 필수
- `Cache-Control`: `public` 포함 필수

### 2026-08-14 기준 결과

- `/web`: 627ms → 290ms
- `/web/resume`: 142ms → 137ms
- `/game/resume`: 127ms → 267ms
- `/web/portfolio`: 118ms → 115ms
- `/game/portfolio`: 138ms → 167ms

측정 범위: Vercel edge `kix1`의 단일 시점 curl TTFB. 전 세계 사용자·장기 p75 지표 증명 범위 제외.

## 운영 경계

- source repository `main` push 뒤 Vercel 연결 fork 갱신 필요
- fork deployment 완료 전 production header 결과는 이전 code 기준
- Supabase Free plan Region 변경 불가. 현재 Northeast Asia (Tokyo)
