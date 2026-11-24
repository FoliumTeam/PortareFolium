// commit 메시지의 AI·bot 공동 작성자 표시 차단
// 사용: node scripts/check-agent-attribution.mjs <commit-msg 파일>      (commit-msg hook)
//       node scripts/check-agent-attribution.mjs --range <base>..<head> (CI: PR commit 검사)
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

// AI·agent·bot 식별 글자 (이름·이메일)
const AGENT_PATTERN =
    /claude|anthropic|codex|openai|chatgpt|\bgpt\b|copilot|gemini|\bomx\b|oh-my-codex|oh-my-claudecode|cursor|devin|\[bot\]|\bbot\b/iu;

// 공동 작성자 trailer와 생성 도구 문구
const TRAILER_PATTERN = /^\s*co-authored-by\s*:(.*)$/imu;
const GENERATED_PATTERN =
    /generated (with|by) \[?(claude|codex|chatgpt|copilot|gemini)/iu;

// 기록된 예외: main에 이미 올라가 fork가 동기화한 commit (history rewrite 금지 규칙으로 보존)
export const KNOWN_EXCEPTIONS = new Set([
    "293fada2fbca49cdaaa3a346c38ae61ac2eaa43a",
]);

// 메시지 하나의 위반 줄 목록 (주석 줄 제외)
export function findAgentAttribution(message) {
    const problems = [];
    for (const line of message.split(/\r?\n/u)) {
        if (line.startsWith("#")) continue;
        const trailer = TRAILER_PATTERN.exec(line);
        if (trailer && AGENT_PATTERN.test(trailer[1]))
            problems.push(line.trim());
        else if (GENERATED_PATTERN.test(line)) problems.push(line.trim());
    }
    return problems;
}

const git = (args) => execFileSync("git", args, { encoding: "utf8" });

function run() {
    const args = process.argv.slice(2);
    const failures = [];
    if (args[0] === "--range") {
        const shas = git(["rev-list", args[1]]).split("\n").filter(Boolean);
        for (const sha of shas) {
            if (KNOWN_EXCEPTIONS.has(sha)) continue;
            const problems = findAgentAttribution(
                git(["log", "-1", "--format=%B", sha])
            );
            if (problems.length)
                failures.push(`${sha.slice(0, 7)}: ${problems.join(" | ")}`);
        }
    } else if (args[0]) {
        const problems = findAgentAttribution(readFileSync(args[0], "utf8"));
        if (problems.length) failures.push(...problems);
    } else {
        console.error("[agent-attribution] commit-msg 파일 또는 --range 필요");
        process.exitCode = 2;
        return;
    }
    if (failures.length) {
        console.error(
            "[agent-attribution] AI·bot 공동 작성자 표시 금지 (.agents/directives/04-workflow.md)"
        );
        for (const f of failures) console.error(`- ${f}`);
        process.exitCode = 1;
    }
}

if (process.argv[1]?.endsWith("check-agent-attribution.mjs")) run();
