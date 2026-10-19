import type { Locale } from "@/lib/i18n";

export type UIMessages = Record<string, string>;
export type UIMessageValue = string | number | null | undefined | UIMessage;
export type UIMessage = { text: string; values?: readonly UIMessageValue[] };

export const normalizeUIMessage = (text: string): string =>
    text.replace(/\s+/g, " ").trim();

// 입력 데이터와 구분된 코드 작성 UI 문구만 변환
export const resolveUIMessage = (
    value: UIMessageValue,
    messages: UIMessages
): string =>
    value && typeof value === "object"
        ? translateUI(value.text, messages, value.values)
        : String(value ?? "");

const templateMatchers = new WeakMap<
    UIMessages,
    Array<{ pattern: RegExp; translated: string; indexes: number[] }>
>();

// 이미 조합된 오류·상태 문구의 변수 보존
const translateComposedUI = (
    text: string,
    messages: UIMessages
): string | undefined => {
    let matchers = templateMatchers.get(messages);
    if (!matchers) {
        matchers = Object.entries(messages).flatMap(([key, translated]) => {
            if (
                !/\{\d+\}/.test(key) ||
                key.replace(/\{\d+\}/g, "").replace(/[^\p{L}]/gu, "").length < 2
            )
                return [];
            const indexes: number[] = [];
            const parts = key.split(/(\{\d+\})/).map((part) => {
                const token = part.match(/^\{(\d+)\}$/);
                if (token) {
                    indexes.push(Number(token[1]));
                    return "(.*?)";
                }
                return part
                    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
                    .replace(/\s+/g, "\\s+?");
            });
            return [
                {
                    pattern: new RegExp(`^${parts.join("")}$`, "s"),
                    translated,
                    indexes,
                },
            ];
        });
        templateMatchers.set(messages, matchers);
    }
    for (const { pattern, translated, indexes } of matchers) {
        const match = pattern.exec(text);
        if (!match) continue;
        const values = new Map(
            indexes.map((index, position) => [index, match[position + 1]])
        );
        return translated.replace(
            /\{(\d+)\}/g,
            (token, index: string) => values.get(Number(index)) ?? token
        );
    }
};

export const translateUI = (
    text: string,
    messages: UIMessages,
    values?: readonly UIMessageValue[]
): string => {
    const key = normalizeUIMessage(text);
    let translated: string | undefined = messages[key];
    if (values) {
        return (translated ?? text).replace(
            /\{(\d+)\}/g,
            (token, index: string) =>
                Number(index) < values.length
                    ? resolveUIMessage(values[Number(index)], messages)
                    : token
        );
    }
    if (translated === undefined)
        return translateComposedUI(text, messages) ?? text;
    return `${text.match(/^\s*/)?.[0] ?? ""}${translated}${text.match(/\s*$/)?.[0] ?? ""}`;
};

// 화면 전환 시 필요한 언어 사전만 읽기
export const loadUIMessages = async (locale: Locale): Promise<UIMessages> => {
    const modules =
        locale === "en"
            ? await Promise.all([
                  import("@/lib/locales/en-a.json"),
                  import("@/lib/locales/en-b.json"),
                  import("@/lib/locales/en-c.json"),
                  import("@/lib/locales/en-d.json"),
                  import("@/lib/locales/en-e.json"),
              ])
            : locale === "ja"
              ? await Promise.all([
                    import("@/lib/locales/ja-a.json"),
                    import("@/lib/locales/ja-b.json"),
                    import("@/lib/locales/ja-c.json"),
                    import("@/lib/locales/ja-d.json"),
                    import("@/lib/locales/ja-e.json"),
                ])
              : await Promise.all([
                    import("@/lib/locales/ko-a.json"),
                    import("@/lib/locales/ko-b.json"),
                    import("@/lib/locales/ko-c.json"),
                    import("@/lib/locales/ko-d.json"),
                    import("@/lib/locales/ko-e.json"),
                ]);
    const overrides =
        locale === "en"
            ? await import("@/lib/locales/overrides-en.json")
            : locale === "ja"
              ? await import("@/lib/locales/overrides-ja.json")
              : await import("@/lib/locales/overrides-ko.json");
    const sentences =
        locale === "en"
            ? await import("@/lib/locales/sentences-en.json")
            : locale === "ja"
              ? await import("@/lib/locales/sentences-ja.json")
              : await import("@/lib/locales/sentences-ko.json");
    const debug =
        locale === "en"
            ? await import("@/lib/locales/debug-en.json")
            : locale === "ja"
              ? await import("@/lib/locales/debug-ja.json")
              : await import("@/lib/locales/debug-ko.json");
    const training =
        locale === "en"
            ? await import("@/lib/locales/training-en.json")
            : locale === "ja"
              ? await import("@/lib/locales/training-ja.json")
              : await import("@/lib/locales/training-ko.json");
    return Object.assign(
        {},
        ...modules.map((module) => module.default),
        overrides.default,
        sentences.default,
        debug.default,
        training.default
    ) as UIMessages;
};
