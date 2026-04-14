/**
 * JSON Resume 스키마 타입 정의
 * @see https://docs.jsonresume.org/schema
 */

export const defaultSectionLabels: Record<string, string> = {
    careerPhases: "커리어 타임라인",
    work: "경력",
    skills: "기술",
    education: "학력",
    projects: "프로젝트",
    volunteer: "봉사 활동",
    awards: "수상",
    certificates: "자격증",
    publications: "출판물",
    languages: "언어",
    interests: "관심사",
    references: "추천인",
};

export interface ResumeLocation {
    address?: string;
    postalCode?: string;
    city?: string;
    countryCode?: string;
    region?: string;
}

export interface ResumeProfile {
    network?: string;
    username?: string;
    url?: string;
}

export interface ResumeBasics {
    name?: string;
    label?: string;
    image?: string;
    /** 프로필 사진 스타일: "rounded" (원형), "squared" (네모), "standard" (표준, 약간 둥근 모서리) */
    imageStyle?: "rounded" | "squared" | "standard";
    email?: string;
    phone?: string;
    url?: string;
    summary?: string;
    location?: ResumeLocation;
    profiles?: ResumeProfile[];
}

export interface ResumeWork {
    name?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
    location?: string;
    description?: string;
    // 날짜에서 일(Day) 숨기고 월(Month)만 표시
    hideDays?: boolean;
    // 요약/성과를 마크다운으로 렌더링
    markdown?: boolean;
    // 노출 직무 분야 id 배열. 비어있거나 없으면 미노출
    jobField?: string | string[];
}

export interface ResumeVolunteer {
    organization?: string;
    position?: string;
    url?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
}

export interface ResumeEducation {
    institution?: string;
    url?: string;
    area?: string;
    studyType?: string;
    startDate?: string;
    endDate?: string;
    score?: string;
    gpa?: number;
    gpaMax?: 4 | 4.5;
    courses?: string[];
}

export interface ResumeAward {
    title?: string;
    date?: string;
    awarder?: string;
    summary?: string;
    // summary를 마크다운으로 렌더링할지 여부
    markdown?: boolean;
}

export interface ResumeCertificate {
    name?: string;
    date?: string;
    url?: string;
    issuer?: string;
}

export interface ResumePublication {
    name?: string;
    publisher?: string;
    releaseDate?: string;
    url?: string;
    summary?: string;
}

// 스킬 카테고리 내 개별 키워드 (뱃지) 타입
export interface ResumeSkillKeyword {
    name: string;
    iconSlug?: string;
    iconColor?: string;
    // 키워드 단위 직무 분야
    jobField?: string | string[];
    level?: string;
    // 하위 호환용 단일 ref (구버전 데이터)
    workRef?: string;
    projectRef?: string;
    // 다중 연결 직장/프로젝트
    workRefs?: string[];
    projectRefs?: string[];
}

export interface ResumeSkill {
    name?: string;
    keywords?: ResumeSkillKeyword[];
    // 오버라이드용 커스텀 뱃지 정보
    iconSlug?: string;
    iconColor?: string;
}

export interface ResumeLanguage {
    language?: string;
    fluency?: string;
}

export interface ResumeInterest {
    name?: string;
    keywords?: string[];
}

export interface ResumeReference {
    name?: string;
    reference?: string;
}

// 프로젝트 자유 양식 섹션 (제목 + 내용)
export interface ResumeProjectSection {
    title: string;
    content: string;
    // 내용을 마크다운으로 렌더링
    markdown?: boolean;
}

export interface ResumeProject {
    name?: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    // url에 표시할 커스텀 label (기본값: "라이브 URL")
    urlLabel?: string;
    roles?: string[];
    entity?: string;
    type?: string;
    // 날짜에서 일(Day) 숨기고 월(Month)만 표시
    hideDays?: boolean;
    // 노출 직무 분야 id 배열. 비어있거나 없으면 미노출
    jobField?: string | string[];
    // 포트폴리오 슬러그 — 연결된 포트폴리오 항목에서 썸네일·태그·역할 등을 가져옴
    portfolioSlug?: string;
    // 자유 양식 섹션 목록. 존재하면 description/highlights 대신 렌더링
    sections?: ResumeProjectSection[];
}

// 커리어 단계 (커리어 타임라인 섹션용)
export interface ResumeCareerPhase {
    phase?: number;
    startDate?: string;
    endDate?: string;
    name?: string;
    description?: string;
    keywords?: string[];
}

// 섹션별 이모지 및 entries 래퍼
export interface ResumeSection<T> {
    emoji: string;
    showEmoji: boolean;
    entries: T[];
    defaultView?: string;
}

export interface Resume {
    basics?: ResumeBasics;
    work?: ResumeSection<ResumeWork>;
    volunteer?: ResumeSection<ResumeVolunteer>;
    education?: ResumeSection<ResumeEducation>;
    awards?: ResumeSection<ResumeAward>;
    certificates?: ResumeSection<ResumeCertificate>;
    publications?: ResumeSection<ResumePublication>;
    skills?: ResumeSection<ResumeSkill>;
    languages?: ResumeSection<ResumeLanguage>;
    interests?: ResumeSection<ResumeInterest>;
    references?: ResumeSection<ResumeReference>;
    projects?: ResumeSection<ResumeProject>;
    careerPhases?: ResumeSection<ResumeCareerPhase>;
    coreCompetencies?: { title: string; description: string }[];
}
