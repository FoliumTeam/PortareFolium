"use client";

import {
    Fragment,
    createElement,
    type ElementType,
    type ComponentPropsWithRef,
    type ReactNode,
} from "react";
import { useUILocale } from "@/components/LocaleProvider";
import {
    translateUI,
    resolveUIMessage,
    normalizeUIMessage,
    type UIMessageValue,
} from "@/lib/ui-messages";

// 코드 작성 UI 문구의 번역
export const LocalizedText = ({
    text,
    values,
}: {
    text?: ReactNode;
    values?: readonly UIMessageValue[];
}) => {
    const { messages } = useUILocale();
    return typeof text === "string"
        ? translateUI(text, messages, values)
        : text;
};

// 문장 전체의 어순과 링크·강조·입력 데이터 보존
export const LocalizedRichText = ({
    text,
    values,
}: {
    text: string;
    values: readonly ReactNode[];
}) => {
    const { messages } = useUILocale();
    const translated = messages[normalizeUIMessage(text)] ?? text;
    return translated.split(/(\{\d+\})/).map((part, index) => {
        const token = part.match(/^\{(\d+)\}$/);
        return token ? (
            <Fragment key={index}>{values[Number(token[1])]}</Fragment>
        ) : (
            part
        );
    });
};

type LocalizedElementProps<Tag extends ElementType> = {
    as: Tag;
    translatedProps?: string[];
    messageProps?: Record<string, UIMessageValue>;
} & Omit<
    ComponentPropsWithRef<NoInfer<Tag>>,
    "as" | "translatedProps" | "messageProps"
>;

// 입력값·이벤트·ref를 보존한 UI 속성 번역
export const LocalizedElement = <Tag extends ElementType>({
    as,
    translatedProps = [],
    messageProps,
    ...props
}: LocalizedElementProps<Tag>) => {
    const { messages } = useUILocale();
    const translated = { ...props } as Record<string, unknown>;
    for (const key of translatedProps) {
        const value = translated[key];
        if (typeof value === "string")
            translated[key] = translateUI(value, messages);
    }
    for (const [key, value] of Object.entries(messageProps ?? {})) {
        translated[key] = resolveUIMessage(value, messages);
    }
    return createElement(as, translated);
};
