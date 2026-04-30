// DB 내 Supabase Storage URL → R2 URL 일괄 치환
// 실행: pnpm tsx scripts/rewrite-image-urls.ts          (dry-run)
//       pnpm tsx scripts/rewrite-image-urls.ts --apply   (실제 적용)
// .env.local에 Supabase + R2 환경변수 필요

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_KEY =
    process.env.SUPABASE_SECRET_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL ?? "";

if (!SUPABASE_URL || !SUPABASE_KEY || !R2_PUBLIC_URL) {
    console.error(
        "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, R2_PUBLIC_URL"
    );
    process.exit(1);
}

const OLD_BASE = `${SUPABASE_URL}/storage/v1/object/public/images/`;
const NEW_BASE = `${R2_PUBLIC_URL}/`;
const DRY_RUN = !process.argv.includes("--apply");

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let changeCount = 0;

function replaceUrls(text: string): string {
    return text.replaceAll(OLD_BASE, NEW_BASE);
}

function hasChange(original: string, replaced: string): boolean {
    return original !== replaced;
}

// posts: content, thumbnail, og_image
async function rewritePosts() {
    console.log("\n--- posts ---");
    const { data: posts, error } = await supabase
        .from("posts")
        .select("id, slug, content, thumbnail, og_image");
    if (error) {
        console.error(error.message);
        return;
    }

    for (const post of posts ?? []) {
        const updates: Record<string, string> = {};
        if (
            post.content &&
            hasChange(post.content, replaceUrls(post.content))
        ) {
            updates.content = replaceUrls(post.content);
        }
        if (
            post.thumbnail &&
            hasChange(post.thumbnail, replaceUrls(post.thumbnail))
        ) {
            updates.thumbnail = replaceUrls(post.thumbnail);
        }
        if (
            post.og_image &&
            hasChange(post.og_image, replaceUrls(post.og_image))
        ) {
            updates.og_image = replaceUrls(post.og_image);
        }
        if (Object.keys(updates).length > 0) {
            changeCount++;
            console.log(
                `  [post] ${post.slug}: ${Object.keys(updates).join(", ")}`
            );
            if (!DRY_RUN) {
                const { error: ue } = await supabase
                    .from("posts")
                    .update(updates)
                    .eq("id", post.id);
                if (ue) console.error(`    ERROR: ${ue.message}`);
            }
        }
    }
}

// portfolio_items: content, thumbnail, og_image, data (JSONB)
async function rewritePortfolio() {
    console.log("\n--- portfolio_items ---");
    const { data: items, error } = await supabase
        .from("portfolio_items")
        .select("id, slug, content, thumbnail, og_image, data");
    if (error) {
        console.error(error.message);
        return;
    }

    for (const item of items ?? []) {
        const updates: Record<string, unknown> = {};
        if (
            item.content &&
            hasChange(item.content, replaceUrls(item.content))
        ) {
            updates.content = replaceUrls(item.content);
        }
        if (
            item.thumbnail &&
            hasChange(item.thumbnail, replaceUrls(item.thumbnail))
        ) {
            updates.thumbnail = replaceUrls(item.thumbnail);
        }
        if (
            item.og_image &&
            hasChange(item.og_image, replaceUrls(item.og_image))
        ) {
            updates.og_image = replaceUrls(item.og_image);
        }
        if (item.data) {
            const raw = JSON.stringify(item.data);
            if (hasChange(raw, replaceUrls(raw))) {
                updates.data = JSON.parse(replaceUrls(raw));
            }
        }
        if (Object.keys(updates).length > 0) {
            changeCount++;
            console.log(
                `  [portfolio] ${item.slug}: ${Object.keys(updates).join(", ")}`
            );
            if (!DRY_RUN) {
                const { error: ue } = await supabase
                    .from("portfolio_items")
                    .update(updates)
                    .eq("id", item.id);
                if (ue) console.error(`    ERROR: ${ue.message}`);
            }
        }
    }
}

// about_data: data (JSONB) — profile_image 등
async function rewriteAbout() {
    console.log("\n--- about_data ---");
    const { data: rows, error } = await supabase
        .from("about_data")
        .select("id, data");
    if (error) {
        console.error(error.message);
        return;
    }

    for (const row of rows ?? []) {
        if (!row.data) continue;
        const raw = JSON.stringify(row.data);
        if (hasChange(raw, replaceUrls(raw))) {
            changeCount++;
            console.log(`  [about] id=${row.id}: data`);
            if (!DRY_RUN) {
                const { error: ue } = await supabase
                    .from("about_data")
                    .update({ data: JSON.parse(replaceUrls(raw)) })
                    .eq("id", row.id);
                if (ue) console.error(`    ERROR: ${ue.message}`);
            }
        }
    }
}

// resume_data: data (JSONB)
async function rewriteResume() {
    console.log("\n--- resume_data ---");
    const { data: rows, error } = await supabase
        .from("resume_data")
        .select("id, data");
    if (error) {
        console.error(error.message);
        return;
    }

    for (const row of rows ?? []) {
        if (!row.data) continue;
        const raw = JSON.stringify(row.data);
        if (hasChange(raw, replaceUrls(raw))) {
            changeCount++;
            console.log(`  [resume] id=${row.id}: data`);
            if (!DRY_RUN) {
                const { error: ue } = await supabase
                    .from("resume_data")
                    .update({ data: JSON.parse(replaceUrls(raw)) })
                    .eq("id", row.id);
                if (ue) console.error(`    ERROR: ${ue.message}`);
            }
        }
    }
}

// site_config: value (JSONB) — og_image 등
async function rewriteSiteConfig() {
    console.log("\n--- site_config ---");
    const { data: rows, error } = await supabase
        .from("site_config")
        .select("key, value");
    if (error) {
        console.error(error.message);
        return;
    }

    for (const row of rows ?? []) {
        if (!row.value) continue;
        const raw = JSON.stringify(row.value);
        if (hasChange(raw, replaceUrls(raw))) {
            changeCount++;
            console.log(`  [config] ${row.key}: value`);
            if (!DRY_RUN) {
                const { error: ue } = await supabase
                    .from("site_config")
                    .update({ value: JSON.parse(replaceUrls(raw)) })
                    .eq("key", row.key);
                if (ue) console.error(`    ERROR: ${ue.message}`);
            }
        }
    }
}

// books: thumbnail, content
async function rewriteBooks() {
    console.log("\n--- books ---");
    const { data: books, error } = await supabase
        .from("books")
        .select("id, slug, thumbnail, content");
    if (error) {
        console.error(error.message);
        return;
    }

    for (const book of books ?? []) {
        const updates: Record<string, string> = {};
        if (
            book.thumbnail &&
            hasChange(book.thumbnail, replaceUrls(book.thumbnail))
        ) {
            updates.thumbnail = replaceUrls(book.thumbnail);
        }
        if (
            book.content &&
            hasChange(book.content, replaceUrls(book.content))
        ) {
            updates.content = replaceUrls(book.content);
        }
        if (Object.keys(updates).length > 0) {
            changeCount++;
            console.log(
                `  [book] ${book.slug}: ${Object.keys(updates).join(", ")}`
            );
            if (!DRY_RUN) {
                const { error: ue } = await supabase
                    .from("books")
                    .update(updates)
                    .eq("id", book.id);
                if (ue) console.error(`    ERROR: ${ue.message}`);
            }
        }
    }
}

// editor_states: content (draft/autosave 상태)
async function rewriteEditorStates() {
    console.log("\n--- editor_states ---");
    const { data: rows, error } = await supabase
        .from("editor_states")
        .select("id, content");
    if (error) {
        console.error(error.message);
        return;
    }

    for (const row of rows ?? []) {
        if (!row.content) continue;
        if (hasChange(row.content, replaceUrls(row.content))) {
            changeCount++;
            console.log(`  [editor_state] id=${row.id}`);
            if (!DRY_RUN) {
                const { error: ue } = await supabase
                    .from("editor_states")
                    .update({ content: replaceUrls(row.content) })
                    .eq("id", row.id);
                if (ue) console.error(`    ERROR: ${ue.message}`);
            }
        }
    }
}

async function main() {
    console.log(
        DRY_RUN
            ? "=== DRY RUN (변경 미적용) ==="
            : "=== APPLY MODE (실제 적용) ==="
    );
    console.log(`치환: ${OLD_BASE}`);
    console.log(`   → ${NEW_BASE}\n`);

    await rewritePosts();
    await rewritePortfolio();
    await rewriteAbout();
    await rewriteResume();
    await rewriteSiteConfig();
    await rewriteBooks();
    await rewriteEditorStates();

    console.log(
        `\n총 ${changeCount}건 변경${DRY_RUN ? " 예정 (--apply 로 실제 적용)" : " 완료"}`
    );
}

main().catch(console.error);
