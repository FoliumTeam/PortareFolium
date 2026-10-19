"use client";

import {
    createContext,
    useContext,
    useState,
    useRef,
    useCallback,
    type ReactNode,
} from "react";
import { UI_LOCALE_COOKIE, type Locale } from "@/lib/i18n";
import {
    loadUIMessages,
    translateUI,
    type UIMessages,
    type UIMessageValue,
} from "@/lib/ui-messages";

const LocaleContext = createContext({
    locale: "ko" as Locale,
    messages: {} as UIMessages,
    changing: false,
    isChangingLocale: (): boolean => false,
    provided: false,
    error: "",
    changeLocale: async (
        _locale: Locale,
        _options?: { persist?: boolean; apply?: boolean }
    ) => true,
});

// 화면 문구의 언어와 관리자 입력 상태의 독립 유지
export const LocaleProvider = ({
    initialLocale,
    initialMessages = {},
    children,
}: {
    initialLocale: Locale;
    initialMessages?: UIMessages;
    children: ReactNode;
}) => {
    const [locale, setLocale] = useState(initialLocale);
    const [messages, setMessages] = useState(initialMessages);
    const [changing, setChanging] = useState(false);
    const pendingChanges = useRef(0);
    const [error, setError] = useState("");
    const isChangingLocale = useCallback(() => pendingChanges.current > 0, []);
    const changeLocale = async (
        next: Locale,
        options?: { persist?: boolean; apply?: boolean }
    ) => {
        pendingChanges.current += 1;
        setChanging(true);
        setError("");
        try {
            const nextMessages = await loadUIMessages(next);
            if (options?.persist !== false)
                document.cookie = `${UI_LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
            if (options?.apply !== false) {
                document.documentElement.lang = next;
                setLocale(next);
                setMessages(nextMessages);
            }
            return true;
        } catch {
            setError("화면 언어를 불러오지 못했습니다. 다시 선택하세요.");
            return false;
        } finally {
            pendingChanges.current -= 1;
            setChanging(pendingChanges.current > 0);
        }
    };
    return (
        <LocaleContext.Provider
            value={{
                locale,
                messages,
                changing,
                isChangingLocale,
                provided: true,
                error,
                changeLocale,
            }}
        >
            {children}
        </LocaleContext.Provider>
    );
};

export const useUILocale = () => useContext(LocaleContext);

export const useUITranslation = () => {
    const { messages } = useUILocale();
    return useCallback(
        (text: string, values?: readonly UIMessageValue[]) =>
            translateUI(text, messages, values),
        [messages]
    );
};
