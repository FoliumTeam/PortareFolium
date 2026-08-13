import { Fragment } from "react";

type Props = {
    description: string;
};

/** 핵심 역량 설명의 굵은 강조와 문단 구분을 안전하게 표시 */
export default function CoreCompetencyMarkdown({ description }: Props) {
    const paragraphs = description.trim().split(/\n{2,}/);

    return (
        <div className="resume-core-competency-markdown space-y-2">
            {paragraphs.map((paragraph, paragraphIndex) => (
                <p key={paragraphIndex}>
                    {paragraph.split("\n").map((line, lineIndex) => (
                        <Fragment key={lineIndex}>
                            {lineIndex > 0 ? <br /> : null}
                            {line
                                .split(/(\*\*[^*]+\*\*)/g)
                                .map((segment, segmentIndex) => {
                                    const isBold =
                                        segment.startsWith("**") &&
                                        segment.endsWith("**");
                                    return isBold ? (
                                        <strong
                                            key={segmentIndex}
                                            className="font-bold text-(--color-accent)"
                                        >
                                            {segment.slice(2, -2)}
                                        </strong>
                                    ) : (
                                        <Fragment key={segmentIndex}>
                                            {segment}
                                        </Fragment>
                                    );
                                })}
                        </Fragment>
                    ))}
                </p>
            ))}
        </div>
    );
}
