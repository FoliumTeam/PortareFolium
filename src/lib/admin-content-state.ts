"use client";

import { CONTENT_LOCALE_COOKIE, isLocale, type Locale } from "@/lib/i18n";

const pending = new Set<Promise<unknown>>();
const dirty = new Set<object>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const getEditingLocale = (): Locale => {
    if (typeof document === "undefined") return "ko";
    const saved = sessionStorage.getItem(CONTENT_LOCALE_COOKIE);
    if (isLocale(saved)) return saved;
    const value = document.cookie
        .split("; ")
        .find((part) => part.startsWith(`${CONTENT_LOCALE_COOKIE}=`))
        ?.split("=")[1];
    const locale = isLocale(value) ? value : "ko";
    sessionStorage.setItem(CONTENT_LOCALE_COOKIE, locale);
    return locale;
};

// 다른 탭의 언어 변경과 현재 편집 범위의 독립 유지
export const setEditingLocale = (locale: Locale) => {
    sessionStorage.setItem(CONTENT_LOCALE_COOKIE, locale);
    document.cookie = `${CONTENT_LOCALE_COOKIE}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
};

// 호출 순간의 언어를 고정해 늦은 저장의 다른 언어 접근 차단
export const bindContentAction = <Action extends (...args: never[]) => unknown>(
    action: Action
): Action =>
    ((...args: unknown[]) => {
        const result = Promise.resolve<unknown>(
            Reflect.apply(action, null, [
                ...args,
                { __contentLocale: getEditingLocale() },
            ])
        );
        pending.add(result);
        const complete = () => {
            pending.delete(result);
            notify();
        };
        result.then(complete, complete);
        notify();
        return result;
    }) as unknown as Action;

export const setContentDirty = (owner: object, value: boolean) => {
    if (value) dirty.add(owner);
    else dirty.delete(owner);
    notify();
};
export const hasDirtyContent = () => dirty.size > 0;
export const hasPendingContentActions = () => pending.size > 0;
export const subscribeContentState = (listener: () => void) => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
export const waitForContentActions = async () => {
    while (pending.size) await Promise.allSettled([...pending]);
};
