import { useEffect } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminDashboard from "@/components/admin/AdminDashboard";

const mounts = vi.hoisted(() => ({ main: vi.fn(), resume: vi.fn() }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("@/components/admin/AdminHeader", () => ({ default: () => null }));
vi.mock("@/components/admin/AdminSidebar", () => ({
    default: () => null,
    REFUGE_ADMIN_TABS: ["main", "resume"],
}));
vi.mock("@/components/admin/CommandPalette", () => ({ default: () => null }));
vi.mock("@/components/admin/ContentLanguageSelector", () => ({
    ContentLanguageSelector: () => null,
}));
vi.mock("@/components/admin/panels/MainPanel", () => ({
    default: () => {
        useEffect(() => {
            mounts.main();
        }, []);
        return <div data-testid="main-panel" />;
    },
}));
vi.mock("@/components/admin/panels/ResumePanel", () => ({
    default: () => {
        useEffect(() => {
            mounts.resume();
        }, []);
        return <div data-testid="resume-panel" />;
    },
}));
vi.mock("@/components/admin/panels/PostsPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/PortfolioPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/VideoGifPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/TagsPanel", () => ({ default: () => null }));
vi.mock("@/components/admin/panels/GanttChartPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/AboutPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/SiteConfigPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/AgentTokensPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/SnapshotsPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/PromptLibraryPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/DebugPanel", () => ({
    default: () => null,
}));
vi.mock("@/components/admin/panels/ApplicationProfilesPanel", () => ({
    default: () => null,
}));

const originalURL = window.location.href;
beforeEach(() => {
    vi.clearAllMocks();
});
afterEach(() => {
    cleanup();
    window.history.replaceState(null, "", originalURL);
});

describe("관리자 최초 탭 복원", () => {
    it("이력서 직접 진입에서 메인 초기 조회 없이 이력서만 mount", () => {
        window.history.replaceState(null, "", "/admin#resume");
        render(<AdminDashboard />);

        expect(screen.getByTestId("resume-panel")).toBeInTheDocument();
        expect(mounts.resume).toHaveBeenCalledOnce();
        expect(mounts.main).not.toHaveBeenCalled();
    });

    it.each(["", "#main"])(
        "기본 메인 주소 %s는 초기 탭 확인 후 한 번만 mount",
        (hash) => {
            window.history.replaceState(null, "", `/admin${hash}`);
            render(<AdminDashboard />);

            expect(screen.getByTestId("main-panel")).toBeInTheDocument();
            expect(mounts.main).toHaveBeenCalledOnce();
            expect(mounts.resume).not.toHaveBeenCalled();
        }
    );
});
