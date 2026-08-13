// DB 기반 헤더 브랜드 문구 생성
export function getHeaderBrandLabel(
    headerName: string,
    jobFieldTitle?: string
): string {
    const parts = [headerName.trim(), jobFieldTitle?.trim()].filter(Boolean);
    return parts.length > 0 ? `[ ${parts.join(" · ")} ]` : "";
}
