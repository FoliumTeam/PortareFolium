"use client";

import { useState, useEffect } from "react";
import { MessageSquare, Copy, RotateCcw, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const GET_DEFAULT_PROMPT = (
    origin: string
) => `넌 내 개인 포트폴리오 웹사이트의 전문 기술 블로그 작성자야.
MCP 엔드포인트를 사용하여 콘텐츠를 읽고 써줘.

Endpoint: ${origin}/api/mcp
Auth: Bearer <YOUR_AGENT_TOKEN_HERE>
Protocol: JSON-RPC 2.0

Rules:
1. IMPORTANT: 툴 요청은 반드시 다음 JSON-RPC 2.0 형식을 따를 것:
   method: "tools/call"
   params: { name: "<tool_name>", arguments: { ... } }
2. 먼저 \`tools/list\`를 호출하여 사용 가능한 툴과 스키마를 파악할 것.
3. 그 다음 \`get_schema\`를 호출하여 데이터 구조 명세서(rules, 스키마 형태)를 확인할 것.
4. 블로그 포스트는 독자에게 친절하고 흥미로운 한국어 단조를 사용할 것.
5. CAUTION: 소스 코드가 포함된 마크다운을 JSON payload로 작성할 때, 백틱이나 C++ ANSI escape sequence (예: \\\`\\\\033\\\`, \\\`\\\\x1b\\\`) 등에 각별히 주의하여 Node.js \`SyntaxError\`가 발생하지 않도록 이스케이프(\\\\) 처리를 꼼꼼히 할 것.

Target Post Meta Options (원하는 설정으로 수정 후 진행):
- published: false
- category: "개발 일지"
- job_field: "game"
- tags: ["Game Dev", "C++"]

Gold Standard References (스타일 및 포맷 참고용 기존 포스트 slug 또는 URL):
- <REFERENCE_POST_URL_OR_SLUG_1>
- <REFERENCE_POST_URL_OR_SLUG_2>

Task:
제공되는 changelog 마크다운 파일을 읽고, changelog에 기록된 각 날짜마다, 무슨 작업을 했고 어떤 난관(hardships)을 겪었으며 어떻게 해결했는지 설명하는 상세한 기술 블로그 포스트를 작성해줘.
문맥 파악 및 스타일 참고를 위해 먼저 Gold Standard References 항목들을 읽어본 후, \`create_post\` 툴을 사용하여 각 블로그 포스트를 데이터베이스에 저장해줘.`;

export default function PromptLibraryPanel() {
    const [promptText, setPromptText] = useState("");
    const [origin, setOrigin] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const currentOrigin = window.location.origin;
        setOrigin(currentOrigin);
        setPromptText(GET_DEFAULT_PROMPT(currentOrigin));
    }, []);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(promptText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const handleReset = () => {
        setPromptText(GET_DEFAULT_PROMPT(origin));
    };

    return (
        <div className="mx-auto max-w-4xl space-y-8 pb-12">
            <div>
                <h1 className="text-3xl font-light tracking-tight text-(--color-foreground)">
                    프롬프트 라이브러리
                </h1>
                <p className="mt-2 text-(--color-muted)">
                    AI 에이전트(Cursor, Claude Code 등)에게 주입하여 MCP
                    엔드포인트를 효과적으로 활용할 수 있게 해주는 프롬프트
                    템플릿입니다.
                </p>
            </div>

            <section className="space-y-4">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-(--color-accent)" />
                    <h2 className="text-xl font-medium">
                        개발 일지 블로그 포스트 변환
                    </h2>
                </div>
                <p className="text-sm text-(--color-muted)">
                    Changelog 형태의 개발 일지 마크다운 파일을 입력하면, AI가
                    날짜별로 상세한 블로그 포스트 초안을 작성하여 데이터베이스에
                    일괄 저장합니다. 토큰은 보안을 위해 직접 발급받아{" "}
                    <code>&lt;YOUR_AGENT_TOKEN_HERE&gt;</code> 위치에
                    붙여넣어주세요.
                </p>

                <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-subtle)">
                    <div className="flex items-center justify-between border-b border-(--color-border) bg-[rgba(0,0,0,0.02)] px-4 py-2 dark:bg-[rgba(255,255,255,0.02)]">
                        <span className="text-xs font-medium text-(--color-muted)">
                            System Prompt
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleReset}
                                className="h-7 px-2 text-xs text-(--color-muted) hover:text-(--color-foreground)"
                            >
                                <RotateCcw className="mr-1 h-3 w-3" />
                                초기화
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleCopy}
                                className="h-7 px-2 text-xs text-(--color-accent) hover:bg-(--color-accent)/10"
                            >
                                {copied ? (
                                    <Check className="mr-1 h-3 w-3" />
                                ) : (
                                    <Copy className="mr-1 h-3 w-3" />
                                )}
                                복사
                            </Button>
                        </div>
                    </div>
                    <textarea
                        value={promptText}
                        onChange={(e) => setPromptText(e.target.value)}
                        className="min-h-[400px] w-full resize-y bg-transparent p-4 text-sm whitespace-pre-wrap text-(--color-foreground) focus:outline-none"
                        spellCheck={false}
                    />
                </div>
            </section>
        </div>
    );
}
