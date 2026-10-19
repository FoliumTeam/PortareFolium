"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { UI_LOCALE_COOKIE, type Locale } from "@/lib/i18n";

const LocaleContext = createContext({
    locale: "ko" as Locale,
    changeLocale: (_locale: Locale) => {},
});

// 화면 문구의 언어와 관리자 입력 상태의 독립 유지
export const LocaleProvider = ({
    initialLocale,
    children,
}: {
    initialLocale: Locale;
    children: ReactNode;
}) => {
    const [locale, setLocale] = useState(initialLocale);
    const changeLocale = (next: Locale) => {
        document.cookie = `${UI_LOCALE_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
        document.documentElement.lang = next;
        setLocale(next);
    };
    return (
        <LocaleContext.Provider value={{ locale, changeLocale }}>
            {children}
        </LocaleContext.Provider>
    );
};

export const useUILocale = () => useContext(LocaleContext);
