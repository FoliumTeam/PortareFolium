/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "type-enum": [
            2,
            "always",
            [
                "feat", // 새 기능
                "fix", // 버그 수정
                "docs", // 문서만 변경
                "style", // 코드 의미 변경 없음 (포맷, 세미콜론 등)
                "refactor", // 리팩터링
                "perf", // 성능 개선
                "test", // 테스트 추가/수정
                "build", // 빌드/의존성 변경
                "ci", // CI 설정 변경
                "chore", // 기타 (빌드, 설정 등)
                "wip", // 작업 중
                "revert", // 이전 커밋 되돌리기
                "delete", // 파일/리소스 삭제
                "merge", // 병합 커밋
                "release", // 릴리즈
            ],
        ],
        "header-max-length": [2, "always", 100],
        "subject-case": [0],
    },
};
