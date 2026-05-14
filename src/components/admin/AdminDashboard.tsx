"use client";

import { useState, useEffect, useRef } from "react";
import { signOut } from "next-auth/react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import CommandPalette from "@/components/admin/CommandPalette";
import MainPanel from "@/components/admin/panels/MainPanel";
import PostsPanel from "@/components/admin/panels/PostsPanel";
import PortfolioPanel from "@/components/admin/panels/PortfolioPanel";
import VideoGifPanel from "@/components/admin/panels/VideoGifPanel";
import TagsPanel from "@/components/admin/panels/TagsPanel";
import GanttChartPanel from "@/components/admin/panels/GanttChartPanel";
import AboutPanel from "@/components/admin/panels/AboutPanel";
import SiteConfigPanel from "@/components/admin/panels/SiteConfigPanel";
import ResumePanel from "@/components/admin/panels/ResumePanel";
import AgentTokensPanel from "@/components/admin/panels/AgentTokensPanel";
import SnapshotsPanel from "@/components/admin/panels/SnapshotsPanel";
import PromptLibraryPanel from "@/components/admin/panels/PromptLibraryPanel";
import DebugPanel from "@/components/admin/panels/DebugPanel";
import { REFUGE_ADMIN_TABS, type TabId } from "@/components/admin/AdminSidebar";

// 비활동 제한 시간 (1시간)
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;

// 자동 로그아웃 경고 시점 (1분 전)
const WARN_BEFORE_MS = 60 * 1000;

// 자체 높이를 관리하는 패널 목록
const PANELS_OWN_HEIGHT = new Set<TabId>([
    "posts",
    "portfolio",
    "video-gif",
    "gantt-chart",
    "resume",
    "snapshots",
    "agent-tokens",
    "prompts",
    "debug",
    "config",
]);

// 활동 감지 이벤트 목록
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll"] as const;
const DEFAULT_TAB: TabId = "main";

// 유효한 탭 ID 목록
const VALID_TABS: TabId[] = [
    "main",
    "posts",
    "portfolio",
    "video-gif",
    "tags",
    "gantt-chart",
    "about",
    "resume",
    "snapshots",
    "agent-tokens",
    "prompts",
    "debug",
    "config",
];

// hash에서 tab + editPath 추출 (예: "posts/edit/my-slug" → { tab: "posts", editPath: "edit/my-slug" })
function parseHash(
    raw: string,
    allowedTabs: readonly TabId[] = VALID_TABS
): { tab: TabId; editPath: string } {
    const hash = raw.replace("#", "");
    const slashIdx = hash.indexOf("/");
    const tabPart = slashIdx === -1 ? hash : hash.slice(0, slashIdx);
    const editPath = slashIdx === -1 ? "" : hash.slice(slashIdx + 1);
    const tab = allowedTabs.includes(tabPart as TabId)
        ? (tabPart as TabId)
        : DEFAULT_TAB;
    return { tab, editPath };
}

type AdminDashboardProps = {
    refugeMode?: boolean;
};

export default function AdminDashboard({
    refugeMode = false,
}: AdminDashboardProps) {
    const allowedTabs: readonly TabId[] = refugeMode
        ? REFUGE_ADMIN_TABS
        : VALID_TABS;
    const [activeTab, setActiveTab] = useState<TabId>(DEFAULT_TAB);

    // 초기 editPath (새로고침 시 편집 상태 복원용)
    const [editPath, setEditPath] = useState("");

    const [tabKey, setTabKey] = useState(0);
    const [hashReady, setHashReady] = useState(false);
    const [commandOpen, setCommandOpen] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarVisible, setSidebarVisible] = useState(true);
    const [remainingMs, setRemainingMs] = useState(INACTIVITY_LIMIT_MS);
    const lastActivityRef = useRef(Date.now());
    const warnedRef = useRef(false);
    const panelOwnsHeight = PANELS_OWN_HEIGHT.has(activeTab);

    useEffect(() => {
        const handleHashChange = () => {
            const parsed = parseHash(window.location.hash, allowedTabs);
            setActiveTab(parsed.tab);
            setEditPath(parsed.editPath);
        };

        handleHashChange();
        setHashReady(true);
        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
    }, [allowedTabs]);

    useEffect(() => {
        if (!hashReady) return;
        const suffix = editPath ? `/${editPath}` : "";
        window.history.replaceState(null, "", `#${activeTab}${suffix}`);
    }, [activeTab, editPath, hashReady]);

    useEffect(() => {
        if (activeTab === "video-gif") {
            setSidebarVisible(false);
        }
    }, [activeTab]);

    // 비활동 타이머: 1초마다 남은 시간 갱신, 만료 시 자동 로그아웃
    useEffect(() => {
        const refreshActivity = () => {
            lastActivityRef.current = Date.now();
        };
        ACTIVITY_EVENTS.forEach((e) =>
            window.addEventListener(e, refreshActivity, { passive: true })
        );

        // 탭이 보일 때 활동 시간 리셋 (숨겨진 동안 타이머 누적 방지)
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                lastActivityRef.current = Date.now();
                warnedRef.current = false;
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        const tick = setInterval(async () => {
            // 탭이 숨겨진 상태면 자동 로그아웃 보류
            if (document.visibilityState === "hidden") return;

            const elapsed = Date.now() - lastActivityRef.current;
            const remaining = INACTIVITY_LIMIT_MS - elapsed;
            if (remaining <= 0) {
                clearInterval(tick);
                await signOut({ callbackUrl: "/admin/login" });
            } else {
                setRemainingMs(remaining);
                // 만료 1분 전 경고 (1회)
                if (remaining <= WARN_BEFORE_MS && !warnedRef.current) {
                    warnedRef.current = true;
                    const extend = window.confirm(
                        "1분 후 비활동으로 자동 로그아웃됩니다. 세션을 연장하시겠습니까?"
                    );
                    if (extend) {
                        lastActivityRef.current = Date.now();
                        warnedRef.current = false;
                    }
                }
            }
        }, 1000);

        return () => {
            clearInterval(tick);
            ACTIVITY_EVENTS.forEach((e) =>
                window.removeEventListener(e, refreshActivity)
            );
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, []);

    // 패널에서 편집 상태 변경 시 hash 업데이트
    const handleEditPathChange = (path: string) => {
        setEditPath(path);
    };

    // 탭 클릭 핸들러
    const handleTabClick = (tabId: TabId) => {
        if (!allowedTabs.includes(tabId)) return;
        if (activeTab === tabId) {
            setTabKey((prev) => prev + 1);
        } else {
            setActiveTab(tabId);
            setEditPath("");
            setTabKey(0);
        }
    };

    // 모든 기기에서 로그아웃
    const handleLogout = async () => {
        await signOut({ callbackUrl: "/admin/login" });
    };

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-(--color-surface)">
            {/* 헤더: 전체 너비 */}
            <AdminHeader
                timeLeft={remainingMs}
                onLogout={handleLogout}
                onCommandOpen={() => setCommandOpen(true)}
                onMenuOpen={() => setSidebarOpen(true)}
                sidebarVisible={sidebarVisible}
                onToggleSidebar={() => setSidebarVisible((v) => !v)}
            />

            {/* 사이드바 + 메인: 헤더 아래 */}
            <div className="flex flex-1 overflow-hidden">
                <AdminSidebar
                    activeTab={activeTab}
                    onTabClick={(id) => {
                        handleTabClick(id);
                        setSidebarOpen(false);
                    }}
                    open={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    visible={sidebarVisible}
                    refugeMode={refugeMode}
                />

                <div className="flex flex-1 flex-col overflow-hidden">
                    <main
                        className={`tablet:p-4 laptop:p-6 flex-1 p-2 ${
                            PANELS_OWN_HEIGHT.has(activeTab)
                                ? "overflow-hidden"
                                : "overflow-y-auto"
                        }`}
                    >
                        {/* 패널 컨텐츠, p-2 를 통해 잘리는 ring 없도록 함 */}
                        <div
                            className={`tablet:p-2 p-4 ${
                                panelOwnsHeight
                                    ? "flex h-full min-h-0 flex-col"
                                    : ""
                            }`}
                        >
                            {activeTab === "main" && (
                                <MainPanel
                                    key={`main-${tabKey}`}
                                    refugeMode={refugeMode}
                                    onNavigate={handleTabClick}
                                />
                            )}
                            {activeTab === "posts" && (
                                <PostsPanel
                                    key={`posts-${tabKey}`}
                                    editPath={editPath}
                                    onEditPathChange={handleEditPathChange}
                                />
                            )}
                            {activeTab === "portfolio" && (
                                <PortfolioPanel
                                    key={`portfolio-${tabKey}`}
                                    editPath={editPath}
                                    onEditPathChange={handleEditPathChange}
                                />
                            )}
                            {activeTab === "video-gif" && (
                                <VideoGifPanel key={`video-gif-${tabKey}`} />
                            )}
                            {activeTab === "tags" && (
                                <TagsPanel key={`tags-${tabKey}`} />
                            )}
                            {activeTab === "gantt-chart" && (
                                <GanttChartPanel
                                    key={`gantt-chart-${tabKey}`}
                                />
                            )}
                            {activeTab === "about" && (
                                <AboutPanel key={`about-${tabKey}`} />
                            )}
                            {activeTab === "resume" && (
                                <ResumePanel key={`resume-${tabKey}`} />
                            )}
                            {activeTab === "snapshots" && (
                                <SnapshotsPanel key={`snapshots-${tabKey}`} />
                            )}
                            {activeTab === "agent-tokens" && (
                                <AgentTokensPanel
                                    key={`agent-tokens-${tabKey}`}
                                />
                            )}
                            {activeTab === "prompts" && (
                                <PromptLibraryPanel key={`prompts-${tabKey}`} />
                            )}
                            {activeTab === "debug" && (
                                <DebugPanel key={`debug-${tabKey}`} />
                            )}
                            {activeTab === "config" && (
                                <SiteConfigPanel key={`config-${tabKey}`} />
                            )}
                        </div>
                    </main>
                    {/* 저장 바 슬롯: AdminSaveBar portal이 여기 렌더링 */}
                    <div id="admin-save-bar-slot" />
                </div>
            </div>

            <CommandPalette
                open={commandOpen}
                onOpenChange={setCommandOpen}
                onNavigate={handleTabClick}
                refugeMode={refugeMode}
            />
        </div>
    );
}
