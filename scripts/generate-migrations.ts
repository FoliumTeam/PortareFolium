import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";

type ParsedMigration = {
    version: string;
    title: string;
    feature: string;
    manual?: string;
    sql: string;
    sqliteSql?: string;
};

const repoRoot = process.cwd();
const migrationsDir = join(repoRoot, "supabase", "migrations");
const outputFile = join(repoRoot, "src", "lib", "migrations.ts");
const fileNamePattern = /^(\d{3})_v(\d+(?:_\d+)*)_(.+)\.sql$/;
const headerPattern = /^--\s+(\d{3})\s+·\s+v([0-9.]+)\s+·\s+(.+)$/;
const manualPrefix = "-- Manual note: ";
const sqliteStart = "-- @sqlite-sql-start";
const sqliteEnd = "-- @sqlite-sql-end";

function fail(message: string): never {
    throw new Error(`[generate-migrations] ${message}`);
}

function stripTrailingWhitespace(value: string): string {
    return value
        .split("\n")
        .map((line) => line.replace(/\s+$/u, ""))
        .join("\n")
        .trim();
}

function stripSqlCommentPrefix(line: string): string {
    return line.replace(/^-- ?/u, "");
}

function extractSqliteSql(lines: string[]): {
    sqlLines: string[];
    sqliteSql?: string;
} {
    const start = lines.findIndex((line) => line.trim() === sqliteStart);
    if (start === -1) return { sqlLines: lines };

    const end = lines.findIndex(
        (line, index) => index > start && line.trim() === sqliteEnd
    );
    if (end === -1) fail("Found @sqlite-sql-start without @sqlite-sql-end");

    const sqliteSql = stripTrailingWhitespace(
        lines
            .slice(start + 1, end)
            .map(stripSqlCommentPrefix)
            .join("\n")
    );

    return {
        sqlLines: [...lines.slice(0, start), ...lines.slice(end + 1)],
        sqliteSql: sqliteSql || undefined,
    };
}

function parseMigration(
    fileName: string,
    expectedIndex: number
): ParsedMigration {
    const fileMatch = fileName.match(fileNamePattern);
    if (!fileMatch) {
        fail(`${fileName} must match 001_v0_0_0_short_description.sql naming`);
    }

    const [, prefix, versionParts] = fileMatch;
    const expectedPrefix = String(expectedIndex).padStart(3, "0");
    if (prefix !== expectedPrefix) {
        fail(`${fileName} must use prefix ${expectedPrefix}`);
    }

    const fileVersion = versionParts.replaceAll("_", ".");
    const raw = readFileSync(join(migrationsDir, fileName), "utf8")
        .replace(/^\uFEFF/u, "")
        .replace(/\r\n/g, "\n");
    const lines = raw.split("\n");
    const headerMatch = lines[0]?.match(headerPattern);
    if (!headerMatch) {
        fail(`${fileName} is missing '-- 001 · v0.0.0 · title' header`);
    }

    const [, headerPrefix, headerVersion, title] = headerMatch;
    if (headerPrefix !== prefix) {
        fail(`${fileName} prefix does not match its header prefix`);
    }
    if (headerVersion !== fileVersion) {
        fail(`${fileName} version does not match its header version`);
    }

    const featureLine = lines[1];
    if (!featureLine?.startsWith("-- ")) {
        fail(`${fileName} is missing feature comment on line 2`);
    }

    let nextLineIndex = 2;
    let manual: string | undefined;
    if (lines[nextLineIndex]?.startsWith(manualPrefix)) {
        manual = lines[nextLineIndex].slice(manualPrefix.length).trim();
        nextLineIndex += 1;
    }

    while (lines[nextLineIndex] === "") nextLineIndex += 1;

    const { sqlLines, sqliteSql } = extractSqliteSql(
        lines.slice(nextLineIndex)
    );
    const sql = stripTrailingWhitespace(sqlLines.join("\n"));
    if (!sql) fail(`${fileName} has no SQL body`);

    return {
        version: fileVersion,
        title: title.trim(),
        feature: stripSqlCommentPrefix(featureLine).trim(),
        ...(manual ? { manual } : {}),
        sql,
        ...(sqliteSql ? { sqliteSql } : {}),
    };
}

function templateLiteral(value: string): string {
    return `\`${value.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``;
}

function renderMigration(migration: ParsedMigration): string {
    const fields = [
        `        version: ${JSON.stringify(migration.version)},`,
        `        title: ${JSON.stringify(migration.title)},`,
        `        feature: ${JSON.stringify(migration.feature)},`,
    ];

    if (migration.manual) {
        fields.push(`        manual: ${JSON.stringify(migration.manual)},`);
    }

    fields.push(`        sql: ${templateLiteral(migration.sql)},`);

    if (migration.sqliteSql) {
        fields.push(
            `        sqliteSql: ${templateLiteral(migration.sqliteSql)},`
        );
    }

    return `    {\n${fields.join("\n")}\n    }`;
}

const fileNames = readdirSync(migrationsDir)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

if (fileNames.length === 0) fail("No SQL migrations found");

const migrations = fileNames.map((fileName, index) =>
    parseMigration(fileName, index + 1)
);

const output = `// DB 마이그레이션 버전 관리 모듈\n// AUTO-GENERATED by scripts/generate-migrations.ts. Do not edit by hand.\n// Source of truth: supabase/migrations/001_*.sql\n// 버전 체계: migration.version = 해당 마이그레이션이 추가된 package.json 버전과 동일\n// 향후 마이그레이션 추가 시 SQL 끝에 db_schema_version 업데이트 구문 포함 필요\n\nimport packageJson from "../../package.json";\n\n// 현재 앱 버전 (package.json 기준)\nexport const APP_VERSION: string = packageJson.version;\n\nexport interface Migration {\n    version: string;\n    title: string;\n    feature: string;\n    sql: string;\n    sqliteSql?: string;\n    manual?: string;\n}\n\n// a < b → -1 | a === b → 0 | a > b → 1\nexport function compareVersions(a: string, b: string): number {\n    const pa = a.split(".").map(Number);\n    const pb = b.split(".").map(Number);\n    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {\n        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);\n        if (diff !== 0) return diff < 0 ? -1 : 1;\n    }\n    return 0;\n}\n\n// dbVersion보다 높은 버전의 마이그레이션만 반환 (오름차순)\nexport function getPendingMigrations(dbVersion: string): Migration[] {\n    return [...MIGRATIONS]\n        .filter((m) => compareVersions(m.version, dbVersion) > 0)\n        .sort((a, b) => compareVersions(a.version, b.version));\n}\n\nexport const MIGRATIONS: Migration[] = [\n${migrations.map(renderMigration).join(",\n")}\n];\n`;

resolveConfig(outputFile)
    .then((prettierConfig) =>
        format(output, {
            ...prettierConfig,
            filepath: outputFile,
        })
    )
    .then((formattedOutput) => {
        writeFileSync(outputFile, formattedOutput, "utf8");
        console.log(
            `[generate-migrations] wrote ${migrations.length} migrations to ${outputFile}`
        );
    })
    .catch((error: unknown) => {
        console.error(error);
        process.exitCode = 1;
    });
