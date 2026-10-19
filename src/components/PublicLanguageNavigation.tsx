"use client";

import {
    createContext,
    Suspense,
    useContext,
    useEffect,
    useState,
    type MouseEvent,
    type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";
import { withLanguageQuery } from "@/lib/query-language";

const SearchContext = createContext("");

// query 조회만 Suspense 안에 격리해 정적 본문 유지
const SearchObserver = ({
    onChange,
}: {
    onChange: (search: string) => void;
}) => {
    const params = useSearchParams();
    const search = params.toString();
    useEffect(() => onChange(search), [search, onChange]);
    return null;
};

export const usePublicHref = (href: string) =>
    withLanguageQuery(href, useContext(SearchContext));

// MDX의 일반 anchor와 최초 상태 동기화 전 이동도 보존
export const PublicLanguageNavigation = ({
    children,
}: {
    children: ReactNode;
}) => {
    const [search, setSearch] = useState("");
    const prepareLink = (event: MouseEvent<HTMLDivElement>) => {
        const element =
            event.target instanceof Element
                ? event.target.closest("a[href]")
                : null;
        if (
            !(element instanceof HTMLAnchorElement) ||
            element.hasAttribute("download")
        )
            return;
        const href = element.getAttribute("href") ?? "";
        const original = element.getAttribute("data-public-href") ?? href;
        const next = withLanguageQuery(original, window.location.search);
        if (next === href) return;
        element.setAttribute("data-public-href", original);
        element.setAttribute("href", next);
        if (
            event.type === "click" &&
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            (!element.target || element.target === "_self")
        ) {
            event.preventDefault();
            window.location.assign(next);
        }
    };
    return (
        <SearchContext.Provider value={search}>
            <Suspense fallback={null}>
                <SearchObserver onChange={setSearch} />
            </Suspense>
            <div
                className="contents"
                onClickCapture={prepareLink}
                onAuxClickCapture={prepareLink}
                onContextMenuCapture={prepareLink}
            >
                {children}
            </div>
        </SearchContext.Provider>
    );
};
