/**
 * AdminDashboard
 *
 * 어드민 대시보드 메인 컴포넌트.
 * 사이드바 탭으로 각 관리 섹션을 전환한다:
 *   - 포스트: 블로그 글 CRUD
 *   - 포트폴리오: 포트폴리오 아이템 CRUD
 *   - About: about_data 편집 및 Supabase 저장
 *   - 사이트 설정: 컬러 스킴 등 site_config 관리 + 빌드 트리거
 *
 * 로그아웃 버튼은 헤더에 위치한다.
 */
import { useState, useEffect, useRef } from "react";
import { browserClient } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import PostsPanel from "@/components/admin/panels/PostsPanel";
import PortfolioPanel from "@/components/admin/panels/PortfolioPanel";
import TagsPanel from "@/components/admin/panels/TagsPanel";
import AboutPanel from "@/components/admin/panels/AboutPanel";
import SiteConfigPanel from "@/components/admin/panels/SiteConfigPanel";
import ResumePanel from "@/components/admin/panels/ResumePanel";

// 비활동 제한 시간 (1시간)
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;

// 활동 감지 이벤트 목록
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll"] as const;

// 남은 시간을 MM:SS 형식으로 변환
function formatRemaining(ms: number): string {
    const totalSec = Math.max(0, Math.ceil(ms / 1000));
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

// 탭 정의
const TABS = [
    { id: "posts", label: "포스트", icon: "📝" },
    { id: "portfolio", label: "포트폴리오", icon: "🗂️" },
    { id: "tags", label: "태그", icon: "🏷️" },
    { id: "about", label: "About", icon: "👤" },
    { id: "resume", label: "이력서", icon: "📄" },
    { id: "config", label: "사이트 설정", icon: "⚙️" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        if (typeof window !== "undefined") {
            const hash = window.location.hash.replace("#", "");
            if (hash && TABS.some((t) => t.id === hash)) {
                return hash as TabId;
            }
        }
        return "posts";
    });

    const [tabKey, setTabKey] = useState(0);
    const [remainingMs, setRemainingMs] = useState(INACTIVITY_LIMIT_MS);
    const lastActivityRef = useRef(Date.now());

    useEffect(() => {
        window.history.replaceState(null, "", `#${activeTab}`);

        const handleHashChange = () => {
            const hash = window.location.hash.replace("#", "");
            if (hash && TABS.some((t) => t.id === hash)) {
                setActiveTab(hash as TabId);
            }
        };
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, [activeTab]);

    // 비활동 타이머: 1초마다 남은 시간 갱신, 만료 시 자동 로그아웃
    useEffect(() => {
        const refreshActivity = () => {
            lastActivityRef.current = Date.now();
        };
        ACTIVITY_EVENTS.forEach((e) =>
            window.addEventListener(e, refreshActivity, { passive: true })
        );

        const tick = setInterval(async () => {
            const elapsed = Date.now() - lastActivityRef.current;
            const remaining = INACTIVITY_LIMIT_MS - elapsed;
            if (remaining <= 0) {
                clearInterval(tick);
                if (browserClient)
                    await browserClient.auth.signOut({ scope: "global" });
                window.location.href = "/admin/login";
            } else {
                setRemainingMs(remaining);
            }
        }, 1000);

        return () => {
            clearInterval(tick);
            ACTIVITY_EVENTS.forEach((e) =>
                window.removeEventListener(e, refreshActivity)
            );
        };
    }, []);

    const handleTabClick = (tabId: TabId) => {
        if (activeTab === tabId) {
            setTabKey((prev) => prev + 1); // 이미 활성화된 탭 클릭 시 리마운트(목록뷰 복귀)
        } else {
            setActiveTab(tabId);
            setTabKey(0);
        }
    };

    // 모든 기기에서 로그아웃
    const handleLogout = async () => {
        if (!browserClient) return;
        await browserClient.auth.signOut({ scope: "global" });
        window.location.href = "/admin/login";
    };

    return (
        <div className="flex min-h-screen flex-col">
            {/* 헤더 */}
            <header className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface)/90 px-6 py-3 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <a
                        href="/"
                        className="flex items-center gap-1.5 text-sm font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                    >
                        <svg
                            className="h-3.5 w-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 19l-7-7 7-7"
                            />
                        </svg>
                        사이트
                    </a>
                    <span
                        className="h-4 w-px bg-(--color-border)"
                        aria-hidden="true"
                    />
                    <div className="flex items-center gap-2">
                        <span
                            className="h-2 w-2 rounded-full bg-(--color-accent)"
                            aria-hidden="true"
                        />
                        <span className="text-sm font-black tracking-tight text-(--color-foreground)">
                            Admin
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {/* 비활동 만료까지 남은 시간 */}
                    <span
                        className={[
                            "font-mono text-xs tabular-nums",
                            remainingMs <= 5 * 60 * 1000
                                ? "text-red-500"
                                : "text-(--color-muted)",
                        ].join(" ")}
                    >
                        {formatRemaining(remainingMs)}
                    </span>
                    <ThemeToggle />
                    <button
                        onClick={handleLogout}
                        className="rounded-full border border-(--color-border) px-4 py-1.5 text-sm font-medium text-(--color-muted) transition-colors hover:border-red-400 hover:text-red-500"
                    >
                        로그아웃
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* 사이드바 */}
                <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-(--color-border) bg-(--color-surface-subtle) px-3 py-5">
                    <p className="mb-3 px-2 text-[10px] font-bold tracking-[0.15em] text-(--color-muted) uppercase">
                        메뉴
                    </p>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={[
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                                activeTab === tab.id
                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                    : "text-(--color-muted) hover:bg-(--color-surface) hover:text-(--color-foreground)",
                            ].join(" ")}
                        >
                            <span className="text-base leading-none">
                                {tab.icon}
                            </span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <main className="flex-1 overflow-y-auto p-8">
                    {activeTab === "posts" && (
                        <PostsPanel key={`posts-${tabKey}`} />
                    )}
                    {activeTab === "portfolio" && (
                        <PortfolioPanel key={`portfolio-${tabKey}`} />
                    )}
                    {activeTab === "tags" && (
                        <TagsPanel key={`tags-${tabKey}`} />
                    )}
                    {activeTab === "about" && (
                        <AboutPanel key={`about-${tabKey}`} />
                    )}
                    {activeTab === "resume" && (
                        <ResumePanel key={`resume-${tabKey}`} />
                    )}
                    {activeTab === "config" && (
                        <SiteConfigPanel key={`config-${tabKey}`} />
                    )}
                </main>
            </div>
        </div>
    );
}
