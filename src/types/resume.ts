/**
 * JSON Resume 스키마 타입 정의
 * @see https://docs.jsonresume.org/schema
 */

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

export interface ResumeSkill {
    name?: string;
    level?: string;
    keywords?: string[];
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

export interface ResumeProject {
    name?: string;
    description?: string;
    highlights?: string[];
    keywords?: string[];
    startDate?: string;
    endDate?: string;
    url?: string;
    roles?: string[];
    entity?: string;
    type?: string;
    // 노출 직무 분야 id 배열. 비어있거나 없으면 미노출
    jobField?: string | string[];
}

export interface Resume {
    basics?: ResumeBasics;
    work?: ResumeWork[];
    volunteer?: ResumeVolunteer[];
    education?: ResumeEducation[];
    awards?: ResumeAward[];
    certificates?: ResumeCertificate[];
    publications?: ResumePublication[];
    skills?: ResumeSkill[];
    languages?: ResumeLanguage[];
    interests?: ResumeInterest[];
    references?: ResumeReference[];
    projects?: ResumeProject[];
}
