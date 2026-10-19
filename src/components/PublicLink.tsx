"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { usePublicHref } from "@/components/PublicLanguageNavigation";

// Next Link와 일반 anchor의 같은 공개 언어 규칙
const PublicLink = ({
    href,
    download,
    ...props
}: ComponentProps<typeof Link>) => {
    const localized = usePublicHref(typeof href === "string" ? href : "");
    return (
        <Link
            {...props}
            data-public-href={typeof href === "string" ? href : undefined}
            download={download}
            href={
                (download != null && download !== false) ||
                typeof href !== "string"
                    ? href
                    : localized
            }
        />
    );
};

export const PublicAnchor = ({
    href = "",
    download,
    ...props
}: ComponentProps<"a">) => {
    const localized = usePublicHref(href);
    return (
        <a
            {...props}
            data-public-href={href}
            download={download}
            href={download != null && download !== false ? href : localized}
        />
    );
};

export default PublicLink;
