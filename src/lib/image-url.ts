// Animated GIF는 Next Image optimizer가 처리하지 않으므로 원본 전달한다.
export function isGifUrl(value: string | null | undefined): boolean {
    if (!value) return false;
    try {
        return new URL(value, "https://local.invalid").pathname
            .toLowerCase()
            .endsWith(".gif");
    } catch {
        return (
            value.toLowerCase().split(/[?#]/, 1)[0]?.endsWith(".gif") ?? false
        );
    }
}
