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
import { useState, useEffect } from "react";
import { browserClient } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import PostsPanel from "@/components/admin/panels/PostsPanel";
import PortfolioPanel from "@/components/admin/panels/PortfolioPanel";
import TagsPanel from "@/components/admin/panels/TagsPanel";
import AboutPanel from "@/components/admin/panels/AboutPanel";
import SiteConfigPanel from "@/components/admin/panels/SiteConfigPanel";
import ResumePanel from "@/components/admin/panels/ResumePanel";

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

    const handleTabClick = (tabId: TabId) => {
        if (activeTab === tabId) {
            setTabKey((prev) => prev + 1); // 이미 활성화된 탭 클릭 시 리마운트(목록뷰 복귀)
        } else {
            setActiveTab(tabId);
            setTabKey(0);
        }
    };

    /** 로그아웃 처리 */
    const handleLogout = async () => {
        if (!browserClient) return;
        await browserClient.auth.signOut();
        window.location.href = "/admin/login";
    };

    return (
        <div className="flex min-h-screen flex-col">
            {/* 헤더 */}
            <header className="flex items-center justify-between border-b border-(--color-border) bg-(--color-surface) px-6 py-3">
                <div className="flex items-center gap-3">
                    <a
                        href="/"
                        className="text-base font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                    >
                        ← 사이트
                    </a>
                    <span className="text-(--color-border)">|</span>
                    <span className="text-base font-bold text-(--color-foreground)">
                        Admin Dashboard
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle />
                    <button
                        onClick={handleLogout}
                        className="rounded-md px-3 py-1.5 text-base text-(--color-muted) transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                    >
                        로그아웃
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* 사이드바 탭 */}
                <nav className="flex w-48 shrink-0 flex-col gap-1 border-r border-(--color-border) bg-(--color-surface-subtle) px-2 py-4">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={[
                                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-base font-medium transition-colors",
                                activeTab === tab.id
                                    ? "bg-(--color-accent) text-(--color-on-accent)"
                                    : "text-(--color-muted) hover:bg-(--color-border) hover:text-(--color-foreground)",
                            ].join(" ")}
                        >
                            <span>{tab.icon}</span>
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>

                <main className="flex-1 overflow-y-auto p-6">
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
