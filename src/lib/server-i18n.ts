import { getContentLocale } from "@/lib/content-locale";
import {
    translateUI,
    type UIMessages,
    type UIMessageValue,
} from "@/lib/ui-messages";
import type { Locale } from "@/lib/i18n";
import enA from "@/lib/locales/en-a.json";
import enB from "@/lib/locales/en-b.json";
import enC from "@/lib/locales/en-c.json";
import enD from "@/lib/locales/en-d.json";
import jaA from "@/lib/locales/ja-a.json";
import jaB from "@/lib/locales/ja-b.json";
import jaC from "@/lib/locales/ja-c.json";
import jaD from "@/lib/locales/ja-d.json";
import koA from "@/lib/locales/ko-a.json";
import koB from "@/lib/locales/ko-b.json";
import koC from "@/lib/locales/ko-c.json";
import koD from "@/lib/locales/ko-d.json";
import enE from "@/lib/locales/en-e.json";
import jaE from "@/lib/locales/ja-e.json";
import koE from "@/lib/locales/ko-e.json";
import enOverrides from "@/lib/locales/overrides-en.json";
import jaOverrides from "@/lib/locales/overrides-ja.json";
import koOverrides from "@/lib/locales/overrides-ko.json";
import enSentences from "@/lib/locales/sentences-en.json";
import jaSentences from "@/lib/locales/sentences-ja.json";
import koSentences from "@/lib/locales/sentences-ko.json";
import enDebug from "@/lib/locales/debug-en.json";
import jaDebug from "@/lib/locales/debug-ja.json";
import koDebug from "@/lib/locales/debug-ko.json";
import enTraining from "@/lib/locales/training-en.json";
import jaTraining from "@/lib/locales/training-ja.json";
import koTraining from "@/lib/locales/training-ko.json";

const messages: Record<Locale, UIMessages> = {
    en: {
        ...enA,
        ...enB,
        ...enC,
        ...enD,
        ...enE,
        ...enOverrides,
        ...enSentences,
        ...enDebug,
        ...enTraining,
    },
    ja: {
        ...jaA,
        ...jaB,
        ...jaC,
        ...jaD,
        ...jaE,
        ...jaOverrides,
        ...jaSentences,
        ...jaDebug,
        ...jaTraining,
    },
    ko: {
        ...koA,
        ...koB,
        ...koC,
        ...koD,
        ...koE,
        ...koOverrides,
        ...koSentences,
        ...koDebug,
        ...koTraining,
    },
};

export const getServerUIMessages = (locale: Locale): UIMessages =>
    messages[locale];
export const serverT = (
    text: string,
    values?: readonly UIMessageValue[]
): string => translateUI(text, messages[getContentLocale()], values);
