import { siGithub, siNpm } from "simple-icons";
import { ym } from "@/lib/resume-pdf/dates";
import { PDF_LABELS, type PdfLabels } from "@/lib/resume-pdf/labels";
import {
    cssC,
    cssF,
    fontFaceCss,
    roleColumnWidth,
    type PdfFontUrls,
} from "@/lib/resume-pdf/style";
import {
    escapeCssString,
    escapeHtml as esc,
    markdownToHtml as md,
    plainUrl,
    safeHref,
} from "@/lib/resume-pdf/text";
import type {
    PdfProject,
    PdfVariant,
    ResumePdfModel,
} from "@/types/resume-pdf";

// 이력서 PDF HTML 생성 (시제품 build-samples.mjs 이식). 입력은 모델만 사용
export type RenderOptions = {
    fonts: PdfFontUrls;
    // 사진·썸네일 원본 주소 → 미리 받아 둔 data URI. 없으면 그림 생략 (외부 요청 0)
    resolveImage?: (url: string) => string | undefined;
};

type Ctx = {
    m: ResumePdfModel;
    L: PdfLabels;
    img: (url?: string) => string | undefined;
};

const icon: Record<string, string> = {
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/></svg>',
    phone: '<svg viewBox="0 0 24 24"><path d="m6 3 4 4-2 3a14 14 0 0 0 6 6l3-2 4 4-2 3C10 22 2 14 3 5Z"/></svg>',
    link: '<svg viewBox="0 0 24 24"><path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5"/></svg>',
    github: `<svg class="brand" viewBox="0 0 24 24"><path d="${siGithub.path}"/></svg>`,
    npm: `<svg class="brand" viewBox="0 0 24 24"><path d="${siNpm.path}"/></svg>`,
    linkedin:
        '<svg class="brand" viewBox="0 0 24 24"><circle cx="5" cy="5" r="2"/><path d="M3 9h4v12H3Zm7 0h4v2c1-2 7-4 7 4v6h-4v-6c0-3-3-3-3 0v6h-4Z"/></svg>',
};

const page = (lang: string, title: string, css: string, body: string) =>
    `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${css}</style></head><body>${body}</body></html>`;

const period = (L: PdfLabels, start: string, end?: string) =>
    `${ym(start)} – ${end ? ym(end) : L.present}`;

const military = (L: PdfLabels, m: ResumePdfModel["basics"]["military"]) =>
    m ? `${m.status}${m.start ? L.paren(L.period2(m.start, m.end)) : ""}` : "";

const aiRemarkMd = (m: ResumePdfModel) =>
    m.aiRemarks.map((r) => `- ${r.name}: ${r.text}`).join("\n");

const eduEndLabel = (L: PdfLabels, e: ResumePdfModel["education"][number]) =>
    e.status === "enrolled"
        ? L.enrolled
        : `${ym(e.end)}${e.status === "expected" ? L.paren(L.expected) : ""}`;

// ---------- PDF-C ----------

const btn = (href: string, label: string, kind = "link") => {
    const safe = safeHref(href);
    const inner = `${icon[kind] ?? icon.link}<span>${esc(label)}</span>`;
    return safe
        ? `<a class="btn ${kind}" href="${esc(safe)}">${inner}</a>`
        : `<span class="btn ${kind}">${inner}</span>`;
};

const profileKind = (url: string) =>
    /github/i.test(url)
        ? "github"
        : /linkedin/i.test(url)
          ? "linkedin"
          : /npmjs/i.test(url)
            ? "npm"
            : "link";

// 섹션: 최상위만 data-sec (한 쪽 이하면 측정 후 keep). 제목은 첫 항목과 묶음
const sec = (title: string, items: string[] | string, cls = "") => {
    const list = [items].flat().filter(Boolean);
    return `<section class="sec ${cls}" data-sec><div class="head-keep"><h2>${esc(title)}</h2>${list[0] ?? ""}</div>${list.slice(1).join("")}</section>`;
};

const kindTag = ({ L }: Ctx, x: PdfProject) => {
    const kind =
        x.type === "work"
            ? `${L.workProj}${x.company ? ` · ${x.company}` : ""}`
            : x.type === "personal"
              ? L.personalProj
              : L.projects;
    return `${x.ai ? `${L.aiTag} · ` : ""}${kind}${x.planned ? ` · ${L.planned}` : ""}`;
};

const projCard = (c: Ctx, x: PdfProject) => {
    const thumb = c.img(x.thumb);
    return `<div class="proj${thumb ? "" : " wide"}">${thumb ? `<img src="${esc(thumb)}" alt="">` : ""}<div>
<span class="tag">${esc(kindTag(c, x))}</span>
<div class="row"><h3>${esc(x.name)}</h3><span class="meta">${period(c.L, x.start, x.end)}</span></div>
<p class="desc">${esc(x.description)}</p>
${x.sections.map((s) => `<h4>${esc(s.title)}</h4>${md(s.content)}`).join("")}
${x.tech ? `<p class="tech">${esc(x.tech)}</p>` : ""}
${x.links.length ? `<div class="btns">${x.links.map((u) => (/github\.com/.test(u) ? btn(u, "GitHub", "github") : btn(u, plainUrl(u)))).join("")}</div>` : ""}
</div></div>`;
};

const dlRows = (rows: [string, string][]) =>
    `<dl class="skills">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>`;

const sectionC = (c: Ctx, key: string): string => {
    const { m, L } = c;
    switch (key) {
        case "coreCompetencies":
            return m.core.length
                ? sec(
                      L.core,
                      `<div class="cards">${m.core.map((x) => `<div class="card${x.ai ? " ai" : ""}"><h3>${esc(x.title)}</h3>${md(x.description)}</div>`).join("")}</div>`
                  )
                : "";
        case "work":
            return m.work.length
                ? sec(
                      L.work,
                      m.work.map(
                          (
                              g
                          ) => `<div class="job"><div class="row"><h3>${esc(g.name)}</h3><span class="meta">${period(L, g.start, g.end)} · ${L.duration(g.months)}</span></div>
${g.location ? `<div class="meta" style="white-space:normal">${esc(g.location)}</div>` : ""}
${g.roles.map((r) => `<div class="role"><div class="row"><span class="pos">${esc([r.position, r.employmentType].filter(Boolean).join(" · "))}</span><span class="meta">${period(L, r.start, r.end)}</span></div>${r.summary ? `<p class="sum">${esc(r.summary)}</p>` : ""}${r.highlights.length ? `<ul>${r.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}</div>`).join("")}</div>`
                      )
                  )
                : "";
        case "projects": {
            const p = m.projects;
            const block = (title: string, list: PdfProject[], cls = "") =>
                list.length
                    ? sec(
                          title,
                          list.map((x) => projCard(c, x)),
                          cls
                      )
                    : "";
            return (
                block(L.workProj, p.work) +
                block(L.ai, p.ai, "ai") +
                block(L.personalProj, p.personal) +
                block(L.projects, p.other)
            );
        }
        case "skills":
            return m.skills.length
                ? sec(
                      L.skills,
                      `<dl class="skills">${m.skills.map((s) => `<dt>${esc(s.name)}</dt><dd>${s.items.map((k) => `<span class="chip">${esc(k.name)}</span>`).join("")}</dd>`).join("")}</dl>`
                  )
                : "";
        case "education":
            return m.education.length
                ? sec(
                      L.edu,
                      m.education.map((e) => {
                          const line = [
                              e.area,
                              e.studyType,
                              e.gpa ? `GPA ${e.gpa}` : "",
                          ]
                              .filter(Boolean)
                              .map(esc)
                              .join(" · ");
                          return `<div class="edu"><div class="row"><h3 style="font-size:10pt;margin:0">${esc(e.institution)}</h3><span class="meta">${ym(e.start)} – ${esc(eduEndLabel(L, e))}</span></div>${line || e.location ? `<p>${line}${e.location ? `${line ? " · " : ""}<span class="meta">${esc(e.location)}</span>` : ""}</p>` : ""}${e.courses.length ? `<p class="edu-courses"><b>${esc(L.courses)}</b>${e.courses.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</p>` : ""}</div>`;
                      })
                  )
                : "";
        case "training":
            return m.training.length
                ? sec(
                      L.training,
                      dlRows(
                          m.training.map((t) => [
                              L.period2(t.start, t.end),
                              `${t.title}${t.organizer ? L.paren(t.organizer) : ""}`,
                          ])
                      )
                  )
                : "";
        case "certificates":
            return m.certificates.length
                ? sec(
                      L.certs,
                      dlRows(
                          m.certificates.map((x) => [
                              ym(x.date),
                              L.certFmt(x.name, x.issuer),
                          ])
                      )
                  )
                : "";
        case "awards":
            return m.awards.length
                ? sec(
                      L.awards,
                      dlRows(
                          m.awards.map((x) => [
                              ym(x.date),
                              L.awardFmt(x.title, x.awarder),
                          ])
                      )
                  )
                : "";
        case "languages":
            return m.languages.length
                ? sec(
                      L.lang,
                      dlRows(m.languages.map((x) => [x.language, x.fluency]))
                  )
                : "";
        default:
            return "";
    }
};

export const renderC = (m: ResumePdfModel, opts: RenderOptions): string => {
    const L = PDF_LABELS[m.lang];
    const c: Ctx = {
        m,
        L,
        img: (u) => (u ? opts.resolveImage?.(u) : undefined),
    };
    const b = m.basics;
    const photo = c.img(b.image);
    const head = `<header class="head"><div><h1>${esc(b.name)}</h1>${b.headline ? `<p class="title">${esc(b.headline)}</p>` : ""}
${b.email || b.phone ? `<div class="btns">${b.email ? btn(`mailto:${b.email}`, b.email, "mail") : ""}${b.phone ? btn(`tel:${b.phone.replace(/[^+\d]/g, "")}`, b.phone, "phone") : ""}</div>` : ""}
${b.profiles.length || b.url ? `<div class="btns">${b.url ? btn(b.url, plainUrl(b.url)) : ""}${b.profiles.map((p) => btn(p.url, p.network || plainUrl(p.url), profileKind(p.url))).join("")}</div>` : ""}</div>
${photo ? `<img class="photo" src="${esc(photo)}" alt="">` : "<div></div>"}</header>`;
    const aiIntro = m.aiRemarks.length
        ? `<div class="ai-note"><p class="ai-label">${esc(L.ai)}</p>${md(aiRemarkMd(m))}</div>`
        : "";
    const introBody = md(m.intro.description) + md(m.intro.descriptionSub);
    const introS =
        introBody || aiIntro ? sec(L.intro, introBody + aiIntro) : "";
    const facts = (
        [
            [L.birth, b.birthDate ? L.birthFmt(b.birthDate, b.age ?? 0) : ""],
            [L.addr, b.address ?? ""],
            [L.military, military(L, b.military)],
        ] as [string, string][]
    ).filter(([, v]) => v);
    const personalS = facts.length
        ? sec(
              L.personal,
              `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>`
          )
        : "";
    const body =
        head +
        introS +
        personalS +
        m.sections.map((key) => sectionC(c, key)).join("");
    const footer = escapeCssString(
        [b.name, b.headline].filter(Boolean).join(" · ")
    );
    return page(
        m.lang,
        [b.name, b.headline].filter(Boolean).join(" · "),
        fontFaceCss(opts.fonts) + cssC(m.lang, footer),
        body
    );
};

// ---------- PDF-F ----------

const histRow = (date: string | undefined, text: string, cls = "") =>
    `<tr><td class="y">${date ? date.slice(0, 4) : ""}</td><td class="m">${date && date.length >= 7 ? Number(date.slice(5, 7)) : ""}</td><td class="${cls}">${text}</td></tr>`;

const datedTable = (
    L: PdfLabels,
    head: string,
    rows: { date?: string; text: string }[],
    cls = "mt"
) =>
    `<table class="hist lic outer ${cls}"><tr><th>${L.year}</th><th>${L.month}</th><th>${esc(head)}</th></tr>${[
        ...rows,
    ]
        .sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""))
        .map((r) => histRow(r.date, esc(r.text)))
        .join("")}</table>`;

export const renderF = (m: ResumePdfModel, opts: RenderOptions): string => {
    const L = PDF_LABELS[m.lang];
    const b = m.basics;
    const photo = b.image ? opts.resolveImage?.(b.image) : undefined;
    const roleW = roleColumnWidth(m.lang);

    // 履歴書 학력·직력 (오래된 순)
    const hist: string[] = [];
    if (m.education.length) {
        hist.push(histRow(undefined, esc(L.eduHead), "center"));
        for (const e of [...m.education].sort((a, c) =>
            a.start.localeCompare(c.start)
        )) {
            hist.push(
                histRow(
                    e.start,
                    `${esc(e.institution)} ${e.area ? `${esc(e.area)} ` : ""}${L.enter}`
                )
            );
            const study = e.studyType ? L.paren(esc(e.studyType)) : "";
            if (e.status === "enrolled")
                hist.push(
                    histRow(undefined, `${esc(e.institution)} ${L.enrolled}`)
                );
            else
                hist.push(
                    histRow(
                        e.end,
                        `${esc(e.institution)} ${e.status === "expected" ? L.expected : L.grad}${study}`
                    )
                );
        }
    }
    if (m.work.length) {
        hist.push(histRow(undefined, esc(L.workHead), "center"));
        for (const g of [...m.work].reverse()) {
            [...g.roles].reverse().forEach((r, i) => {
                const text =
                    i === 0
                        ? `${esc(g.name)} ${L.join} — ${esc(r.position)}${r.employmentType ? L.paren(esc(r.employmentType)) : ""}`
                        : r.converted
                          ? `${esc(g.name)} ${esc(L.convertFmt(r.employmentType))} — ${esc(r.position)}`
                          : `${esc(g.name)} — ${esc(r.position)}`;
                hist.push(histRow(r.start, text));
            });
            hist.push(
                g.end
                    ? histRow(g.end, `${esc(g.name)} ${L.leave}`)
                    : histRow(undefined, L.current)
            );
        }
    }
    hist.push(histRow(undefined, L.end, "end"));

    const contactRows = (
        [
            [L.birth, b.birthDate ? L.birthFmt(b.birthDate, b.age ?? 0) : ""],
            [L.addr, b.address ?? ""],
            [L.phone, b.phone ?? ""],
            [L.email, b.email ?? ""],
            [L.military, military(L, b.military)],
        ] as [string, string][]
    ).filter(([, v]) => v);

    // 履歴書 양식상 免許・資格 칸은 항상 둠. 없거나 숨기면 「特になし」
    const licence = m.certificates.length
        ? datedTable(
              L,
              L.license,
              m.certificates.map((x) => ({
                  date: x.date,
                  text: L.certFmt(x.name, x.issuer),
              })),
              ""
          )
        : `<table class="hist lic outer"><tr><th>${L.year}</th><th>${L.month}</th><th>${L.license}</th></tr><tr><td class="y"></td><td class="m"></td><td>${L.none}</td></tr><tr><td></td><td></td><td></td></tr><tr><td></td><td></td><td></td></tr></table>`;
    const awards = m.awards.length
        ? datedTable(
              L,
              L.awards,
              m.awards.map((x) => ({
                  date: x.date,
                  text: L.awardFmt(x.title, x.awarder),
              }))
          )
        : "";
    const training = m.training.length
        ? datedTable(
              L,
              L.training,
              m.training.map((t) => ({
                  date: t.start,
                  text: `${t.title}${t.organizer ? L.paren(t.organizer) : ""} ${L.period2(t.start, t.end)}`,
              }))
          )
        : "";
    const langs = m.languages.length
        ? `<table class="outer mt"><tr><th>${L.lang}</th></tr><tr><td>${m.languages.map((x) => `${esc(x.language)}: ${esc(x.fluency)}`).join("<br>")}</td></tr></table>`
        : "";
    const aiPr = m.aiRemarks.length
        ? `<p class="small"><strong>${esc(L.ai)}</strong></p>${md(aiRemarkMd(m), false)}`
        : "";

    const rireki = `<h1>${L.rireki}</h1>
<div class="top"><table class="outer"><tr><td class="lbl">${L.name}</td><td class="name">${esc(b.name)}</td></tr>
${contactRows.map(([k, v]) => `<tr><td class="lbl">${k}</td><td>${esc(v)}</td></tr>`).join("")}</table>
${photo ? `<img class="photo" src="${esc(photo)}" alt="">` : "<div></div>"}</div>
<table class="hist outer mt"><tr><th>${L.year}</th><th>${L.month}</th><th>${L.eduWork}</th></tr>${hist.join("")}</table>
<div class="page2">${licence}${awards}${training}${langs}
<table class="outer mt block"><tr><th>${L.pr}</th></tr><tr><td class="pr">${md(m.intro.description, false)}${md(m.intro.descriptionSub, false)}${aiPr}</td></tr></table>
<table class="outer mt block"><tr><th>${L.wish}</th></tr><tr><td class="wish">${L.wishText}</td></tr></table></div>`;

    // 職務経歴書 표: [제목 + 회사 행 + 머리글 + 첫 행] 분할 금지 + 나머지 행. 같은 열 너비로 한 표처럼 보임
    const table = (
        cls: "detail" | "skill",
        cols: string[],
        rows: string[],
        o: { title?: string; co?: string; extra?: string; top?: boolean } = {}
    ) => {
        const colg =
            cls === "detail"
                ? `<colgroup><col style="width:24mm"><col><col style="width:${roleW}"></colgroup>`
                : '<colgroup><col style="width:30mm"><col></colgroup>';
        const headRows = `${o.co ? `<tr class="corow"><th colspan="${cols.length}">${o.co}</th></tr>` : ""}<tr>${cols.map((x) => `<th>${x}</th>`).join("")}</tr>`;
        const head = `<div class="head-keep">${o.title ? `<h2>${esc(o.title)}</h2>` : ""}<table class="${cls}">${colg}${headRows}${rows[0] ?? ""}</table></div>`;
        const rest =
            rows.length > 1
                ? `<table class="${cls} cont">${colg}${rows.slice(1).join("")}</table>`
                : "";
        return `<div class="tbl ${o.extra ?? ""}"${o.top === false ? "" : " data-sec"}>${head}${rest}</div>`;
    };
    const projRow = (x: PdfProject, extra = "") =>
        `<tr><td class="p">${ym(x.start)}<br>– ${x.end ? ym(x.end) : L.present}</td><td><p><strong>${esc(x.name)}</strong>${x.planned ? `<br><span class="small">${esc(L.planned)}</span>` : ""}</p><p>${esc(x.description)}</p>${x.sections.map((s) => `<p class="small"><strong>${esc(s.title)}</strong></p>${md(s.content, false)}`).join("")}${x.links.map((u) => `<p class="small">${esc(u)}</p>`).join("")}</td><td class="r">${extra}${esc(x.role)}${x.team ? `<br>${typeof x.team === "number" ? L.teamFmt(x.team) : esc(x.team)}` : ""}${x.tech ? `<br>${esc(x.tech)}` : ""}</td></tr>`;
    const cols = [L.period, L.content, L.env];

    const summary = `<p>${L.total} ${L.duration(m.totalMonths)}${
        m.work.length
            ? L.paren(
                  [...m.work]
                      .reverse()
                      .map(
                          (g) =>
                              `${esc(g.name)} ${ym(g.start)}–${g.end ? ym(g.end) : L.present}`
                      )
                      .join(", ")
              )
            : ""
    }</p>${md(m.intro.descriptionSub || m.intro.description, false)}`;
    const workBlocks = m.work
        .map((g, i) => {
            const roleRows = g.roles.map(
                (r) =>
                    `<tr><td class="p">${ym(r.start)}<br>– ${r.end ? ym(r.end) : L.present}</td><td>${r.summary ? `<p>${esc(r.summary)}</p>` : ""}${r.highlights.length ? `<ul>${r.highlights.map((h) => `<li>${esc(h)}</li>`).join("")}</ul>` : ""}</td><td class="r">${esc(r.position)}<br>${esc(r.employmentType)}</td></tr>`
            );
            const projRows = m.projects.work
                .filter((x) => x.company === g.name)
                .map((x) => projRow(x, x.ai ? `${esc(L.aiTag)}<br>` : ""));
            const co = `<div class="co">${esc(g.name)}<span>${period(L, g.start, g.end)} (${L.duration(g.months)})${g.location ? ` · ${esc(g.location)}` : ""}</span></div>`;
            return table("detail", cols, [...roleRows, ...projRows], {
                title: i === 0 ? L.detail : "",
                co,
                extra: i === 0 ? "first" : "",
                top: false,
            });
        })
        .join("");
    const orphan = m.projects.work.filter((x) => !x.company);
    const blocks = [
        m.work.length ? `<div class="secF" data-sec>${workBlocks}</div>` : "",
        orphan.length
            ? table(
                  "detail",
                  cols,
                  orphan.map((x) => projRow(x)),
                  { title: L.workProj }
              )
            : "",
        m.projects.ai.length
            ? table(
                  "detail",
                  cols,
                  m.projects.ai.map((x) => projRow(x)),
                  { title: L.ai }
              )
            : "",
        m.projects.personal.length
            ? table(
                  "detail",
                  cols,
                  m.projects.personal.map((x) => projRow(x)),
                  { title: L.personalProj }
              )
            : "",
        m.projects.other.length
            ? table(
                  "detail",
                  cols,
                  m.projects.other.map((x) => projRow(x)),
                  { title: L.projects }
              )
            : "",
        m.skills.length
            ? table(
                  "skill",
                  [L.category, L.tech],
                  m.skills.map(
                      (s) =>
                          `<tr><td class="lbl">${esc(s.name)}</td><td>${s.items.map((k) => `${esc(k.name)}${k.level ? ` (${esc(k.level)})` : ""}`).join(", ")}</td></tr>`
                  ),
                  { title: L.skillTable }
              )
            : "",
        m.core.length && m.shokumuSelfPr
            ? `<div class="secF" data-sec>${m.core.map((x, i) => `<div class="block">${i === 0 ? `<h2>${esc(L.pr)}</h2>` : ""}<h3>${esc(x.title)}</h3>${md(x.description, false)}</div>`).join("")}</div>`
            : "",
    ];
    const links = [b.email, b.url, ...b.profiles.map((p) => p.url)].filter(
        Boolean
    ) as string[];
    const shokumu = `<div class="part"><h1>${L.shokumu}</h1><p class="date">${L.asOfFmt(m.asOf)}<br>${L.name} ${esc(b.name)}</p>
${links.length ? `<p class="head-links">${links.map(esc).join("<br>")}</p>` : ""}
<div class="block"><h2>${L.summary}</h2>${summary}</div>
${blocks.join("\n")}</div>`;

    return page(
        m.lang,
        `${b.name} · ${L.rireki.replace(/ /g, "")}`,
        fontFaceCss(opts.fonts) + cssF(m.lang),
        rireki + shokumu
    );
};

export const renderResumePdf = (
    model: ResumePdfModel,
    variant: PdfVariant,
    opts: RenderOptions
): string => (variant === "C" ? renderC(model, opts) : renderF(model, opts));
