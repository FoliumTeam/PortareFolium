"use client";

import { useEffect, useRef, useState } from "react";
import { getAdminProfileImage } from "@/app/admin/actions/public-data";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

// 프로필 이미지 placeholder
const PLACEHOLDER_IMG = "/avatar-placeholder.svg";

export default function UserMenu() {
    const [profileImg, setProfileImg] = useState<string>(PLACEHOLDER_IMG);
    const [open, setOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const { data: session, status } = useSession();
    const isAuthed = status === "authenticated" && session?.user?.isAdmin;

    // 인증 상태 + 프로필 이미지 로드
    useEffect(() => {
        setMounted(true);
        if (!isAuthed) return;
        void loadProfileImage();
    }, [isAuthed]);

    // resume_data에서 프로필 이미지 fetch (sessionStorage cache)
    const loadProfileImage = async () => {
        const cached = sessionStorage.getItem("profile_image_url");
        if (cached) {
            setProfileImg(cached);
            return;
        }
        const image = await getAdminProfileImage();
        if (image) {
            setProfileImg(image);
            sessionStorage.setItem("profile_image_url", image);
        }
    };

    // 외부 클릭 시 닫기
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        if (open) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    if (!mounted) {
        return (
            <div className="h-8 w-8 animate-pulse rounded-full bg-(--color-muted)/20" />
        );
    }

    // 미인증: 버튼 숨김
    if (!isAuthed) {
        return null;
    }

    // 인증됨: 프로필 이미지 + 드롭다운
    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-(--color-border) transition-colors hover:border-(--color-accent)"
            >
                <img
                    src={profileImg}
                    alt="프로필"
                    className="h-full w-full object-cover"
                    onError={() => {
                        sessionStorage.removeItem("profile_image_url");
                        setProfileImg(PLACEHOLDER_IMG);
                    }}
                />
            </button>

            {open && (
                <div className="absolute top-full right-0 z-50 mt-1 min-w-[140px]">
                    <div className="rounded-lg border border-(--color-border) bg-(--color-surface) py-1 shadow-lg">
                        <Link
                            href="/admin"
                            onClick={() => setOpen(false)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-(--color-foreground) transition-colors hover:bg-(--color-surface-subtle)"
                        >
                            <Settings className="h-4 w-4" />
                            Admin
                        </Link>
                        <button
                            type="button"
                            onClick={async () => {
                                setOpen(false);
                                await signOut({ callbackUrl: "/" });
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-500 transition-colors hover:bg-(--color-surface-subtle)"
                        >
                            <LogOut className="h-4 w-4" />
                            로그아웃
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
