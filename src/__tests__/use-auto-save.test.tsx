import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAutoSave } from "@/lib/hooks/useAutoSave";

describe("useAutoSave", () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it("마지막 form 변경 이후 debounce 시간이 지나야 저장", async () => {
        vi.useFakeTimers();
        const save = vi.fn(async () => undefined);
        const { rerender } = renderHook(
            ({ changeToken }) => useAutoSave(true, true, save, changeToken),
            { initialProps: { changeToken: "첫 입력" } }
        );

        await act(async () => {
            await vi.advanceTimersByTimeAsync(2_000);
        });
        rerender({ changeToken: "계속 입력" });
        await act(async () => {
            await vi.advanceTimersByTimeAsync(2_000);
        });
        expect(save).not.toHaveBeenCalled();

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1_000);
        });
        expect(save).toHaveBeenCalledTimes(1);
    });
});
