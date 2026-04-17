# PR: Gantt Chart 패널 전면 개편

## Summary

Gantt Chart 패널을 Excel 스타일 테이블 기반 모달로 전환하고, category 컬럼 및 카테고리별 색상 커스터마이징 기능을 추가한다.

### 주요 변경 사항

- `GanttChartTask`에 `category` 필드 추가, CSV 5컬럼 포맷으로 확장
- `gantt_chart_archives`에 `category_colors JSONB` 컬럼 마이그레이션
- `GanttChartCreateModal`: 차트 생성/편집 겸용 모달 (80vw×80vh, Excel 스타일)
- `GanttChartCategoryColorModal`: 카테고리별 이름/색상 편집 모달
- `GanttChartPanel`: CSV 업로드 버튼 제거, Create/Edit/Category Colors 버튼으로 교체
- Color Scheme 드롭다운 제거, category 기반 bar 색상 렌더링으로 전환
