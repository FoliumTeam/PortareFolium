import { describe, it, expect } from "vitest";
import {
    jsxToDirective,
    directiveToJsx,
    transformOutsideCodeBlocks,
} from "@/lib/mdx-directive-converter";

// ─────────────────────────────────────────────────────────
// jsxToDirective (에디터 로드 시: JSX → MDX Directive)
// ─────────────────────────────────────────────────────────

describe("jsxToDirective", () => {
    describe("YouTube 변환", () => {
        it('<YouTube id="abc" /> → ::youtube[]{id="abc"}', () => {
            const input = '<YouTube id="abc" />';
            expect(jsxToDirective(input)).toContain('::youtube[]{id="abc"}');
        });

        it("공백이 다양한 형태여도 변환", () => {
            const input = '<YouTube  id="xyz"  />';
            expect(jsxToDirective(input)).toContain('::youtube[]{id="xyz"}');
        });
    });

    describe("LaTeX 변환", () => {
        it("$$수식$$ → ::latex{src=...}", () => {
            const input = "$$E = mc^2$$";
            const result = jsxToDirective(input);
            expect(result).toContain("::latex{src=");
            expect(result).toContain("E = mc^2");
        });
    });

    describe("Accordion 변환", () => {
        it('<Accordion title="X">...</Accordion> → :::accordion[X]...:::', () => {
            const input =
                '<Accordion title="My Title">\n\ninner content\n\n</Accordion>';
            const result = jsxToDirective(input);
            expect(result).toContain(":::accordion[My Title]");
            expect(result).toContain("inner content");
            expect(result).toContain(":::");
        });

        it("Accordion title에 single-quote 형식도 지원", () => {
            const input = `<Accordion title={'Quoted'}>\n\nbody\n\n</Accordion>`;
            const result = jsxToDirective(input);
            expect(result).toContain(":::accordion[Quoted]");
        });
    });

    describe("ImageGroup 변환", () => {
        it("<ImageGroup ... /> → ::image-group[]{...}", () => {
            const input = `<ImageGroup layout="collage" images='["https://example.com/a.webp","https://example.com/b.webp"]' />`;
            const result = jsxToDirective(input);
            expect(result).toContain("::image-group[]");
            expect(result).toContain('layout="collage"');
            expect(result).toContain(
                `images='["https://example.com/a.webp","https://example.com/b.webp"]'`
            );
        });
    });

    describe("코드 블록 보호", () => {
        it("코드 블록 내부 LaTeX($$...$$)는 변환하지 않음", () => {
            const input = "```\n$$E=mc^2$$\n```\nOutside $$x+y$$";
            const result = jsxToDirective(input);
            // 코드 블록 내부 $$ 는 그대로
            expect(result).toContain("$$E=mc^2$$");
            // 코드 블록 외부는 변환
            expect(result).toContain("::latex{src=");
        });
    });
});

// ─────────────────────────────────────────────────────────
// directiveToJsx (저장 시: MDX Directive → JSX)
// ─────────────────────────────────────────────────────────

describe("directiveToJsx", () => {
    describe("YouTube 변환", () => {
        it('::youtube[]{id="abc"} → <YouTube id="abc" />', () => {
            const input = '::youtube[]{id="abc"}';
            expect(directiveToJsx(input)).toContain('<YouTube id="abc" />');
        });

        it('::youtube{#abc} shorthand → <YouTube id="abc" />', () => {
            const input = "::youtube{#abc}";
            expect(directiveToJsx(input)).toContain('<YouTube id="abc" />');
        });

        it("quoted 없는 id 처리: ::youtube[]{id=abc}", () => {
            const input = "::youtube[]{id=abc}";
            expect(directiveToJsx(input)).toContain('<YouTube id="abc" />');
        });
    });

    describe("LaTeX 변환", () => {
        it('::latex{src="E = mc^2"} → $$E = mc^2$$', () => {
            const input = '::latex{src="E = mc^2"}';
            const result = directiveToJsx(input);
            expect(result).toContain("$$E = mc^2$$");
        });
    });

    describe("Accordion 변환", () => {
        it(":::accordion[X]...::: → <Accordion title={'X'}>...</Accordion>", () => {
            const input = ":::accordion[My Title]\n\ninner\n\n:::";
            const result = directiveToJsx(input);
            expect(result).toContain("<Accordion title={'My Title'}>");
            expect(result).toContain("inner");
            expect(result).toContain("</Accordion>");
        });
    });

    describe("ImageGroup 변환", () => {
        it("::image-group[]{...} → <ImageGroup ... />", () => {
            const input = `::image-group[]{layout="slider" images='["https://example.com/a.webp","https://example.com/b.webp"]'}`;
            const result = directiveToJsx(input);
            expect(result).toContain(`<ImageGroup layout="slider"`);
            expect(result).toContain(
                `images='["https://example.com/a.webp","https://example.com/b.webp"]'`
            );
        });
    });

    describe("이스케이프 제거", () => {
        it("directive 라인의 백슬래시 이스케이프 제거", () => {
            // MDXEditor가 삽입하는 이스케이프 처리
            const input = '\\::youtube[]{id="abc"}';
            const result = directiveToJsx(input);
            expect(result).toContain('<YouTube id="abc" />');
        });
    });
});

// ─────────────────────────────────────────────────────────
// 왕복 일관성 (roundtrip)
// ─────────────────────────────────────────────────────────

describe("왕복 변환 일관성", () => {
    it("YouTube: jsxToDirective → directiveToJsx 왕복", () => {
        const original = '<YouTube id="dQw4w9WgXcQ" />';
        const directive = jsxToDirective(original);
        const restored = directiveToJsx(directive);
        expect(restored.trim()).toContain('<YouTube id="dQw4w9WgXcQ" />');
    });

    it("ImageGroup: jsxToDirective → directiveToJsx 왕복", () => {
        const original = `<ImageGroup layout="stack" images='["https://example.com/a.webp","https://example.com/b.webp"]' />`;
        const directive = jsxToDirective(original);
        const restored = directiveToJsx(directive);
        expect(restored.trim()).toContain(`<ImageGroup layout="stack"`);
        expect(restored).toContain(
            `images='["https://example.com/a.webp","https://example.com/b.webp"]'`
        );
    });
});

// ─────────────────────────────────────────────────────────
// transformOutsideCodeBlocks
// ─────────────────────────────────────────────────────────

describe("transformOutsideCodeBlocks", () => {
    it("코드 블록 밖 텍스트에만 변환 적용", () => {
        const input = "hello ```code block``` world";
        const result = transformOutsideCodeBlocks(input, (t) =>
            t.toUpperCase()
        );
        expect(result).toContain("HELLO");
        expect(result).toContain("```code block```");
        expect(result).toContain("WORLD");
    });

    it("코드 블록이 없으면 전체에 변환 적용", () => {
        const input = "hello world";
        const result = transformOutsideCodeBlocks(input, (t) =>
            t.toUpperCase()
        );
        expect(result).toBe("HELLO WORLD");
    });

    it("빈 문자열에도 안전하게 작동", () => {
        const result = transformOutsideCodeBlocks("", (t) => t.toUpperCase());
        expect(result).toBe("");
    });
});

// ─────────────────────────────────────────────────────────
// tiptap-markdown이 [, ]를 link 문법 충돌 회피로 \[, \] escape하는 잔재 방어
// ─────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────
// transformOutsideCodeBlocks: self-closing JSX 태그 보호
// 이전 버그: JSX 태그 안의 $ 가 inline math로 잘못 파싱되어 뒷부분의 { } 가 \{ \} 로 escape 됨
// ─────────────────────────────────────────────────────────

describe("transformOutsideCodeBlocks JSX 태그 보호", () => {
    it("self-closing JSX 태그 안의 $ 가 math 로 split되지 않음", () => {
        const input = `<ImageGroup images='["$0.01/GB","$100"]' />`;
        // transform은 upperCase로 — JSX 내부는 건드리지 않아야 함
        const result = transformOutsideCodeBlocks(input, (t) =>
            t.toUpperCase()
        );
        expect(result).toBe(input);
    });

    it("JSX 태그 외부의 $...$ math 는 여전히 보호됨", () => {
        const input = `텍스트 $x+y$ 더보기`;
        const result = transformOutsideCodeBlocks(input, (t) =>
            t.toUpperCase()
        );
        expect(result).toBe("텍스트 $x+y$ 더보기");
    });

    it("JSX tag ?? prose ? transform ??", () => {
        const input = `<ImageGroup images='["a"]' />\nafter text`;
        const result = transformOutsideCodeBlocks(input, (t) =>
            t.toUpperCase()
        );
        expect(result).toContain(`<ImageGroup images='["a"]' />`);
        expect(result).toContain("AFTER TEXT");
    });
});
