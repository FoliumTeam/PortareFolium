import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = Record<string, unknown>;

const db = vi.hoisted(() => {
    const state = { rows: [] as Row[], writes: 0, seq: 0 };
    class Query {
        private op: "select" | "insert" | "update" | "delete" = "select";
        private payload: Row | null = null;
        private filters: [string, unknown][] = [];
        select() {
            return this;
        }
        insert(p: Row) {
            this.op = "insert";
            this.payload = p;
            return this;
        }
        update(p: Row) {
            this.op = "update";
            this.payload = p;
            return this;
        }
        delete() {
            this.op = "delete";
            return this;
        }
        eq(k: string, v: unknown) {
            this.filters.push([k, v]);
            return this;
        }
        order() {
            return this;
        }
        private hit(r: Row) {
            return this.filters.every(([k, v]) => r[k] === v);
        }
        private run(single: boolean) {
            let out: Row[] = [];
            if (this.op === "insert" && this.payload) {
                const row = {
                    id: `00000000-0000-4000-8000-00000000000${++state.seq}`,
                    ...this.payload,
                };
                state.rows.push(row);
                state.writes++;
                out = [row];
            } else if (this.op === "update" && this.payload) {
                state.rows = state.rows.map((r) =>
                    this.hit(r) ? { ...r, ...this.payload } : r
                );
                state.writes++;
                out = state.rows.filter((r) => this.hit(r));
            } else if (this.op === "delete") {
                state.rows = state.rows.filter((r) => !this.hit(r));
                state.writes++;
            } else out = state.rows.filter((r) => this.hit(r));
            return { data: single ? (out[0] ?? null) : out, error: null };
        }
        single() {
            return Promise.resolve(this.run(true));
        }
        then<A, B>(
            ok?: ((v: unknown) => A | PromiseLike<A>) | null,
            fail?: ((e: unknown) => B | PromiseLike<B>) | null
        ) {
            return Promise.resolve(this.run(false)).then(ok, fail);
        }
    }
    return { state, client: { from: () => new Query() } };
});

const admin = vi.hoisted(() => ({
    requireAdminSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabase", () => ({ serverClient: db.client }));
vi.mock("@/lib/server-admin", () => admin);

import {
    deleteResumePdfPreset,
    listResumePdfPresets,
    renameResumePdfPreset,
    saveResumePdfPreset,
} from "@/app/admin/actions/resume-pdf-presets";

const input = {
    name: "Japan F",
    sourceKind: "job_field" as const,
    jobField: "web",
    lang: "ja" as const,
    variant: "F" as const,
    options: {
        details: { educationGpa: false },
        futureKey: { keep: true },
    },
};

beforeEach(() => {
    db.state.rows = [];
    db.state.writes = 0;
    admin.requireAdminSession.mockResolvedValue(undefined);
});

describe("이력서 PDF 프리셋 action", () => {
    it("저장·재조회, 모르는 키 보존", async () => {
        const saved = await saveResumePdfPreset(input);
        expect(saved.success).toBe(true);
        const list = await listResumePdfPresets({
            sourceKind: "job_field",
            jobField: "web",
        });
        expect(list.success && list.data).toHaveLength(1);
        const preset = list.success ? list.data[0] : null;
        expect(preset?.options.details.educationGpa).toBe(false);
        expect(preset?.options.futureKey).toEqual({ keep: true });
        expect(preset?.application_profile_id).toBeNull();
    });

    it("갱신·이름 변경·삭제", async () => {
        const saved = await saveResumePdfPreset(input);
        const id = saved.success ? saved.data.id : "";
        const updated = await saveResumePdfPreset({
            ...input,
            id,
            options: { sections: { work: false } },
        });
        expect(updated.success && updated.data.options.sections).toEqual({
            work: false,
        });
        const renamed = await renameResumePdfPreset(id, "  New  ");
        expect(renamed.success && renamed.data.name).toBe("New");
        expect((await deleteResumePdfPreset(id)).success).toBe(true);
        expect(db.state.rows).toEqual([]);
    });

    it("잘못된 입력은 DB에 쓰지 않음", async () => {
        const bad = [
            { ...input, name: " " },
            { ...input, lang: "en" as never },
            { ...input, variant: "X" as never },
            { ...input, jobField: "bad field" },
            { ...input, sourceKind: "application_profile" as const },
            {
                ...input,
                sourceKind: "application_profile" as const,
                applicationProfileId: "not-uuid",
            },
            { ...input, id: "1; drop" },
            { ...input, options: { blob: "x".repeat(70_000) } },
        ];
        for (const b of bad)
            expect((await saveResumePdfPreset(b)).success).toBe(false);
        expect((await renameResumePdfPreset("x", "ok")).success).toBe(false);
        expect((await deleteResumePdfPreset("x")).success).toBe(false);
        expect(db.state.writes).toBe(0);
    });

    it("지원 프로필 경로는 프로필 id로 구분", async () => {
        const profileId = "11111111-1111-4111-8111-111111111111";
        await saveResumePdfPreset({
            ...input,
            sourceKind: "application_profile",
            applicationProfileId: profileId,
        });
        await saveResumePdfPreset(input);
        const list = await listResumePdfPresets({
            sourceKind: "application_profile",
            jobField: "web",
            applicationProfileId: profileId,
        });
        expect(
            list.success && list.data.map((p) => p.application_profile_id)
        ).toEqual([profileId]);
    });

    it("비관리자는 거부", async () => {
        admin.requireAdminSession.mockRejectedValue(new Error("unauthorized"));
        await expect(saveResumePdfPreset(input)).rejects.toThrow(
            "unauthorized"
        );
        await expect(
            listResumePdfPresets({ sourceKind: "job_field", jobField: "web" })
        ).rejects.toThrow();
        expect(db.state.writes).toBe(0);
    });
});
