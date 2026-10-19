import { createElement } from "react";
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    bindContentAction,
    setEditingLocale,
    getEditingLocale,
    hasDirtyContent,
    setContentDirty,
    subscribeContentState,
    waitForContentActions,
} from "@/lib/admin-content-state";
import { CONTENT_LOCALE_COOKIE } from "@/lib/i18n";
import { ContentLanguageSelector } from "@/components/admin/ContentLanguageSelector";

const owners: object[] = [];
const subscriptions: (() => void)[] = [];

const createOwner = () => {
    const owner = {};
    owners.push(owner);
    return owner;
};

const deferred = () => {
    let resolve!: () => void;
    let reject!: (error: Error) => void;
    const promise = new Promise<void>((fulfill, fail) => {
        resolve = fulfill;
        reject = fail;
    });
    return { promise, resolve, reject };
};

beforeEach(() => {
    sessionStorage.clear();
    document.cookie = `${CONTENT_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
});

afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    subscriptions.splice(0).forEach((unsubscribe) => unsubscribe());
    owners.splice(0).forEach((owner) => setContentDirty(owner, false));
    document.cookie = `${CONTENT_LOCALE_COOKIE}=; Path=/; Max-Age=0`;
});

describe("관리자 콘텐츠 언어", () => {
    it("다른 탭의 쿠키 변경이 현재 편집 언어에 영향 없는 구조", () => {
        setEditingLocale("ko");
        document.cookie = `${CONTENT_LOCALE_COOKIE}=ja; Path=/`;
        expect(getEditingLocale()).toBe("ko");
    });

    it("콘텐츠 언어 선택 전 한국어 사용", () => {
        expect(getEditingLocale()).toBe("ko");
    });

    it.each(["ko", "en", "ja"])("선택한 %s 콘텐츠 언어 복원", (locale) => {
        document.cookie = `${CONTENT_LOCALE_COOKIE}=${locale}; Path=/`;
        expect(getEditingLocale()).toBe(locale);
    });

    it("지원하지 않는 콘텐츠 언어를 한국어로 복구", () => {
        document.cookie = `${CONTENT_LOCALE_COOKIE}=fr; Path=/`;
        expect(getEditingLocale()).toBe("ko");
    });

    it("브라우저 문서 없는 환경에서 한국어 사용", () => {
        vi.stubGlobal("document", undefined);
        expect(getEditingLocale()).toBe("ko");
    });
});

describe("콘텐츠 작업의 언어 고정과 대기", () => {
    it("전달 인자와 반환값을 보존하고 호출 당시 언어 추가", async () => {
        setEditingLocale("ja");
        const payload = { title: "保存する内容" };
        const result = { success: true };
        const action = vi.fn(
            async (_payload: typeof payload, _rowId: number) => result
        );

        await expect(bindContentAction(action)(payload, 12)).resolves.toBe(
            result
        );

        expect(action).toHaveBeenCalledWith(payload, 12, {
            __contentLocale: "ja",
        });
    });

    it("같은 작업의 각 호출에서 현재 입력 언어를 독립적으로 고정", async () => {
        const first = deferred();
        const action = vi.fn(() => first.promise);
        const boundAction = bindContentAction(action);
        setEditingLocale("en");
        const result = boundAction();
        setEditingLocale("ja");
        first.resolve();
        await result;
        await boundAction();

        expect(action.mock.calls).toEqual([
            [{ __contentLocale: "en" }],
            [{ __contentLocale: "ja" }],
        ]);
    });

    it("진행 중인 모든 작업 완료 전 대기 유지", async () => {
        const first = deferred();
        const second = deferred();
        void bindContentAction(() => first.promise)();
        void bindContentAction(() => second.promise)();
        const completed = vi.fn();
        const waiting = waitForContentActions().then(completed);

        first.resolve();
        await first.promise;
        await Promise.resolve();
        expect(completed).not.toHaveBeenCalled();

        second.resolve();
        await waiting;
        expect(completed).toHaveBeenCalledOnce();
    });

    it("대기 도중 시작한 작업까지 완료 후 반환", async () => {
        const first = deferred();
        const second = deferred();
        void bindContentAction(() => first.promise)();
        const completed = vi.fn();
        const waiting = waitForContentActions().then(completed);
        void bindContentAction(() => second.promise)();

        first.resolve();
        await first.promise;
        await Promise.resolve();
        expect(completed).not.toHaveBeenCalled();

        second.resolve();
        await waiting;
        expect(completed).toHaveBeenCalledOnce();
    });

    it("실패한 작업을 대기 목록에서 제거하고 원래 호출에 오류 반환", async () => {
        const pending = deferred();
        const result = bindContentAction(() => pending.promise)();
        const error = new Error("저장 실패");
        const rejected = expect(result).rejects.toBe(error);
        const waiting = waitForContentActions();

        pending.reject(error);

        await rejected;
        await expect(waiting).resolves.toBeUndefined();
        await expect(waitForContentActions()).resolves.toBeUndefined();
    });

    it("작업 시작과 종료를 구독자에게 전달", async () => {
        const pending = deferred();
        const listener = vi.fn();
        subscriptions.push(subscribeContentState(listener));

        const result = bindContentAction(() => pending.promise)();
        expect(listener).toHaveBeenCalledTimes(1);
        pending.resolve();
        await result;
        expect(listener).toHaveBeenCalledTimes(2);
    });
});

describe("미저장 콘텐츠 상태", () => {
    it("한 편집 영역 저장 후에도 다른 영역의 미저장 상태 유지", () => {
        const first = createOwner();
        const second = createOwner();
        setContentDirty(first, true);
        setContentDirty(second, true);

        setContentDirty(first, false);
        expect(hasDirtyContent()).toBe(true);

        setContentDirty(second, false);
        expect(hasDirtyContent()).toBe(false);
    });

    it("같은 영역을 반복 표시해도 한 번 해제로 미저장 상태 해제", () => {
        const owner = createOwner();
        setContentDirty(owner, true);
        setContentDirty(owner, true);
        setContentDirty(owner, false);
        expect(hasDirtyContent()).toBe(false);
    });

    it("구독 해제 후 상태 변경 알림 중단", () => {
        const listener = vi.fn();
        const unsubscribe = subscribeContentState(listener);
        unsubscribe();
        setContentDirty(createOwner(), true);
        expect(listener).not.toHaveBeenCalled();
    });
});

describe("콘텐츠 언어 선택의 저장 보호", () => {
    it("미저장 상태에서 언어 선택 차단 후 원복 시 허용", () => {
        const owner = createOwner();
        render(createElement(ContentLanguageSelector, { onChange: vi.fn() }));
        const selector = screen.getByRole("combobox", { name: "콘텐츠 언어" });

        act(() => setContentDirty(owner, true));
        expect(selector).toBeDisabled();

        act(() => setContentDirty(owner, false));
        expect(selector).toBeEnabled();
    });

    it("진행 중인 작업 완료 후 선택 언어 저장과 패널 전환", async () => {
        const pending = deferred();
        const onChange = vi.fn();
        void bindContentAction(() => pending.promise)();
        render(createElement(ContentLanguageSelector, { onChange }));
        const selector = screen.getByRole("combobox", { name: "콘텐츠 언어" });

        fireEvent.change(selector, { target: { value: "en" } });
        expect(selector).toBeDisabled();
        expect(getEditingLocale()).toBe("ko");
        expect(onChange).not.toHaveBeenCalled();

        await act(async () => {
            pending.resolve();
            await waitForContentActions();
        });

        expect(getEditingLocale()).toBe("en");
        expect(onChange).toHaveBeenCalledExactlyOnceWith("en");
        expect(selector).toBeEnabled();
    });

    it("작업 대기 중 새 변경 발생 시 언어 전환 취소", async () => {
        const pending = deferred();
        const owner = createOwner();
        const onChange = vi.fn();
        void bindContentAction(() => pending.promise)();
        render(createElement(ContentLanguageSelector, { onChange }));
        const selector = screen.getByRole("combobox", { name: "콘텐츠 언어" });

        fireEvent.change(selector, { target: { value: "ja" } });
        act(() => setContentDirty(owner, true));
        await act(async () => {
            pending.resolve();
            await waitForContentActions();
        });

        expect(getEditingLocale()).toBe("ko");
        expect(onChange).not.toHaveBeenCalled();
        expect(selector).toHaveValue("ko");
        expect(selector).toBeDisabled();
    });
});
