import { slugify } from "transliteration";

export function toSlug(title: string): string {
    const result = slugify(title, { lowercase: true, separator: "-" })
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80);
    if (result) return result;
    return `post-${Date.now().toString(36)}`;
}
