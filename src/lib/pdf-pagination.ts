// A4 비율 (297mm / 210mm)
const A4_RATIO = 297 / 210;
const BLOCK_SELECTOR = "[data-pdf-block], [data-pdf-block-item]";

const createSpacer = (height: number, isGridItem: boolean): HTMLElement => {
    const spacer = document.createElement("div");
    spacer.setAttribute("data-pdf-spacer", "true");
    spacer.style.height = `${height}px`;
    spacer.style.background = "transparent";
    spacer.style.pointerEvents = "none";
    if (isGridItem) spacer.style.gridColumn = "1 / -1";
    return spacer;
};

// 첫 내용 행과 함께 이동할 section 시작점
const getFirstContentAnchor = (
    block: HTMLElement,
    blocks: HTMLElement[],
    container: HTMLElement,
    rowBottom: number,
    containerTop: number,
    pageHeight: number
): HTMLElement => {
    let anchor = block;
    let parent = block.parentElement?.closest<HTMLElement>("[data-pdf-block]");
    while (parent && parent !== container && container.contains(parent)) {
        const section = parent;
        if (blocks.find((candidate) => section.contains(candidate)) !== block)
            break;
        const parentTop = parent.getBoundingClientRect().top - containerTop;
        if (rowBottom - parentTop > pageHeight) break;
        anchor = parent;
        parent = parent.parentElement?.closest<HTMLElement>("[data-pdf-block]");
    }
    return anchor;
};

// 내용 행과 첫 제목을 보존하는 페이지 경계
export const paginateBlocks = (container: HTMLElement): number[] => {
    const pageWidth = container.offsetWidth;
    if (pageWidth === 0) return [];
    const pageHeight = pageWidth * A4_RATIO;

    container
        .querySelectorAll("[data-pdf-spacer]")
        .forEach((el) => el.remove());
    const blocks = Array.from(
        container.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)
    ).filter(
        (block) =>
            block.hasAttribute("data-pdf-block-item") ||
            !block.querySelector(BLOCK_SELECTOR)
    );
    if (blocks.length === 0) return [];

    const containerTop = container.getBoundingClientRect().top;
    const pageBreaks: number[] = [];
    const processed = new Set<HTMLElement>();
    let currentPageBottom = pageHeight;

    for (const block of blocks) {
        if (processed.has(block)) continue;
        const isGridItem = block.hasAttribute("data-pdf-block-item");
        const blockRect = block.getBoundingClientRect();
        const rowTop = blockRect.top - containerTop;
        const row = [block];

        // 같은 부모의 동일 행을 한 단위로 측정
        if (isGridItem && block.parentElement) {
            for (const sibling of block.parentElement.children) {
                if (
                    sibling === block ||
                    !(sibling instanceof HTMLElement) ||
                    !sibling.hasAttribute("data-pdf-block-item")
                )
                    continue;
                if (
                    Math.abs(
                        sibling.getBoundingClientRect().top - blockRect.top
                    ) < 2
                )
                    row.push(sibling);
            }
        }
        row.forEach((item) => processed.add(item));
        const getRowBottom = () =>
            Math.max(
                ...row.map(
                    (item) => item.getBoundingClientRect().bottom - containerTop
                )
            );
        const rowBottom = getRowBottom();
        if (rowBottom <= currentPageBottom + 1) continue;

        // 한 페이지를 넘는 행의 기존 분할 유지
        if (rowBottom - rowTop > pageHeight) {
            while (currentPageBottom < rowBottom) {
                pageBreaks.push(currentPageBottom);
                currentPageBottom += pageHeight;
            }
            continue;
        }

        const anchor = isGridItem
            ? getFirstContentAnchor(
                  block,
                  blocks,
                  container,
                  rowBottom,
                  containerTop,
                  pageHeight
              )
            : block;
        const anchorTop = anchor.getBoundingClientRect().top - containerTop;

        while (currentPageBottom < anchorTop) {
            pageBreaks.push(currentPageBottom);
            currentPageBottom += pageHeight;
        }
        if (rowBottom <= currentPageBottom + 1) continue;

        const gap = currentPageBottom - anchorTop;
        if (gap > 0 && gap < pageHeight) {
            anchor.parentElement?.insertBefore(
                createSpacer(gap, anchor.hasAttribute("data-pdf-block-item")),
                anchor
            );
        }
        pageBreaks.push(currentPageBottom);
        currentPageBottom += pageHeight;

        // 위치 변경 뒤의 실제 행 끝을 기준으로 후속 페이지 계산
        const shiftedBottom = getRowBottom();
        while (currentPageBottom + 1 < shiftedBottom) {
            pageBreaks.push(currentPageBottom);
            currentPageBottom += pageHeight;
        }
    }
    return pageBreaks;
};
