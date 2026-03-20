"use client";

import { useState, useEffect, useRef } from "react";
import { browserClient } from "@/lib/supabase";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import PostsPanel from "@/components/admin/panels/PostsPanel";
import PortfolioPanel from "@/components/admin/panels/PortfolioPanel";
import TagsPanel from "@/components/admin/panels/TagsPanel";
import AboutPanel from "@/components/admin/panels/AboutPanel";
import SiteConfigPanel from "@/components/admin/panels/SiteConfigPanel";
import ResumePanel from "@/components/admin/panels/ResumePanel";
import MigrationsPanel from "@/components/admin/panels/MigrationsPanel";
import type { TabId } from "@/components/admin/AdminSidebar";

// 비활동 제한 시간 (1시간)
const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;

// 활동 감지 이벤트 목록
const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "scroll"] as const;

// 유효한 탭 ID 목록
const VALID_TABS: TabId[] = [
    "posts",
    "portfolio",
    "tags",
    "about",
    "resume",
    "migrations",
    "config",
];

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        if (typeof window !== "undefined") {
            const hash = window.location.hash.replace("#", "");
            if (hash && VALID_TABS.includes(hash as TabId)) {
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
            if (hash && VALID_TABS.includes(hash as TabId)) {
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

    // 탭 클릭 핸들러
    const handleTabClick = (tabId: TabId) => {
        if (activeTab === tabId) {
            setTabKey((prev) => prev + 1);
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
        <div className="flex h-screen overflow-hidden bg-(--color-surface)">
            <AdminSidebar activeTab={activeTab} onTabClick={handleTabClick} />

            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminHeader timeLeft={remainingMs} onLogout={handleLogout} />

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
                    {activeTab === "migrations" && (
                        <MigrationsPanel key={`migrations-${tabKey}`} />
                    )}
                    {activeTab === "config" && (
                        <SiteConfigPanel key={`config-${tabKey}`} />
                    )}
                </main>
            </div>
        </div>
    );
}
