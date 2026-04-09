"use client";

import {
    FileText,
    Briefcase,
    Tag,
    User,
    ScrollText,
    Database,
    Settings,
    KeyRound,
    Archive,
    MessageSquare,
    ExternalLink,
} from "lucide-react";
import type { ComponentType } from "react";

// 탭 정의
const SECTIONS = [
    {
        label: "Content",
        items: [
            { id: "posts", label: "포스트", icon: FileText },
            { id: "portfolio", label: "포트폴리오", icon: Briefcase },
            { id: "tags", label: "태그", icon: Tag },
        ],
    },
    {
        label: "Profile",
        items: [
            { id: "about", label: "About", icon: User },
            { id: "resume", label: "이력서", icon: ScrollText },
        ],
    },
    {
        label: "System",
        items: [
            { id: "migrations", label: "DB 마이그레이션", icon: Database },
            { id: "snapshots", label: "스냅샷", icon: Archive },
            { id: "agent-tokens", label: "Agent 토큰", icon: KeyRound },
            {
                id: "prompts",
                label: "프롬프트 라이브러리",
                icon: MessageSquare,
            },
            { id: "config", label: "사이트 설정", icon: Settings },
        ],
    },
] as const;

export type TabId =
    | "posts"
    | "portfolio"
    | "tags"
    | "about"
    | "resume"
    | "migrations"
    | "snapshots"
    | "agent-tokens"
    | "prompts"
    | "config";

interface AdminSidebarProps {
    activeTab: TabId;
    onTabClick: (tabId: TabId) => void;
    open: boolean;
    onClose: () => void;
    visible?: boolean;
}

// 어드민 사이드바 네비게이션
export default function AdminSidebar({
    activeTab,
    onTabClick,
    open,
    onClose,
    visible = true,
}: AdminSidebarProps) {
    return (
        <>
            {/* 모바일 오버레이 배경 */}
            {open && (
                <div
                    className="tablet:hidden fixed inset-0 z-30 bg-black/40"
                    onClick={onClose}
                />
            )}
            {/* 사이드바 본체 */}
            <nav
                className={[
                    "flex shrink-0 flex-col overflow-hidden border-r border-(--color-border) bg-(--color-surface) py-4 transition-all duration-200",
                    "fixed inset-y-0 left-0 z-40 w-48",
                    "tablet:relative tablet:z-auto",
                    visible ? "tablet:w-48" : "tablet:w-0 tablet:border-r-0",
                    open
                        ? "translate-x-0"
                        : "tablet:translate-x-0 -translate-x-full",
                ].join(" ")}
            >
                {SECTIONS.map((section, sectionIdx) => (
                    <div key={section.label}>
                        {sectionIdx > 0 && (
                            // 섹션 구분선
                            <div className="mx-3 my-2.5 h-px bg-(--color-border) opacity-70" />
                        )}
                        <p className="mb-1 px-4 text-[10px] font-black tracking-[0.2em] text-(--color-muted) uppercase">
                            {section.label}
                        </p>
                        {section.items.map((item) => {
                            const Icon: ComponentType<{ className?: string }> =
                                item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onTabClick(item.id as TabId)}
                                    className={[
                                        // 사이드바 아이템 기본 스타일
                                        "admin-sidebar-item flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-sm font-medium transition-colors",
                                        isActive
                                            ? "border-l-2 border-(--color-accent) bg-(--color-accent)/8 text-(--color-foreground)"
                                            : "border-l-2 border-transparent text-(--color-muted) hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)",
                                    ].join(" ")}
                                >
                                    <Icon
                                        className={[
                                            "h-3.5 w-3.5 shrink-0",
                                            isActive
                                                ? "text-(--color-accent)"
                                                : "",
                                        ].join(" ")}
                                    />
                                    <span>{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
                {/* 사이트 링크 */}
                <div className="mt-auto border-t border-(--color-border) px-4 pt-3 pb-2">
                    <a
                        href="/"
                        className="flex items-center gap-3 text-sm font-medium text-(--color-muted) transition-colors hover:text-(--color-foreground)"
                    >
                        <ExternalLink className="h-4 w-4 shrink-0" />
                        <span>사이트로 이동</span>
                    </a>
                </div>
            </nav>
        </>
    );
}
