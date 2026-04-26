#!/usr/bin/env node
// .claude/rules/*.md → .agents/directives/omc/*.md 일방향 sync
// OMC가 .claude/rules/ 를 갱신하면 이 스크립트가 commit 추적용 snapshot 생성

import {
    readdir,
    readFile,
    writeFile,
    mkdir,
    rm,
    stat,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, ".claude", "rules");
const DST = path.join(ROOT, ".agents", "directives", "omc");

async function main() {
    if (!existsSync(SRC)) {
        console.log(`[sync-omc-directives] ${SRC} 없음 — skip`);
        return;
    }

    const srcStat = await stat(SRC);
    if (!srcStat.isDirectory()) {
        console.log(`[sync-omc-directives] ${SRC} 디렉토리 아님 — skip`);
        return;
    }

    const entries = await readdir(SRC, { withFileTypes: true });
    const mdFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => e.name);

    if (mdFiles.length === 0) {
        console.log(`[sync-omc-directives] ${SRC} 비어있음 — skip`);
        return;
    }

    if (existsSync(DST)) {
        const oldEntries = await readdir(DST);
        for (const name of oldEntries) {
            await rm(path.join(DST, name), { recursive: true, force: true });
        }
    } else {
        await mkdir(DST, { recursive: true });
    }

    for (const name of mdFiles) {
        const content = await readFile(path.join(SRC, name), "utf8");
        await writeFile(path.join(DST, name), content);
    }

    console.log(
        `[sync-omc-directives] ${mdFiles.length} 파일 sync: .claude/rules/ → .agents/directives/omc/`
    );
}

main().catch((err) => {
    console.error("[sync-omc-directives] 실패", err);
    process.exit(1);
});
