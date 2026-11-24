import type { PdfVariant } from "@/types/resume-pdf";
import { PAGE_AREA } from "@/lib/resume-pdf/style";

// 브라우저 안에서 실행할 쪽 나눔 측정 (시제품 build-samples.mjs·pad-f.mjs 이식)
// 번들러가 함수에 helper를 끼워 넣지 않도록 문자열 원문으로 둠
// 전제: viewport 폭 = 쪽 내용 폭, print media

const MM = 96 / 25.4;

// PDF-F 履歴書: 1쪽 학력·직력 표에 빈 줄을 더하고, 2쪽 自己PR 칸 높이를 늘려 쪽을 채움 (D17)
const PAD_F = `(limit) => {
  const hist = document.querySelector("table.hist");
  const p2 = document.querySelector(".page2");
  if (!hist || !p2) return;
  const top = document.body.getBoundingClientRect().top;
  const rows = hist.querySelectorAll("tr");
  const rowH = rows[rows.length - 1].getBoundingClientRect().height;
  const free = limit - (hist.getBoundingClientRect().bottom - top);
  const body = hist.querySelector("tbody") || hist;
  for (let i = 0; i < Math.floor(free / rowH); i++) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td class="y"></td><td class="m"></td><td>&nbsp;</td>';
    body.appendChild(tr);
  }
  const pr = p2.querySelector("td.pr");
  const used = p2.getBoundingClientRect().height;
  if (pr && limit - used > 0) pr.style.height = pr.getBoundingClientRect().height + (limit - used) + "px";
}`;

// 한 쪽 이하 묶음(data-sec)은 통째 유지(keep). 넘으면 제자리에서 시작해 다음 쪽으로 흐름 (§7)
const MARK_KEEP = `(limit) => {
  let kept = 0;
  const all = document.querySelectorAll("[data-sec]");
  all.forEach((el) => {
    if (el.getBoundingClientRect().height > limit) return;
    el.classList.add("keep");
    kept++;
  });
  return { kept, total: all.length };
}`;

export const pageViewport = (variant: PdfVariant) => ({
    width: Math.round(PAGE_AREA[variant].w * MM),
    height: 1200,
});

// page.evaluate 로 실행할 식. 측정 오차 여유: 채우기 3mm, keep 2mm
export const paginateScript = (variant: PdfVariant): string => {
    const h = PAGE_AREA[variant].h;
    const pad = variant === "F" ? `(${PAD_F})(${(h - 3) * MM});` : "";
    return `(() => { ${pad} return (${MARK_KEEP})(${(h - 2) * MM}); })()`;
};
