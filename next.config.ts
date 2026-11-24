import type { NextConfig } from "next";

const r2Hostname = process.env.R2_PUBLIC_URL
    ? new URL(process.env.R2_PUBLIC_URL).hostname
    : null;

const nextConfig: NextConfig = {
    reactStrictMode: true,
    reactCompiler: true,
    allowedDevOrigins: ["127.0.0.1"],
    // 이력서 PDF: pdf.js는 번들 제외, Chromium 압축 파일·PDF 글꼴·pdf.js worker를 함수에 포함
    serverExternalPackages: ["pdfjs-dist"],
    outputFileTracingIncludes: {
        "/api/resume-pdf": [
            "./node_modules/@sparticuz/chromium/bin/**/*",
            "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
            "./src/assets/resume-pdf-fonts/**/*",
        ],
    },
    experimental: {
        serverActions: {
            bodySizeLimit: "4mb",
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "flagcdn.com",
                port: "",
                pathname: "/w80/*.png",
                search: "",
            },
            {
                protocol: "https",
                hostname: "github.com",
                port: "",
                pathname: "/user-attachments/assets/*",
                search: "",
            },
            { protocol: "https", hostname: "img.youtube.com" },
            { protocol: "https", hostname: "i.ytimg.com" },
            ...(r2Hostname
                ? [{ protocol: "https" as const, hostname: r2Hostname }]
                : []),
        ],
    },
};

export default nextConfig;
