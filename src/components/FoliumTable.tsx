import { tailwindToHex, isLightBackground } from "@/lib/tailwind-colors";

interface Props {
    columns: string | string[];
    rows: string | string[][];
    columnHeadColors?: string | string[];
    columnHeadColorsDark?: string | string[];
    rowColors?: string | string[];
    rowColorsDark?: string | string[];
}

const NOWRAP_MAX_LEN = 15;

function parseStringArray(
    val: string | string[] | undefined
): string[] | undefined {
    if (val === undefined) return undefined;
    return typeof val === "string" ? JSON.parse(val) : val;
}

function parseRowArray(
    val: string | string[][] | undefined
): string[][] | undefined {
    if (val === undefined) return undefined;
    return typeof val === "string" ? JSON.parse(val) : val;
}

function isShortCell(text: string): boolean {
    return text.length < NOWRAP_MAX_LEN + 1;
}

function getTextColor(tailwindName: string): string {
    const light = isLightBackground(tailwindName);
    return light ? "var(--color-foreground)" : "rgba(255,255,255,0.95)";
}

export default function FoliumTable({
    columns,
    rows,
    columnHeadColors,
    columnHeadColorsDark,
    rowColors,
    rowColorsDark,
}: Props) {
    const headers: string[] = parseStringArray(columns) ?? [];
    const dataRows: string[][] = parseRowArray(rows) ?? [];
    const headColors = parseStringArray(columnHeadColors);
    const headColorsDark = parseStringArray(columnHeadColorsDark);
    const bodyColors = parseStringArray(rowColors);
    const bodyColorsDark = parseStringArray(rowColorsDark);

    const hasColColors = !!(headColors?.length || bodyColors?.length);

    return (
        <div className="folium-table-wrapper">
            <table
                className={`folium-table${hasColColors ? "has-col-colors" : ""}`}
            >
                <thead>
                    <tr>
                        {headers.map((h, i) => {
                            const twLight = headColors?.[i];
                            const twDark = headColorsDark?.[i];
                            const bgLight = twLight
                                ? tailwindToHex(twLight)
                                : undefined;
                            const bgDark = twDark
                                ? tailwindToHex(twDark)
                                : undefined;
                            const textLight = twLight
                                ? getTextColor(twLight)
                                : undefined;
                            const textDark = twDark
                                ? getTextColor(twDark)
                                : twLight
                                  ? getTextColor(twLight)
                                  : undefined;
                            const headShort = isShortCell(h);
                            const headClass = [
                                twLight || twDark ? "pt-head-col" : "",
                                headShort ? "ft-nowrap" : "",
                            ]
                                .filter(Boolean)
                                .join(" ");
                            return (
                                <th
                                    key={i}
                                    className={headClass || undefined}
                                    style={
                                        bgLight
                                            ? ({
                                                  "--pt-bg": bgLight,
                                                  "--pt-text": textLight,
                                              } as React.CSSProperties)
                                            : undefined
                                    }
                                    data-pt-head-idx={i}
                                    data-pt-bg-dark={bgDark}
                                    data-pt-text-dark={textDark}
                                >
                                    {h}
                                </th>
                            );
                        })}
                    </tr>
                </thead>
                <tbody>
                    {dataRows.map((row, ri) => (
                        <tr key={ri}>
                            {row.map((cell, i) => {
                                const twLight = bodyColors?.[i];
                                const twDark = bodyColorsDark?.[i];
                                const bgLight = twLight
                                    ? tailwindToHex(twLight)
                                    : undefined;
                                const bgDark = twDark
                                    ? tailwindToHex(twDark)
                                    : undefined;
                                const textLight = twLight
                                    ? getTextColor(twLight)
                                    : undefined;
                                const textDark = twDark
                                    ? getTextColor(twDark)
                                    : twLight
                                      ? getTextColor(twLight)
                                      : undefined;
                                const cellText = cell || "\u2014";
                                const cellShort = isShortCell(cellText);
                                const cellClass = [
                                    twLight || twDark ? "pt-body-col" : "",
                                    cellShort ? "ft-nowrap" : "",
                                ]
                                    .filter(Boolean)
                                    .join(" ");
                                return (
                                    <td
                                        key={i}
                                        className={cellClass || undefined}
                                        style={
                                            bgLight
                                                ? ({
                                                      "--pt-bg": bgLight,
                                                      "--pt-text": textLight,
                                                  } as React.CSSProperties)
                                                : undefined
                                        }
                                        data-pt-body-idx={i}
                                        data-pt-bg-dark={bgDark}
                                        data-pt-text-dark={textDark}
                                    >
                                        {cellText}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
