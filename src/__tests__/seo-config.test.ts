import { describe, expect, it } from "vitest";
import { normalizeSeoConfig, resolveSeoConfig } from "@/lib/seo-config";

describe("SEO 설정", () => {
    const rows = [
        { key: "site_name", value: JSON.stringify("공통 제목") },
        {
            key: "seo_config",
            value: {
                default_description: "공통 설명",
                default_og_image: "https://example.com/default.png",
                job_fields: {
                    game: {
                        title: "게임 제목",
                        description: "게임 설명",
                        og_image: "https://example.com/game.png",
                    },
                },
            },
        },
    ];

    it("직무 분야 SEO 값을 보존", () => {
        expect(normalizeSeoConfig(rows[1].value).jobFields.game).toEqual({
            title: "게임 제목",
            description: "게임 설명",
            ogImage: "https://example.com/game.png",
        });
    });

    it("직무 분야 공개 경로에서 분야 SEO를 우선", () => {
        expect(resolveSeoConfig(rows, "game")).toEqual({
            title: "게임 제목",
            description: "게임 설명",
            ogImage: "https://example.com/game.png",
        });
    });

    it("직무 분야 값이 없으면 공통 SEO를 사용", () => {
        expect(resolveSeoConfig(rows, "web")).toEqual({
            title: "공통 제목",
            description: "공통 설명",
            ogImage: "https://example.com/default.png",
        });
    });
});
