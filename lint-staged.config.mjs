const hiveManagedPaths = [".agents/skills/", ".hive/"];
const hiveManagedFiles = new Set(["AGENTS.md", "CLAUDE.md", "GEMINI.md"]);

const shouldFormat = (file) => {
    const normalizedPath = file.replaceAll("\\", "/");

    return (
        !hiveManagedPaths.some((path) => normalizedPath.includes(`/${path}`)) &&
        !hiveManagedFiles.has(normalizedPath.split("/").at(-1))
    );
};

export default {
    "*.{js,mjs,cjs,ts,tsx,jsx,json,md,css,scss,yaml,yml}": (files) => {
        const formatTargets = files.filter(shouldFormat);

        return formatTargets.length
            ? `prettier --write ${formatTargets.map((file) => JSON.stringify(file)).join(" ")}`
            : [];
    },
};
