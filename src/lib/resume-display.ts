import { formatResumeBirthDate } from "@/lib/resume-basics-presentation";
import type { ResumeBasicsPresentation } from "@/types/resume";
import type { UIMessageValue } from "@/lib/ui-messages";

// 생년월일 원본과 표시 언어의 분리
export const formatBirthDateForUI = (
    value: string | undefined,
    preset: ResumeBasicsPresentation["personalDetailPreset"],
    translate: (text: string, values?: readonly UIMessageValue[]) => string
): string => {
    if (value && preset === "concise")
        return translate("{0}년생", [value.split("-")[0]]);
    return formatResumeBirthDate(value, preset);
};
