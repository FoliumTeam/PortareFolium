import { describe, expect, it } from "vitest";
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import config from "../../next.config";

const patterns = config.images?.remotePatterns ?? [];
const asset =
    "https://github.com/user-attachments/assets/00000000-0000-0000-0000-000000000000";

describe("PDF 이미지 최적화의 외부 경로 경계", () => {
    it("기존 본문의 GitHub 첨부 이미지 경로 허용", () => {
        expect(hasRemoteMatch([], patterns, new URL(asset))).toBe(true);
    });

    it.each([
        asset.replace("https:", "http:"),
        asset.replace("github.com", "github.com.evil.invalid"),
        asset.replace("github.com", "github.com:8443"),
        `${asset}?redirect=other`,
        "https://github.com/owner/repo/blob/main/image.png",
        "https://github.com/user-attachments/assets/../releases/image.png",
    ])(
        "일반 경로·포트·검색 문자열로 허용 범위를 넓히는 요청 거부: %s",
        (url) => {
            expect(hasRemoteMatch([], patterns, new URL(url))).toBe(false);
        }
    );
});
