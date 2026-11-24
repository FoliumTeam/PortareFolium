// 이력서 PDF 날짜 계산. 오늘 값(asOf, YYYY-MM-DD)은 항상 주입
// 입력 정밀도: YYYY, YYYY-MM, YYYY-MM-DD

const pad = (n: number) => String(n).padStart(2, "0");

const daysInMonth = (y: number, m: number) =>
    new Date(Date.UTC(y, m, 0)).getUTCDate();

// 시작일 정규화: 빠진 월·일은 1
export const startOf = (value: string): string => {
    const [y, m = 1, d = 1] = value.split("-").map(Number);
    return `${y}-${pad(m)}-${pad(d)}`;
};

// 종료일 정규화: 빠진 월은 12, 빠진 일은 그 달 마지막 날
export const endOf = (value: string): string => {
    const parts = value.split("-").map(Number);
    const [y, m = 12] = parts;
    const d = parts[2] ?? daysInMonth(y, m);
    return `${y}-${pad(m)}-${pad(d)}`;
};

export const nextDay = (date: string): string => {
    const t = new Date(`${date}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() + 1);
    return t.toISOString().slice(0, 10);
};

// 표시용 연월 (YYYY.MM)
export const ym = (value?: string): string =>
    value ? value.slice(0, 7).replace("-", ".") : "";

// 근속 개월 (D7): 달력상 완성 개월 + 남은 날 30일당 1개월
// 종료일 포함 → 종료 다음날까지를 기간으로 계산
export const tenureMonths = (
    start: string,
    end: string | undefined,
    asOf: string
): number => {
    const s = startOf(start);
    const e = nextDay(end ? endOf(end) : asOf);
    const [y, m, d] = s.split("-").map(Number);
    const [ey, em, ed] = e.split("-").map(Number);
    if (e <= s) return 0;
    const full = (ey - y) * 12 + em - m - (ed < d ? 1 : 0);
    // 시제품과 같은 계산 (2026-11-23 인쇄본 승인)
    const rest = (Date.parse(e) - Date.UTC(y, m - 1 + full, d)) / 864e5;
    return full + Math.floor(Math.max(rest, 0) / 30);
};

// 만 나이
export const ageOn = (birth: string, asOf: string): number => {
    const [y, m, d] = birth.split("-").map(Number);
    const [ty, tm, td] = asOf.split("-").map(Number);
    return ty - y - (tm < m || (tm === m && td < (d ?? 1)) ? 1 : 0);
};

// 학력 상태 (D18): 종료일 없음 = 재학 중, 미래 종료일 = 졸업 예정
export const educationStatus = (
    end: string | undefined,
    asOf: string
): "graduated" | "enrolled" | "expected" => {
    if (!end) return "enrolled";
    return endOf(end) > asOf ? "expected" : "graduated";
};
