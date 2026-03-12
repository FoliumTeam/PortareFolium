/**
 * About 페이지 데이터 스키마 (Supabase about_data 테이블)
 * - sections: 경험 유형별 리스트
 * - competencySections: 역량 키워드별 리스트
 */

/** 경험 유형별 리스트 구분 */
export const ABOUT_SECTION_KEYS = [
    "학업/프로젝트",
    "동아리/대외활동",
    "연구/개발",
    "인턴/알바",
    "공모전/대회",
    "직무경험",
    "개인사업",
    "기타",
] as const;

export type AboutSectionKey = (typeof ABOUT_SECTION_KEYS)[number];

/** 역량 키워드별 리스트 구분 */
export const COMPETENCY_SECTION_KEYS = [
    "문제해결",
    "협업/소통",
    "도전/혁신",
    "리더십/팔로우십",
    "성공/몰입",
    "실패/성장",
    "의사결정",
] as const;

export type CompetencySectionKey = (typeof COMPETENCY_SECTION_KEYS)[number];

export interface AboutContacts {
    email?: string;
    github?: string;
    linkedin?: string;
}

export type AboutSections = Record<AboutSectionKey, string[]>;
export type AboutCompetencySections = Record<CompetencySectionKey, string[]>;

// Job Field별 소개 오버라이드 항목
export interface FieldIntroduction {
    description: string;
    descriptionSub: string;
}

export interface AboutData {
    profileImage?: string;
    name?: string;
    description?: string;
    descriptionSub?: string;
    contacts?: AboutContacts;
    // Job Field ID → 소개 오버라이드
    introductions?: Record<string, FieldIntroduction>;
    /** 경험 유형별 리스트 (테이블 1) */
    sections?: AboutSections;
    /** 역량 키워드별 리스트 (테이블 2) */
    competencySections?: AboutCompetencySections;
}

/** 경험 유형별 입력 가이드용 플레이스홀더 (Admin 폼에서 사용) */
export const SECTION_PLACEHOLDERS: Record<AboutSectionKey, string> = {
    "학업/프로젝트":
        "1. 이공계, 편입 후 이전 학교 학점 3.2에서 4.3로 오르고 장학금 받은 경험\n2. 움직임 인식 프로그램 소프트웨어 개발로 학과 우수 작품으로 선발된 경험\n3. 총학생회 당시, 도서관 내의 카페공간 활용도를 높여 학우들을 만족시킨 경험\n4. 데이터 분석을 통한 홍보전략을 제시해서 팀 보고서 A학점을 받은 경험",
    "동아리/대외활동":
        "1. 식품연구 당시 임상실험 참여율을 높여 유의미한 값을 도출해 논문 기재한 경험\n2. 데이터 분석을 통해 학위 논문 작성한 경험\n3. 50편 이상의 논문 분석을 통해 연구하여 외국의 저널에 논문게재한 경험",
    "연구/개발":
        "1. 식품연구 당시 임상실험 참여율을 높여 유의미한 값을 도출해 논문 기재한 경험\n2. 데이터 분석을 통해 학위 논문 작성한 경험\n3. 50편 이상의 논문 분석을 통해 연구하여 외국의 저널에 논문게재한 경험",
    "인턴/알바":
        "1. 행사 기획을 하면서 행사 참여율을 높였던 경험\n2. 스크린 골프장에서 일하면서 직접 알바생을 뽑아본 경험\n3. 홍보마케팅 인턴을 하면서 SNS유입률을 높인 경험\n4. 동남아시아 이커머스 마켓에 입점할 한국 업체들을 모집했던 경험\n5. 자체 프로모션 기획에서 화장품 가게 매출 2배 달성한 경험",
    "공모전/대회":
        "1. HRM레시피 대회 2등한 경험\n2. 고객 100명 인터뷰를 통해 고객 관점의 상품 설계로 공모전 1등한 경험\n3. 1인가구 고객조사를 통한 반려동물 학습 플랫폼 교내 공모전 3등 수상한 경험",
    직무경험:
        "1. 경리회계팀으로 일할 때, 누락되던 부가세를 환급받은 경험\n2. 3D프린터로 Degassing Tank 상세설계했던 경험\n3. 홈페이지 제작을 맡아서 홈페이지 유입률을 높인 경험\n4. 글라스 생산 공정에서 분석을 통해 불량률을 낮춘 경험\n5. 고객분석을 통해서 새로운 상품을 개발, 매출을 증대시킨 경험",
    개인사업:
        "1. 직접 화장품을 제작해서 판매해본 경험\n2. Ebay에서 해외 구매자들에게 한국 물품을 판매해본 경험\n3. 와디즈 펀딩을 진행해본 경험\n4. 고객이 원하는 새로운 공간을 기획해서 수익을 낸 경험",
    기타: "예: 자격증, 수상, 봉사 등 다른 항목에 넣기 어려운 경험",
};

/** 역량 키워드별 입력 가이드용 플레이스홀더 (Admin 폼에서 사용) */
export const COMPETENCY_PLACEHOLDERS: Record<CompetencySectionKey, string> = {
    문제해결:
        "예: 어떤 문제를 어떻게 정의했고, 어떤 방법으로 해결했는지 구체적 사례",
    "협업/소통":
        "예: 팀 프로젝트에서의 역할, 갈등 조정, 원격/오프라인 소통 경험",
    "도전/혁신": "예: 새로운 기술·방법 도입, 업무 프로세스 개선 시도",
    "리더십/팔로우십": "예: 팀 리드, 멘토링, 또는 적극적 팔로워로 기여한 사례",
    "성공/몰입":
        "예: 목표 달성 또는 깊이 몰입해 성과를 낸 경험 (기간, 결과 포함)",
    "실패/성장": "예: 실패에서 배운 점, 피드백 반영 후 개선한 경험",
    의사결정: "예: 중요한 결정을 내린 상황, 근거, 그리고 그 결과",
};
