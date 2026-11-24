import { describe, expect, it } from "vitest";
import {
    findAgentAttribution,
    KNOWN_EXCEPTIONS,
} from "../../scripts/check-agent-attribution.mjs";

describe("AI 공동 작성자 표시 검사", () => {
    it("AI·bot 공동 작성자와 생성 문구 차단", () => {
        for (const line of [
            "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>",
            "co-authored-by: OmX <omx@oh-my-codex.dev>",
            "Co-authored-by: Copilot <copilot@github.com>",
            "Co-authored-by: dependabot[bot] <bot@example.test>",
            "🤖 Generated with [Claude Code](https://claude.com/claude-code)",
        ])
            expect(
                findAgentAttribution(`feat: x\n\n- body\n\n${line}\n`)
            ).toEqual([line.trim()]);
    });

    it("사람 공동 작성자·일반 본문·주석 줄은 허용", () => {
        expect(
            findAgentAttribution(
                "feat: Claude API 문서 링크 추가\n\n- Claude 모델 설명\n\nCo-authored-by: Jane Doe <jane@example.test>\n# Co-Authored-By: Claude\n"
            )
        ).toEqual([]);
    });

    it("main에 보존한 기록 예외 commit", () => {
        expect(
            KNOWN_EXCEPTIONS.has("293fada2fbca49cdaaa3a346c38ae61ac2eaa43a")
        ).toBe(true);
    });
});
