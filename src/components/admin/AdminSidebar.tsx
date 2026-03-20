"use client";

import {
    FileText,
    Briefcase,
    Tag,
    User,
    ScrollText,
    Database,
    Settings,
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
    | "config";

interface AdminSidebarProps {
    activeTab: TabId;
    onTabClick: (tabId: TabId) => void;
}

// 어드민 사이드바 네비게이션
export default function AdminSidebar({
    activeTab,
    onTabClick,
}: AdminSidebarProps) {
    return (
        <nav className="flex w-48 shrink-0 flex-col border-r border-(--color-border) bg-(--color-surface) py-4">
            {SECTIONS.map((section, sectionIdx) => (
                <div key={section.label}>
                    {sectionIdx > 0 && (
                        <div className="mx-4 my-2 h-px bg-(--color-border)" />
                    )}
                    <p className="mb-1 px-4 text-[10px] font-bold tracking-[0.15em] text-(--color-muted) uppercase">
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
                                    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors",
                                    isActive
                                        ? "border-l-2 border-(--color-accent) bg-(--color-surface-subtle) text-(--color-foreground)"
                                        : "border-l-2 border-transparent text-(--color-muted) hover:bg-(--color-surface-subtle) hover:text-(--color-foreground)",
                                ].join(" ")}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            ))}
        </nav>
    );
}
