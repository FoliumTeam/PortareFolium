"use client";

import { useEffect, useState } from "react";
import { Wrench, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { executeLightboxSidecarBackfill } from "@/app/admin/actions/lightbox-sidecars";
import {
    applyPendingDbMigrations,
    type DbMigrationApplyResult,
} from "@/app/admin/actions/migrations";
import type { LightboxSidecarBackfillSummary } from "@/lib/lightbox-sidecars";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type RunState =
    | { type: "error"; message: string }
    | { type: "success"; summary: LightboxSidecarBackfillSummary }
    | null;

type MigrationRunState =
    | { type: "error"; message: string }
    | { type: "success"; summary: DbMigrationApplyResult }
    | null;

type DebugEntryDetail = {
    description: string;
    title: string;
};

type RiskIndicator = {
    label: string;
    tone: "danger" | "neutral" | "safe" | "warn";
    value: string;
};

const BACKFILL_INDICATORS: RiskIndicator[] = [
    { label: "중복 생성", value: "없음", tone: "safe" },
    { label: "Vercel 함수 실행", value: "중간", tone: "warn" },
    { label: "Cloudflare R2 사용량", value: "높음", tone: "danger" },
    { label: "Supabase 영향", value: "없음", tone: "safe" },
    { label: "권장 실행 횟수", value: "최초 1회", tone: "neutral" },
];

const DB_MIGRATION_INDICATORS: RiskIndicator[] = [
    { label: "중복 실행", value: "idempotent", tone: "safe" },
    { label: "Vercel 함수 실행", value: "중간", tone: "warn" },
    { label: "Supabase 영향", value: "높음", tone: "danger" },
    { label: "권장 실행 횟수", value: "필요 시", tone: "neutral" },
];

const LIGHTBOX_BACKFILL_DETAIL: DebugEntryDetail = {
    title: "Lightbox sidecar backfill",
    description: `이 항목은 기존 blog / portfolio 자산을 순회하면서 thumb.webp 하나만 남기도록 정리합니다.

- 일반 이미지: .thumb.webp 생성
- GIF: 첫 프레임 기반 정적 .thumb.webp 생성
- 기존 .poster.webp가 남아 있으면 삭제
- 이미 정적인 .thumb.webp만 있으면 skip

사용자 영향:

- 중복 객체를 만들지 않음
- bucket 순회와 존재 확인 때문에 Cloudflare R2 요청량이 증가할 수 있음
- server action 실행 시간이 길어질 수 있어 Vercel 함수 사용량에 영향이 있을 수 있음
- Supabase Database / Storage / Edge Functions quota에는 직접 영향이 없음
- 처리 중에는 admin 응답이 일시적으로 느려질 수 있음

과금 관점:

- 같은 sidecar를 중복 생성하지 않으므로 저장 용량이 불필요하게 늘어나지는 않음
- 다만 bucket 순회, 존재 확인, 다운로드, 업로드, 삭제 때문에 Cloudflare R2 요청량에는 영향이 있을 수 있음
- Cloudflare R2 free tier는 Standard storage 기준 월 10 GB storage, Class A 100만 요청, Class B 1,000만 요청까지 무료이므로 대량 실행은 이 quota를 잠식할 수 있음
- 이 작업에서 ListObjects / PutObject는 Class A, HeadObject / GetObject는 Class B, DeleteObject는 무료에 해당함
- Vercel Hobby는 함수 호출 100만 회, Function Duration 100 GB-Hours 포함이고, 초과 시 일반적으로 바로 과금되는 대신 기능이 리셋 시점까지 제한될 수 있음
- Supabase free tier quota는 직접 소모하지 않으므로 이 항목의 주된 비용 위험은 아님

권장:

- 초기 migration 성격으로 최초 1회 실행
- 대량 자산이 있으면 사용량이 적은 시간대에 실행`,
};

const DB_MIGRATION_DETAIL: DebugEntryDetail = {
    title: "DB migration failsafe",
    description: `서버 시작 시 자동 마이그레이션이 정상 동작하지 않았을 때 사용하는 수동 failsafe입니다.

- 현재 DB schema version을 확인
- 누락된 migration을 순서대로 적용
- Supabase mode에서는 service-role 전용 exec_sql() RPC 사용
- SQLite refuge mode에서는 local refuge DB migration 적용

권장:

- 일반 운영에서는 자동 마이그레이션에 맡김
- Admin 메인 DB 상태 카드에서 pending migration이 계속 보일 때만 실행
- db_schema_version이 없으면 초기 setup.sql이 먼저 필요함`,
};

function indicatorClassName(tone: RiskIndicator["tone"]): string {
    if (tone === "safe") {
        return "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300";
    }
    if (tone === "warn") {
        return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
    }
    if (tone === "danger") {
        return "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300";
    }
    return "border-(--color-border) bg-(--color-surface-subtle) text-(--color-muted)";
}

export default function DebugPanel() {
    const [detail, setDetail] = useState<DebugEntryDetail | null>(null);
    const [infoOpen, setInfoOpen] = useState(false);
    const [progressOpen, setProgressOpen] = useState(false);
    const [progressValue, setProgressValue] = useState(0);
    const [progressLabel, setProgressLabel] = useState("준비 중...");
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<RunState>(null);
    const [migrationRunning, setMigrationRunning] = useState(false);
    const [migrationResult, setMigrationResult] =
        useState<MigrationRunState>(null);

    useEffect(() => {
        if (!running) return;
        if (progressValue < 25) {
            setProgressLabel("bucket 대상 수집 중...");
            return;
        }
        if (progressValue < 70) {
            setProgressLabel("이미지 sidecar 생성 중...");
            return;
        }
        if (progressValue < 100) {
            setProgressLabel("결과 정리 중...");
            return;
        }
        setProgressLabel("완료");
    }, [progressValue, running]);

    const handleRunBackfill = async () => {
        setRunning(true);
        setResult(null);
        setProgressOpen(true);
        setProgressValue(5);
        setProgressLabel("bucket 대상 수집 중...");

        const progressTimer = window.setInterval(() => {
            setProgressValue((current) =>
                current >= 92 ? current : current + 4
            );
        }, 700);

        try {
            const summary = await executeLightboxSidecarBackfill();
            window.clearInterval(progressTimer);
            setProgressValue(100);
            setResult({ type: "success", summary });
        } catch (error) {
            window.clearInterval(progressTimer);
            setResult({
                type: "error",
                message:
                    error instanceof Error ? error.message : "backfill 실패",
            });
        } finally {
            window.setTimeout(() => {
                setProgressOpen(false);
                setProgressValue(0);
                setProgressLabel("준비 중...");
            }, 500);
            setRunning(false);
        }
    };

    const handleRunDbMigrations = async () => {
        setMigrationRunning(true);
        setMigrationResult(null);

        try {
            const summary = await applyPendingDbMigrations();
            setMigrationResult({ type: "success", summary });
        } catch (error) {
            setMigrationResult({
                type: "error",
                message:
                    error instanceof Error
                        ? error.message
                        : "DB migration 실패",
            });
        } finally {
            setMigrationRunning(false);
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
            <div className="sticky top-0 z-10 shrink-0 space-y-4 bg-(--color-surface) pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="mb-1 text-3xl font-bold tracking-tight text-(--color-foreground)">
                            Debug
                        </h2>
                        <div className="space-y-1 text-sm text-(--color-muted)">
                            <p>
                                운영 중 수동 실행이 필요한 debug 도구를 모아두는
                                패널입니다.
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setInfoOpen(true)}
                        className="shrink-0 bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    >
                        <Info className="mr-1.5 h-4 w-4" />
                        도움말
                    </Button>
                </div>

                <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--color-accent)/10 text-(--color-accent)">
                            <Wrench className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-(--color-foreground)">
                                Lightbox sidecar backfill
                            </p>
                            <p className="mt-1 text-sm leading-6 text-(--color-muted)">
                                기존 <code>blog</code>, <code>portfolio</code>{" "}
                                자산을 순회하면서 <code>.thumb.webp</code>{" "}
                                하나만 남기도록 정리합니다. GIF는 첫 프레임 기반
                                정적 <code>.thumb.webp</code>를 생성합니다.
                                운영에서는 한 번만 실행하는 것을 권장합니다.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {BACKFILL_INDICATORS.map((indicator) => (
                                    <span
                                        key={indicator.label}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${indicatorClassName(indicator.tone)}`}
                                    >
                                        {indicator.label}: {indicator.value}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-4">
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={() => void handleRunBackfill()}
                                        disabled={running}
                                        className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                    >
                                        {running
                                            ? "실행 중..."
                                            : "Backfill 실행"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setDetail(LIGHTBOX_BACKFILL_DETAIL)
                                        }
                                        className="border-(--color-border) bg-(--color-surface) text-(--color-muted) hover:text-(--color-foreground)"
                                    >
                                        Learn more
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-5">
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-(--color-accent)/10 text-(--color-accent)">
                            <Wrench className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="text-base font-semibold text-(--color-foreground)">
                                DB migration failsafe
                            </p>
                            <p className="mt-1 text-sm leading-6 text-(--color-muted)">
                                자동 마이그레이션이 적용되지 않았을 때 기존 DB
                                마이그레이션 패널의 <strong>자동 적용</strong>{" "}
                                버튼처럼 pending migration을 수동 실행합니다.
                                일반 운영에서는 Admin 메인 DB 상태 카드가 계속
                                pending을 표시할 때만 사용하세요.
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {DB_MIGRATION_INDICATORS.map((indicator) => (
                                    <span
                                        key={indicator.label}
                                        className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${indicatorClassName(indicator.tone)}`}
                                    >
                                        {indicator.label}: {indicator.value}
                                    </span>
                                ))}
                            </div>
                            <div className="mt-4">
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={() =>
                                            void handleRunDbMigrations()
                                        }
                                        disabled={migrationRunning}
                                        className="bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
                                    >
                                        {migrationRunning
                                            ? "적용 중..."
                                            : "DB migration 적용"}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setDetail(DB_MIGRATION_DETAIL)
                                        }
                                        className="border-(--color-border) bg-(--color-surface) text-(--color-muted) hover:text-(--color-foreground)"
                                    >
                                        Learn more
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {result?.type === "success" && (
                    <div className="rounded-2xl border border-green-500/30 bg-green-500/8 p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                                <p>processed={result.summary.processed}</p>
                                <p className="text-xs text-green-700/90 dark:text-green-300/90">
                                    실제로 검사한 원본 자산 수
                                </p>
                                <p>skipped={result.summary.skipped}</p>
                                <p className="text-xs text-green-700/90 dark:text-green-300/90">
                                    이미 정적인 thumb가 있어서 추가 작업 없이
                                    건너뛴 수
                                </p>
                                <p>thumb={result.summary.thumbCreated}</p>
                                <p className="text-xs text-green-700/90 dark:text-green-300/90">
                                    새로 생성된 <code>.thumb.webp</code> 수
                                </p>
                                <p>
                                    rewrittenThumb=
                                    {result.summary.rewrittenThumb}
                                </p>
                                <p className="text-xs text-green-700/90 dark:text-green-300/90">
                                    기존 animated <code>.thumb.webp</code>를
                                    정적인 첫 프레임 thumb로 다시 생성한 수
                                </p>
                                <p>
                                    deletedPoster=
                                    {result.summary.deletedPoster}
                                </p>
                                <p className="text-xs text-green-700/90 dark:text-green-300/90">
                                    기존 <code>.poster.webp</code>를 정리한 수
                                </p>
                                <p>errors={result.summary.errors.length}</p>
                                <p className="text-xs text-green-700/90 dark:text-green-300/90">
                                    변환 또는 업로드에 실패한 자산 수
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {result?.type === "error" && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/8 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            <p className="text-sm text-red-600 dark:text-red-300">
                                {result.message}
                            </p>
                        </div>
                    </div>
                )}

                {migrationResult?.type === "success" && (
                    <div className="rounded-2xl border border-green-500/30 bg-green-500/8 p-4">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                            <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
                                <p>mode={migrationResult.summary.mode}</p>
                                <p>applied={migrationResult.summary.applied}</p>
                                <p>
                                    versions=
                                    {migrationResult.summary.versions.length > 0
                                        ? migrationResult.summary.versions.join(
                                              ", "
                                          )
                                        : "none"}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {migrationResult?.type === "error" && (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/8 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                            <p className="text-sm text-red-600 dark:text-red-300">
                                {migrationResult.message}
                            </p>
                        </div>
                    </div>
                )}

                {result?.type === "success" &&
                    result.summary.errors.length > 0 && (
                        <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) p-4">
                            <p className="mb-2 text-sm font-semibold text-(--color-foreground)">
                                실패 목록
                            </p>
                            <div className="max-h-60 overflow-y-auto rounded-xl bg-(--color-surface-subtle) p-3 font-mono text-xs text-(--color-muted)">
                                {result.summary.errors.map((error) => (
                                    <p key={error}>{error}</p>
                                ))}
                            </div>
                        </div>
                    )}
            </div>

            <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
                <DialogContent className="tablet:max-w-2xl max-h-[80vh] overflow-y-auto border-(--color-border) bg-(--color-surface) text-(--color-foreground)">
                    <DialogHeader>
                        <DialogTitle>Debug indicator 안내</DialogTitle>
                        <DialogDescription>
                            각 debug entry에 표시되는 indicator는 실행 전 비용과
                            영향 범위를 빠르게 판단하기 위한 정보입니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 text-sm leading-6 text-(--color-muted)">
                        <section className="space-y-2">
                            <h3 className="font-semibold text-(--color-foreground)">
                                공통 indicator 의미
                            </h3>
                            <div className="space-y-2">
                                <p>
                                    <strong className="text-(--color-foreground)">
                                        중복 생성
                                    </strong>
                                    : 같은 key를 또 만드는지 여부입니다. 현재
                                    debug 도구가 이미 생성된 결과를 다시
                                    만들거나 같은 데이터를 중복 저장하는
                                    위험도를 뜻합니다.
                                </p>
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200">
                                    <p className="font-semibold">
                                        💸 과금과의 관계
                                    </p>
                                    <p className="mt-1">
                                        중복 생성이 있으면 저장 용량 증가나
                                        불필요한 쓰기 요청 증가로 직접 비용에
                                        연결될 수 있습니다. 중복 생성이 없더라도
                                        실행 과정의 읽기/쓰기 요청은 별도로 과금
                                        대상일 수 있습니다.
                                    </p>
                                </div>
                                <p>
                                    <strong className="text-(--color-foreground)">
                                        Vercel 함수 실행
                                    </strong>
                                    : server action 또는 API route가 오래
                                    실행될수록 함수 실행 시간과 메모리 사용량이
                                    늘어날 수 있음을 뜻합니다. 실행 중에는 admin
                                    화면 응답이 잠시 느려질 수 있습니다.
                                </p>
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200">
                                    <p className="font-semibold">
                                        💸 과금과의 관계
                                    </p>
                                    <p className="mt-1">
                                        Vercel Hobby는 무료 플랜이지만 포함량을
                                        넘기면 직접 과금보다 quota 소모와 일시
                                        제한이 더 큰 리스크입니다.
                                    </p>
                                    <div className="mt-2 space-y-1 font-medium">
                                        <p>• 함수 호출: 월 1,000,000회</p>
                                        <p>• Function Duration: 100 GB-Hours</p>
                                        <p>
                                            • 최대 실행 시간: 기본 10초, 최대
                                            60초
                                        </p>
                                    </div>
                                </div>
                                <p>
                                    <strong className="text-(--color-foreground)">
                                        Cloudflare R2 사용량
                                    </strong>
                                    : R2의 <code>LIST</code>, <code>HEAD</code>,{" "}
                                    <code>GET</code>, <code>PUT</code>,{" "}
                                    <code>DELETE</code> 요청량이 늘어날 수
                                    있음을 뜻합니다.
                                </p>
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200">
                                    <p className="font-semibold">
                                        💸 과금과의 관계
                                    </p>
                                    <p className="mt-1">
                                        Cloudflare R2는 이 항목에서 가장
                                        직접적인 비용 리스크입니다. 대량
                                        자산일수록 free tier를 먼저 잠식할 수
                                        있습니다.
                                    </p>
                                    <div className="mt-2 space-y-1 font-medium">
                                        <p>• Storage: 월 10 GB</p>
                                        <p>• Class A: 월 1,000,000 요청</p>
                                        <p>• Class B: 월 10,000,000 요청</p>
                                        <p>• DeleteObject: 무료</p>
                                        <p>• Egress: 무료</p>
                                    </div>
                                    <p className="mt-2">
                                        이 작업에서 <code>LIST</code>,{" "}
                                        <code>PUT</code>는 Class A,{" "}
                                        <code>HEAD</code>, <code>GET</code>은
                                        Class B, <code>DELETE</code>는 무료에
                                        해당합니다.
                                    </p>
                                </div>
                                <p>
                                    <strong className="text-(--color-foreground)">
                                        Supabase 영향
                                    </strong>
                                    : 이 debug 항목이 Supabase Database,
                                    Supabase Storage, Supabase Edge Functions를
                                    직접 호출하는지 여부를 뜻합니다.
                                </p>
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200">
                                    <p className="font-semibold">
                                        💸 과금과의 관계
                                    </p>
                                    <p className="mt-1">
                                        Supabase free tier 자체는 quota가
                                        있지만, 현재 lightbox sidecar backfill은
                                        Supabase를 직접 사용하지 않으므로 이
                                        항목에는 직접 영향이 없습니다.
                                    </p>
                                    <div className="mt-2 space-y-1 font-medium">
                                        <p>• Free project: 최대 2개</p>
                                        <p>
                                            • Database Size: 프로젝트당 500 MB
                                        </p>
                                        <p>• Storage Size: 1 GB</p>
                                        <p>
                                            • Edge Function Invocations: 500,000
                                        </p>
                                        <p>• Bandwidth: 10 GB</p>
                                    </div>
                                </div>
                                <p>
                                    <strong className="text-(--color-foreground)">
                                        권장 실행 횟수
                                    </strong>
                                    : 동일 작업을 얼마나 자주 실행하는 게
                                    적절한지 알려줍니다.
                                </p>
                                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-800 dark:text-amber-200">
                                    <p className="font-semibold">
                                        💸 과금과의 관계
                                    </p>
                                    <p className="mt-1">
                                        권장 실행 횟수를 넘겨 반복 실행하면 같은
                                        결과를 얻기 위해 불필요한 함수 실행과
                                        storage 요청을 다시 발생시킬 수
                                        있습니다. 즉 직접적인 기능 이득 없이
                                        free tier quota만 줄어들 가능성이
                                        큽니다.
                                    </p>
                                </div>
                            </div>
                        </section>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={detail !== null}
                onOpenChange={(open) => {
                    if (!open) setDetail(null);
                }}
            >
                <DialogContent className="tablet:max-w-2xl max-h-[80vh] overflow-y-auto border-(--color-border) bg-(--color-surface) text-(--color-foreground)">
                    <DialogHeader>
                        <DialogTitle>{detail?.title}</DialogTitle>
                        <DialogDescription className="leading-6 whitespace-pre-line">
                            {detail?.description}
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

            <Dialog open={progressOpen} onOpenChange={() => {}}>
                <DialogContent
                    showCloseButton={false}
                    className="tablet:max-w-lg border-(--color-border) bg-(--color-surface) text-(--color-foreground)"
                >
                    <DialogHeader>
                        <DialogTitle>Backfill 실행 중</DialogTitle>
                        <DialogDescription>
                            기존 자산을 순회하면서 missing thumb를 생성하고 기존
                            poster를 정리하고 있습니다. bucket 크기에 따라
                            시간이 걸릴 수 있습니다.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <div className="h-3 overflow-hidden rounded-full bg-(--color-surface-subtle)">
                            <div
                                className="h-full rounded-full bg-(--color-accent) transition-[width] duration-500"
                                style={{ width: `${progressValue}%` }}
                            />
                        </div>
                        <p className="text-sm text-(--color-muted)">
                            {progressLabel} {progressValue}%
                        </p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
