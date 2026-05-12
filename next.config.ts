import type { NextConfig } from "next";

const r2Hostname = process.env.R2_PUBLIC_URL
    ? new URL(process.env.R2_PUBLIC_URL).hostname
    : null;

const nextConfig: NextConfig = {
    reactStrictMode: true,
    reactCompiler: true,
    experimental: {
        serverActions: {
            bodySizeLimit: "4mb",
        },
    },
    images: {
        remotePatterns: [
            { protocol: "https", hostname: "img.youtube.com" },
            { protocol: "https", hostname: "i.ytimg.com" },
            ...(r2Hostname
                ? [{ protocol: "https" as const, hostname: r2Hostname }]
                : []),
        ],
    },
};

export default nextConfig;
