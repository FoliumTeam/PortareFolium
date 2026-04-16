"use client";

import { useEffect, useState } from "react";
import { Key, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    issueToken,
    revokeToken,
    listTokens,
} from "@/app/admin/actions/agent-tokens";
import ContentWrapper from "@/components/ContentWrapper";

// 유효 duration 옵션
const DURATION_OPTIONS = [
    { value: 15, label: "15분" },
    { value: 30, label: "30분" },
    { value: 60, label: "1시간" },
    { value: 180, label: "3시간" },
    { value: 360, label: "6시간" },
    { value: 720, label: "12시간" },
    { value: 1440, label: "24시간" },
] as const;

type TokenRow = Awaited<ReturnType<typeof listTokens>>[number];

// 토큰 상태 판별
function getTokenStatus(token: TokenRow): "active" | "expired" | "revoked" {
    if (token.revoked) return "revoked";
    if (new Date(token.expires_at) < new Date()) return "expired";
    return "active";
}

export default function AgentTokensPanel() {
    const [tokens, setTokens] = useState<TokenRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [label, setLabel] = useState("");
    const [duration, setDuration] = useState<number>(60);
    const [issuing, setIssuing] = useState(false);
    const [newToken, setNewToken] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [revoking, setRevoking] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const refreshButtonClassName =
        "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200";

    const load = async () => {
        setLoading(true);
        setTokens(await listTokens());
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const handleIssue = async () => {
        setError(null);
        setNewToken(null);
        setIssuing(true);
        const res = await issueToken(
            label,
            duration as 15 | 30 | 60 | 180 | 360 | 720 | 1440
        );
        setIssuing(false);
        if ("error" in res) {
            setError(res.error);
        } else {
            setNewToken(res.token);
            setLabel("");
            await load();
        }
    };

    const handleRevoke = async (id: string) => {
        setRevoking(id);
        const res = await revokeToken(id);
        setRevoking(null);
        if ("error" in res) {
            setError(res.error);
        } else {
            await load();
        }
    };

    const copyToken = () => {
        if (!newToken) return;
        navigator.clipboard.writeText(newToken);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <ContentWrapper
            width="full"
            className="flex h-full min-h-0 flex-col space-y-8 overflow-hidden"
        >
            {/* 헤더 — 스크롤 중에도 상단 고정 */}
            <div className="sticky top-0 z-10 shrink-0 bg-(--color-surface) pb-3">
                <h2 className="text-3xl font-bold tracking-tight text-(--color-foreground)">
                    Agent 토큰
                </h2>
                <p className="mt-1 text-sm text-(--color-muted)">
                    MCP API 에이전트 인증 토큰 발급 및 관리
                </p>

                {/* 토큰 발급 폼 */}
                <section className="mt-4 space-y-4 rounded-xl border border-(--color-border) bg-(--color-surface) p-5">
                    <h3 className="text-sm font-bold tracking-widest text-(--color-muted) uppercase">
                        새 토큰 발급
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        <input
                            type="text"
                            placeholder="Label (예: claude-agent-prod)"
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) placeholder:text-(--color-muted) focus:ring-2 focus:ring-(--color-accent) focus:outline-none"
                        />
                        <select
                            value={duration}
                            onChange={(e) =>
                                setDuration(Number(e.target.value))
                            }
                            className="rounded-lg border border-(--color-border) bg-(--color-surface-subtle) px-3 py-2 text-sm text-(--color-foreground) focus:ring-2 focus:ring-(--color-accent) focus:outline-none"
                        >
                            {DURATION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <Button
                            onClick={handleIssue}
                            disabled={issuing || !label.trim()}
                        >
                            <Key className="mr-2 h-4 w-4 shrink-0" />
                            <span className="whitespace-nowrap">
                                {issuing ? "발급 중..." : "발급"}
                            </span>
                        </Button>
                    </div>

                    {error && <p className="text-sm text-red-500">{error}</p>}

                    {/* 신규 발급 토큰 — 한 번만 표시 */}
                    {newToken && (
                        <div className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700 dark:bg-green-950/30">
                            <p className="mb-2 text-xs font-semibold text-green-700 dark:text-green-400">
                                토큰이 발급되었습니다. 지금 복사하세요 — 다시
                                표시되지 않습니다.
                            </p>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded bg-green-100 px-2 py-1.5 font-mono text-xs break-all text-green-900 dark:bg-green-900/40 dark:text-green-200">
                                    {newToken}
                                </code>
                                <Button size="sm" onClick={copyToken}>
                                    <span className="whitespace-nowrap">
                                        {copied ? "복사됨" : "복사"}
                                    </span>
                                </Button>
                            </div>
                        </div>
                    )}
                </section>

                {/* 토큰 목록 header */}
                <section className="mt-6 flex items-center justify-between">
                    <h3 className="text-xs font-bold tracking-widest text-(--color-muted) uppercase">
                        토큰 목록
                    </h3>
                    <Button
                        size="sm"
                        onClick={load}
                        disabled={loading}
                        className={refreshButtonClassName}
                    >
                        <RefreshCw
                            className={`mr-2 h-4 w-4 shrink-0 ${
                                loading ? "animate-spin" : ""
                            }`}
                        />
                        <span className="whitespace-nowrap">
                            {loading ? "새로고침 중..." : "새로고침"}
                        </span>
                    </Button>
                </section>
            </div>

            {/* 토큰 목록 body */}
            <section className="min-h-0 flex-1 overflow-y-auto">
                {tokens.length === 0 && !loading && (
                    <p className="text-sm text-(--color-muted)">
                        발급된 토큰이 없습니다.
                    </p>
                )}

                <div className="space-y-3">
                    {tokens.map((token) => {
                        const status = getTokenStatus(token);
                        return (
                            <div
                                key={token.id}
                                className={[
                                    "flex flex-wrap items-center gap-3 rounded-xl border p-4",
                                    status === "active"
                                        ? "border-(--color-border) bg-(--color-surface)"
                                        : "border-(--color-border) opacity-50",
                                ].join(" ")}
                            >
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-semibold text-(--color-foreground)">
                                            {token.label}
                                        </span>
                                        {status === "active" && (
                                            <Badge className="bg-green-500 text-white">
                                                Active
                                            </Badge>
                                        )}
                                        {status === "expired" && (
                                            <Badge className="bg-amber-500 text-white dark:bg-amber-500 dark:text-white">
                                                Expired
                                            </Badge>
                                        )}
                                        {status === "revoked" && (
                                            <Badge className="bg-red-600 text-white dark:bg-red-600 dark:text-white">
                                                Revoked
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-3 text-xs text-(--color-muted)">
                                        <span>
                                            만료:{" "}
                                            {new Date(
                                                token.expires_at
                                            ).toLocaleString("ko-KR")}
                                        </span>
                                        {token.last_used_at && (
                                            <span>
                                                마지막 사용:{" "}
                                                {new Date(
                                                    token.last_used_at
                                                ).toLocaleString("ko-KR")}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {status === "active" && (
                                    <Button
                                        size="sm"
                                        onClick={() => handleRevoke(token.id)}
                                        disabled={revoking === token.id}
                                        className="bg-red-600 text-white hover:bg-red-500 dark:bg-red-600 dark:text-white dark:hover:bg-red-500"
                                    >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                        <span className="whitespace-nowrap">
                                            {revoking === token.id
                                                ? "폐기 중..."
                                                : "폐기"}
                                        </span>
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </ContentWrapper>
    );
}
