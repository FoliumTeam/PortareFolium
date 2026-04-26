"use client";
// ⌘K / Ctrl+K 커맨드 팔레트

import { useEffect } from "react";
import {
    FileText,
    Briefcase,
    Tag,
    ChartNoAxesGantt,
    User,
    ScrollText,
    Database,
    Settings,
    Plus,
    MessageSquare,
} from "lucide-react";
import { REFUGE_ADMIN_TABS, type TabId } from "@/components/admin/AdminSidebar";
import {
    CommandDialog,
    CommandInput,
    CommandList,
    CommandEmpty,
    CommandGroup,
    CommandItem,
} from "@/components/ui/command";

type CommandPaletteProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onNavigate: (tab: TabId) => void;
    refugeMode?: boolean;
};

// 패널 탐색 명령 목록
const NAV_COMMANDS = [
    { tab: "posts", label: "Posts로 이동", icon: FileText },
    { tab: "portfolio", label: "Portfolio로 이동", icon: Briefcase },
    { tab: "tags", label: "Tags로 이동", icon: Tag },
    { tab: "gantt-chart", label: "Gantt Chart로 이동", icon: ChartNoAxesGantt },
    { tab: "about", label: "About으로 이동", icon: User },
    { tab: "resume", label: "Resume으로 이동", icon: ScrollText },
    { tab: "migrations", label: "Migrations으로 이동", icon: Database },
    { tab: "snapshots", label: "Snapshots으로 이동", icon: Database },
    { tab: "prompts", label: "Prompt Library로 이동", icon: MessageSquare },
    { tab: "config", label: "Site Config으로 이동", icon: Settings },
] as const;

// 액션 명령 목록
const ACTION_COMMANDS = [
    { tab: "posts", label: "새 포스트", icon: Plus },
    { tab: "portfolio", label: "새 포트폴리오 항목", icon: Plus },
] as const;

export default function CommandPalette({
    open,
    onOpenChange,
    onNavigate,
    refugeMode = false,
}: CommandPaletteProps) {
    // 키보드 단축키 등록
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                onOpenChange(true);
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onOpenChange]);

    const navCommands = refugeMode
        ? NAV_COMMANDS.filter((cmd) =>
              REFUGE_ADMIN_TABS.includes(
                  cmd.tab as (typeof REFUGE_ADMIN_TABS)[number]
              )
          )
        : NAV_COMMANDS;

    // 명령 선택 핸들러
    const handleSelect = (tab: TabId) => {
        onNavigate(tab);
        onOpenChange(false);
    };

    return (
        <CommandDialog
            open={open}
            onOpenChange={onOpenChange}
            title="커맨드 팔레트"
            description="패널 탐색 및 액션 검색"
            showCloseButton={false}
            className="max-w-lg bg-(--color-surface-subtle)"
        >
            <CommandInput placeholder="명령 검색..." />
            <CommandList>
                <CommandEmpty>결과 없음</CommandEmpty>
                <CommandGroup heading="탐색">
                    {navCommands.map((cmd) => {
                        const Icon = cmd.icon;
                        return (
                            <CommandItem
                                key={cmd.tab}
                                onSelect={() => handleSelect(cmd.tab)}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{cmd.label}</span>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
                <CommandGroup heading="액션">
                    {ACTION_COMMANDS.map((cmd) => {
                        const Icon = cmd.icon;
                        return (
                            <CommandItem
                                key={cmd.label}
                                onSelect={() => handleSelect(cmd.tab)}
                            >
                                <Icon className="h-4 w-4" />
                                <span>{cmd.label}</span>
                            </CommandItem>
                        );
                    })}
                </CommandGroup>
            </CommandList>
        </CommandDialog>
    );
}
