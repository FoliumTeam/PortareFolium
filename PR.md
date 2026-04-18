# PR: Gantt Chart 패널 전면 개편 (feature/gantt-chart-revision)

## Summary

Gantt Chart 패널 전면 재설계. CSV 업로드 방식을 폐기하고 Excel 스타일 인라인 테이블 편집 모달로 전환. category 필드 추가 및 카테고리별 색상 커스터마이징, compact row 레이아웃, comment 토글, JPG export 줌 버그 수정, 썸네일 버튼 위치 보정, Sonner toast 등을 포함.

---

## 주요 변경 사항

### Gantt Chart 핵심 기능

- **`GanttChartTask` category 필드 추가** (v0.11.81): `src/lib/gantt-chart.ts` — CSV 헤더 5컬럼(`task name,category,start date,end date,comment`)으로 확장, `parseGanttCsv` / `normalizeStoredGanttTasks` 업데이트
- **DB 마이그레이션** (v0.11.81): `src/lib/migrations.ts` — `gantt_chart_archives.category_colors JSONB DEFAULT '{}'` 컬럼 추가
- **GanttChartCreateModal 신규** (v0.11.82): 차트 생성/편집 겸용 모달 (80vw×80vh, Excel 스타일 테이블, CSV import, 미저장 경고)
- **GanttChartCategoryColorModal 신규** (v0.11.82): 카테고리별 이름/색상 편집 모달 (50vw×80vh, native color picker)
- **GanttChartPanel 전면 개편** (v0.11.82): CSV 업로드 제거 → 생성/편집/Category Colors 버튼, Color Scheme 드롭다운 제거, 카테고리별 bar 색상 렌더링

### Gantt Chart UX 개선

- **JPG export 줌 버그 수정** (v0.11.84): 캡처 전 `transform: scale(1)` 임시 적용 → 줌 무관하게 여백 없는 전체 차트 export
- **color picker 위치 수정** (v0.11.89): `GanttChartCategoryColorModal` — hidden input + ref 패턴 → color input을 버튼 내부 `absolute inset-0 opacity-0` overlay로 재배치
- **category tag 표시** (v0.11.90): 각 task 좌측 정보 영역에 solid 배경 pill tag로 category 표시, categoryColors 색상 연동
- **compact 수평 row 레이아웃** (v0.11.91): task name + category tag 한 줄, 날짜 한 줄로 통합, bar 높이 64→44px 축소
- **comment 토글** (v0.11.92): 툴바 "Comments ON/OFF" 버튼 추가 (기본 OFF) — ON 시 full comment 노출, bar 높이 44→60px 확장
- **샘플 CSV 업데이트**: `docs/gantt-chart-sample.csv` — category 컬럼 추가, 6개 카테고리 17개 task, 날짜 중첩 데이터로 확장

### RichMarkdownEditor 개선

- **thumbnail 버튼 위치 보정** (v0.11.83): image NodeView 내부 wrapper 기준 absolute overlay로 재배치, `global.css` prose 스타일 충돌 해결
- **Sonner toast 추가** (v0.11.85–87): `sonner` 의존성, `src/components/ui/sonner.tsx` 신규, 전역 `Toaster` 연결, 썸네일 설정 성공 시 `toast.success` 피드백, 위치 `top-center`, 폰트/아이콘 보정

### 문서

- **README 릴리즈 구독 안내 추가**: Watch → Custom → Releases 설정 방법

---

## 변경 파일 목록

| 파일 | 변경 유형 |
| ---- | --------- |
| `src/lib/gantt-chart.ts` | 수정 |
| `src/lib/migrations.ts` | 수정 |
| `src/components/admin/panels/GanttChartCreateModal.tsx` | 신규 |
| `src/components/admin/panels/GanttChartCategoryColorModal.tsx` | 신규 |
| `src/components/admin/panels/GanttChartPanel.tsx` | 수정 |
| `src/components/admin/RichMarkdownEditor.tsx` | 수정 |
| `src/components/ui/sonner.tsx` | 신규 |
| `src/app/layout.tsx` | 수정 |
| `src/styles/global.css` | 수정 |
| `src/__tests__/gantt-chart.test.ts` | 수정 |
| `docs/gantt-chart-sample.csv` | 수정 |
| `README.md` | 수정 |

---

## Test Plan

- [ ] Gantt Chart 생성 모달: 빈 테이블 → 행 추가 → 저장 후 프리뷰 확인
- [ ] Gantt Chart 편집 모달: 기존 데이터 pre-fill, 수정 저장 반영 확인
- [ ] CSV import: 5컬럼 파일 붙여넣기 → 파싱 정상 확인
- [ ] Category Colors 모달: color picker가 버튼 옆에 열리는지 확인
- [ ] Category tag: 각 task row에 solid pill tag 표시 및 색상 매핑 확인
- [ ] JPG export: zoom 0.3 / 1.0 / 2.0 상태에서 각각 export — 여백 없는 전체 차트 확인
- [ ] Comments 토글: OFF(기본) → ON 전환 시 comment 노출 및 bar 높이 확장 확인
- [ ] Sonner toast: 썸네일 설정 클릭 후 top-center 토스트 표시 확인
- [ ] `pnpm exec vitest run` 전체 통과

---

## 추가 변경 사항

- **v0.12.21**: multi-image layout modal 추가, `개별사진`/`슬라이드` 선택 지원, `ImageGroup` block 기반 source/WYSIWYG/frontend 구조 통일
