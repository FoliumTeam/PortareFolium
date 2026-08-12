"use client";

import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import {
    ChevronLeft,
    ChevronRight,
    Play,
    Repeat,
    RotateCcw,
    X,
    ZoomIn,
    ZoomOut,
} from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

type LightboxImage = {
    alt: string;
    src: string;
    type: "image";
};

type LightboxYoutube = {
    thumbnailSrc: string;
    title: string;
    type: "youtube";
    videoId: string;
};

type LightboxMedia = LightboxImage | LightboxYoutube;

type ImageLightboxProps = {
    contentSelector: string;
};

const FILMSTRIP_RADIUS = 5;
const MAX_SCALE = 4;
const MIN_SCALE = 1;
const SCALE_STEP = 0.25;
const SWIPE_THRESHOLD = 50;

// filmstrip sidecar path 계산
function replaceWithSidecar(src: string, suffix: "thumb"): string {
    const url = new URL(src, window.location.origin);
    const pathname = url.pathname.replace(/\.[^./?#]+$/, `.${suffix}.webp`);
    url.pathname = pathname;
    return url.toString();
}

// YouTube thumbnail path 생성
function getYoutubeThumbnail(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

// 값 clamp
function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

// 이미지 overflow 계산
function getImageOverflow(
    frame: HTMLDivElement | null,
    image: HTMLImageElement | null,
    scale: number
) {
    if (!frame || !image) {
        return {
            overflowX: 0,
            overflowY: 0,
        };
    }

    const scaledWidth = image.clientWidth * scale;
    const scaledHeight = image.clientHeight * scale;

    return {
        overflowX: Math.max(0, (scaledWidth - frame.clientWidth) / 2),
        overflowY: Math.max(0, (scaledHeight - frame.clientHeight) / 2),
    };
}

type FilmstripThumbnailProps = {
    active: boolean;
    media: LightboxMedia;
    onSelect: () => void;
};

type LightboxTooltipButtonProps = {
    children: ReactNode;
    label: string;
    side?: "top" | "right" | "bottom" | "left";
};

// filmstrip candidate 목록 계산
function getImageFilmstripCandidates(src: string): string[] {
    return [replaceWithSidecar(src, "thumb"), src];
}

// filmstrip thumbnail 렌더
function FilmstripThumbnail({
    active,
    media,
    onSelect,
}: FilmstripThumbnailProps) {
    const candidates = useMemo(() => {
        if (media.type === "youtube") return [media.thumbnailSrc];
        return getImageFilmstripCandidates(media.src);
    }, [media]);
    const [candidateIndex, setCandidateIndex] = useState(0);
    const thumbSrc = candidates[candidateIndex] ?? "";

    useEffect(() => {
        setCandidateIndex(0);
    }, [candidates]);

    return (
        <button
            type="button"
            aria-label="filmstrip 이미지로 이동"
            aria-current={active ? "true" : undefined}
            onClick={(e) => {
                e.stopPropagation();
                onSelect();
            }}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                active
                    ? "scale-105 border-(--color-accent)"
                    : "border-white/20 opacity-60 hover:opacity-100"
            }`}
        >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={thumbSrc}
                alt=""
                loading="lazy"
                decoding="async"
                onError={() => {
                    const nextIndex = candidateIndex + 1;
                    if (nextIndex < candidates.length) {
                        setCandidateIndex(nextIndex);
                    }
                }}
                className="h-full w-full object-cover"
            />
            {media.type === "youtube" && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <Play className="h-5 w-5 fill-white text-white" />
                </span>
            )}
        </button>
    );
}

// lightbox action tooltip wrapper
function LightboxTooltipButton({
    children,
    label,
    side = "top",
}: LightboxTooltipButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent
                side={side}
                sideOffset={8}
                className="z-[130] bg-white text-black"
                arrowClassName="bg-white fill-white"
            >
                {label}
            </TooltipContent>
        </Tooltip>
    );
}

// 본문 media 스캔
function collectMedia(root: Element): LightboxMedia[] {
    const nodes = Array.from(
        root.querySelectorAll<HTMLElement>("img, .youtube-embed-wrapper")
    );
    const nextMedia: LightboxMedia[] = [];

    nodes.forEach((node) => {
        if (node.matches("img")) {
            const image = node as HTMLImageElement;
            if (!image.src) return;
            nextMedia.push({
                type: "image",
                src: image.src,
                alt: image.alt ?? "",
            });
            return;
        }

        if (node.matches(".youtube-embed-wrapper")) {
            const videoId = node.getAttribute("data-youtube-id")?.trim();
            if (!videoId) return;
            nextMedia.push({
                type: "youtube",
                videoId,
                title: "YouTube video",
                thumbnailSrc: getYoutubeThumbnail(videoId),
            });
        }
    });

    return nextMedia;
}

// 본문 이미지 lightbox
export default function ImageLightbox({ contentSelector }: ImageLightboxProps) {
    const [media, setMedia] = useState<LightboxMedia[]>([]);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [loopEnabled, setLoopEnabled] = useState(false);
    const [scale, setScale] = useState(1);
    const [translate, setTranslate] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [canPanImage, setCanPanImage] = useState(false);
    const mountedRef = useRef(false);
    const imageRef = useRef<HTMLImageElement>(null);
    const mediaFrameRef = useRef<HTMLDivElement>(null);
    const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
    const pinchRef = useRef<{ distance: number; startScale: number } | null>(
        null
    );
    const panRef = useRef<{
        startTranslateX: number;
        startTranslateY: number;
        x: number;
        y: number;
    } | null>(null);

    const current = openIndex == null ? null : (media[openIndex] ?? null);

    const clampTranslate = useCallback(
        (nextScale: number, nextTranslate: { x: number; y: number }) => {
            const { overflowX, overflowY } = getImageOverflow(
                mediaFrameRef.current,
                imageRef.current,
                nextScale
            );

            return {
                x: clamp(nextTranslate.x, -overflowX, overflowX),
                y: clamp(nextTranslate.y, -overflowY, overflowY),
            };
        },
        []
    );

    const resetImageTransform = useCallback(() => {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
        setIsDragging(false);
        setCanPanImage(false);
        swipeStartRef.current = null;
        pinchRef.current = null;
        panRef.current = null;
    }, []);

    const syncPanCapability = useCallback(() => {
        if (current?.type !== "image") {
            setCanPanImage(false);
            return;
        }

        const { overflowX, overflowY } = getImageOverflow(
            mediaFrameRef.current,
            imageRef.current,
            scale
        );
        const nextCanPan = overflowX > 0 || overflowY > 0;

        setCanPanImage(nextCanPan);
        if (!nextCanPan) {
            setTranslate({ x: 0, y: 0 });
            setIsDragging(false);
            panRef.current = null;
            return;
        }

        setTranslate((currentTranslate) =>
            clampTranslate(scale, currentTranslate)
        );
    }, [clampTranslate, current?.type, scale]);

    const applyScale = useCallback(
        (updater: number | ((currentScale: number) => number)) => {
            setScale((currentScale) => {
                const rawScale =
                    typeof updater === "function"
                        ? updater(currentScale)
                        : updater;
                const nextScale = clamp(rawScale, MIN_SCALE, MAX_SCALE);

                setTranslate((currentTranslate) =>
                    clampTranslate(nextScale, currentTranslate)
                );

                return nextScale;
            });
        },
        [clampTranslate]
    );

    // 본문 media 스캔 + click target index 부여
    const scanMedia = useCallback(() => {
        const root = document.querySelector(contentSelector);
        if (!root) return;

        const nextMedia = collectMedia(root);
        setMedia(nextMedia);

        let currentIndex = 0;
        root.querySelectorAll<HTMLElement>(
            "img, .youtube-embed-wrapper"
        ).forEach((node) => {
            if (node.matches("img")) {
                const image = node as HTMLImageElement;
                if (!image.src) return;
                image.style.cursor = "zoom-in";
                image.dataset.lightboxIdx = String(currentIndex);
                currentIndex += 1;
                return;
            }

            if (node.matches(".youtube-embed-wrapper")) {
                const videoId = node.getAttribute("data-youtube-id")?.trim();
                if (!videoId) return;
                node.setAttribute("data-lightbox-idx", String(currentIndex));
                const trigger = node.querySelector<HTMLElement>(
                    '[data-lightbox-open="youtube"]'
                );
                if (trigger) {
                    trigger.dataset.lightboxIdx = String(currentIndex);
                }
                currentIndex += 1;
            }
        });

        if (!mountedRef.current) {
            mountedRef.current = true;
            root.addEventListener("click", handleContentClick);
        }
    }, [contentSelector]);

    // click delegation
    const handleContentClick = useCallback((e: Event) => {
        const target = e.target as HTMLElement | null;
        if (!target) return;

        const imageTarget = target.closest<HTMLImageElement>(
            "img[data-lightbox-idx]"
        );
        const youtubeTrigger = target.closest<HTMLElement>(
            '[data-lightbox-open="youtube"][data-lightbox-idx]'
        );
        const source = imageTarget ?? youtubeTrigger;
        if (!source) return;

        const idxAttr = source.dataset.lightboxIdx;
        if (idxAttr == null) return;

        e.preventDefault();
        const idx = Number(idxAttr);
        if (!Number.isFinite(idx)) return;
        setOpenIndex(idx);
        setPlayingVideoId(null);
    }, []);

    useEffect(() => {
        scanMedia();
        const root = document.querySelector(contentSelector);
        if (!root) return;

        const observer = new MutationObserver(() => scanMedia());
        observer.observe(root, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ["src", "data-youtube-id"],
        });

        return () => {
            observer.disconnect();
            root.removeEventListener("click", handleContentClick);
            mountedRef.current = false;
        };
    }, [contentSelector, handleContentClick, scanMedia]);

    const close = useCallback(() => {
        setOpenIndex(null);
        setPlayingVideoId(null);
        resetImageTransform();
    }, [resetImageTransform]);

    const goPrev = useCallback(() => {
        setOpenIndex((index) => {
            if (index == null) return index;
            if (index <= 0) {
                return loopEnabled && media.length > 0
                    ? media.length - 1
                    : index;
            }
            return index - 1;
        });
        setPlayingVideoId(null);
        resetImageTransform();
    }, [loopEnabled, media.length, resetImageTransform]);

    const goNext = useCallback(() => {
        setOpenIndex((index) => {
            if (index == null) return index;
            if (index >= media.length - 1) {
                return loopEnabled && media.length > 0 ? 0 : index;
            }
            return index + 1;
        });
        setPlayingVideoId(null);
        resetImageTransform();
    }, [loopEnabled, media.length, resetImageTransform]);

    // keyboard + body scroll lock
    useEffect(() => {
        if (openIndex == null) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") close();
            else if (e.key === "ArrowLeft") goPrev();
            else if (e.key === "ArrowRight") goNext();
        };

        window.addEventListener("keydown", onKey);
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [close, goNext, goPrev, openIndex]);

    useEffect(() => {
        if (openIndex == null) return;
        setPlayingVideoId(null);
        resetImageTransform();
    }, [openIndex, resetImageTransform]);

    useEffect(() => {
        if (openIndex == null) return;

        syncPanCapability();

        const onResize = () => syncPanCapability();
        window.addEventListener("resize", onResize);

        return () => {
            window.removeEventListener("resize", onResize);
        };
    }, [openIndex, syncPanCapability]);

    useEffect(() => {
        if (!isDragging || !canPanImage) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!panRef.current) return;
            const nextTranslate = {
                x:
                    panRef.current.startTranslateX +
                    (e.clientX - panRef.current.x),
                y:
                    panRef.current.startTranslateY +
                    (e.clientY - panRef.current.y),
            };
            setTranslate(clampTranslate(scale, nextTranslate));
        };

        const stopDragging = () => {
            panRef.current = null;
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", stopDragging);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", stopDragging);
        };
    }, [canPanImage, clampTranslate, isDragging, scale]);

    if (openIndex == null || media.length === 0) return null;
    if (typeof document === "undefined") return null;
    if (!current) return null;

    const atFirst = openIndex <= 0;
    const atLast = openIndex >= media.length - 1;
    const canGoPrev = loopEnabled || !atFirst;
    const canGoNext = loopEnabled || !atLast;
    const total = media.length;

    let winStart = openIndex - FILMSTRIP_RADIUS;
    let winEnd = openIndex + FILMSTRIP_RADIUS + 1;
    if (winStart < 0) {
        winEnd += -winStart;
        winStart = 0;
    }
    if (winEnd > total) {
        winStart -= winEnd - total;
        winEnd = total;
    }
    winStart = Math.max(0, winStart);

    const filmstrip = media.slice(winStart, winEnd);
    const shouldShowFilmstrip = total > 1;
    const caption =
        current.type === "image" ? current.alt?.trim() || "" : current.title;
    const controlButtonClass =
        "flex h-11 w-11 items-center justify-center rounded-full bg-black/72 text-white transition-colors hover:bg-black/86";
    const pillButtonClass =
        "inline-flex h-11 items-center gap-2 rounded-full bg-black/72 px-4 text-sm font-semibold whitespace-nowrap text-white transition-colors hover:bg-black/86";
    const navButtonClass =
        "absolute top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-25";

    return createPortal(
        <TooltipProvider delayDuration={120}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label="이미지 확대 보기"
                className="fixed inset-0 z-[120] bg-black/88 backdrop-blur-sm"
                onClick={close}
            >
                <div
                    className="flex h-full w-full items-center justify-center"
                    onTouchStart={(e) => {
                        if (current.type !== "image") {
                            const touch = e.touches[0];
                            if (!touch) return;
                            swipeStartRef.current = {
                                x: touch.clientX,
                                y: touch.clientY,
                            };
                            return;
                        }

                        if (e.touches.length === 2) {
                            const [a, b] = [e.touches[0], e.touches[1]];
                            if (!a || !b) return;
                            pinchRef.current = {
                                distance: Math.hypot(
                                    a.clientX - b.clientX,
                                    a.clientY - b.clientY
                                ),
                                startScale: scale,
                            };
                            swipeStartRef.current = null;
                            panRef.current = null;
                            return;
                        }

                        const touch = e.touches[0];
                        if (!touch) return;

                        if (canPanImage) {
                            panRef.current = {
                                x: touch.clientX,
                                y: touch.clientY,
                                startTranslateX: translate.x,
                                startTranslateY: translate.y,
                            };
                            setIsDragging(true);
                            return;
                        }

                        swipeStartRef.current = {
                            x: touch.clientX,
                            y: touch.clientY,
                        };
                    }}
                    onTouchMove={(e) => {
                        if (current.type !== "image") return;

                        if (e.touches.length === 2 && pinchRef.current) {
                            const [a, b] = [e.touches[0], e.touches[1]];
                            if (!a || !b) return;
                            const distance = Math.hypot(
                                a.clientX - b.clientX,
                                a.clientY - b.clientY
                            );
                            const nextScale =
                                pinchRef.current.startScale *
                                (distance / pinchRef.current.distance);
                            applyScale(nextScale);
                            return;
                        }

                        if (
                            e.touches.length === 1 &&
                            panRef.current &&
                            canPanImage
                        ) {
                            const touch = e.touches[0];
                            if (!touch) return;
                            const nextTranslate = {
                                x:
                                    panRef.current.startTranslateX +
                                    (touch.clientX - panRef.current.x),
                                y:
                                    panRef.current.startTranslateY +
                                    (touch.clientY - panRef.current.y),
                            };
                            setTranslate(clampTranslate(scale, nextTranslate));
                        }
                    }}
                    onTouchEnd={(e) => {
                        if (
                            current.type === "image" &&
                            e.touches.length === 0
                        ) {
                            pinchRef.current = null;
                            panRef.current = null;
                            setIsDragging(false);
                        }

                        const touch = e.changedTouches[0];
                        const start = swipeStartRef.current;
                        swipeStartRef.current = null;
                        if (!touch || !start) return;

                        if (current.type === "image" && canPanImage) return;

                        const deltaX = touch.clientX - start.x;
                        const deltaY = touch.clientY - start.y;

                        if (
                            Math.abs(deltaX) < SWIPE_THRESHOLD ||
                            Math.abs(deltaX) <= Math.abs(deltaY)
                        ) {
                            return;
                        }

                        if (deltaX > 0) {
                            goPrev();
                            return;
                        }

                        goNext();
                    }}
                >
                    <div
                        ref={mediaFrameRef}
                        className="relative flex h-full w-full items-center justify-center overflow-hidden"
                    >
                        <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-start justify-between p-4 sm:p-6">
                            <div className="rounded-full bg-black/65 px-4 py-2 text-sm font-medium whitespace-nowrap text-white">
                                {openIndex + 1} / {total}
                            </div>

                            <div
                                data-lightbox-controls
                                className="pointer-events-auto flex items-center gap-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {current.type === "image" && (
                                    <>
                                        <LightboxTooltipButton label="축소">
                                            <button
                                                type="button"
                                                aria-label="축소"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyScale(
                                                        (currentScale) =>
                                                            currentScale -
                                                            SCALE_STEP
                                                    );
                                                }}
                                                className={controlButtonClass}
                                            >
                                                <ZoomOut className="h-4 w-4" />
                                            </button>
                                        </LightboxTooltipButton>
                                        <LightboxTooltipButton label="확대">
                                            <button
                                                type="button"
                                                aria-label="확대"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    applyScale(
                                                        (currentScale) =>
                                                            currentScale +
                                                            SCALE_STEP
                                                    );
                                                }}
                                                className={controlButtonClass}
                                            >
                                                <ZoomIn className="h-4 w-4" />
                                            </button>
                                        </LightboxTooltipButton>
                                        <LightboxTooltipButton label="확대 초기화">
                                            <button
                                                type="button"
                                                aria-label="확대 초기화"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    resetImageTransform();
                                                }}
                                                className={controlButtonClass}
                                            >
                                                <RotateCcw className="h-4 w-4" />
                                            </button>
                                        </LightboxTooltipButton>
                                    </>
                                )}

                                <button
                                    type="button"
                                    aria-label="loop 토글"
                                    aria-pressed={loopEnabled}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setLoopEnabled((value) => !value);
                                    }}
                                    className={`${pillButtonClass} ${
                                        loopEnabled ? "bg-(--color-accent)" : ""
                                    }`}
                                >
                                    <Repeat className="h-4 w-4" />
                                    <span>
                                        {loopEnabled ? "Loop On" : "Loop Off"}
                                    </span>
                                </button>

                                <LightboxTooltipButton label="닫기">
                                    <button
                                        type="button"
                                        aria-label="닫기"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            close();
                                        }}
                                        className={controlButtonClass}
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </LightboxTooltipButton>
                            </div>
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="이전 이미지"
                                    disabled={!canGoPrev}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goPrev();
                                    }}
                                    className={`${navButtonClass} left-4 sm:left-6`}
                                >
                                    <ChevronLeft className="h-7 w-7" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent
                                side="right"
                                sideOffset={8}
                                className="z-[130] bg-white text-black"
                                arrowClassName="bg-white fill-white"
                            >
                                이전 이미지
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button
                                    type="button"
                                    aria-label="다음 이미지"
                                    disabled={!canGoNext}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        goNext();
                                    }}
                                    className={`${navButtonClass} right-4 sm:right-6`}
                                >
                                    <ChevronRight className="h-7 w-7" />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent
                                side="left"
                                sideOffset={8}
                                className="z-[130] bg-white text-black"
                                arrowClassName="bg-white fill-white"
                            >
                                다음 이미지
                            </TooltipContent>
                        </Tooltip>

                        {current.type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                ref={imageRef}
                                key={current.src}
                                src={current.src}
                                alt={current.alt}
                                draggable={false}
                                onLoad={() => syncPanCapability()}
                                onClick={(e) => e.stopPropagation()}
                                onWheel={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    applyScale(
                                        (currentScale) =>
                                            currentScale +
                                            (e.deltaY < 0
                                                ? SCALE_STEP
                                                : -SCALE_STEP)
                                    );
                                }}
                                onMouseDown={(e) => {
                                    if (!canPanImage) return;
                                    e.stopPropagation();
                                    panRef.current = {
                                        x: e.clientX,
                                        y: e.clientY,
                                        startTranslateX: translate.x,
                                        startTranslateY: translate.y,
                                    };
                                    setIsDragging(true);
                                }}
                                className={`relative max-h-screen max-w-screen object-contain select-none ${
                                    canPanImage
                                        ? isDragging
                                            ? "cursor-grabbing"
                                            : "cursor-grab"
                                        : "cursor-default"
                                }`}
                                style={{
                                    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
                                    transformOrigin: "center center",
                                }}
                            />
                        ) : playingVideoId === current.videoId ? (
                            <div
                                className="relative h-full w-full overflow-hidden bg-black"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <iframe
                                    src={`https://www.youtube-nocookie.com/embed/${current.videoId}?autoplay=1&rel=0`}
                                    title={current.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="absolute inset-0 h-full w-full border-0"
                                />
                            </div>
                        ) : (
                            <LightboxTooltipButton label="영상 재생">
                                <button
                                    type="button"
                                    aria-label="영상 재생"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setPlayingVideoId(current.videoId);
                                    }}
                                    className="group relative overflow-hidden rounded-[1.5rem]"
                                >
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={current.thumbnailSrc}
                                        alt={current.title}
                                        className="max-h-screen max-w-screen object-contain"
                                    />
                                    <span className="absolute inset-0 bg-black/25 transition-colors group-hover:bg-black/35" />
                                    <span className="absolute inset-0 flex items-center justify-center">
                                        <span className="rounded-full bg-red-600 p-4 text-white shadow-2xl transition-transform group-hover:scale-105">
                                            <Play className="h-8 w-8 fill-white text-white" />
                                        </span>
                                    </span>
                                </button>
                            </LightboxTooltipButton>
                        )}

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 bg-linear-to-t from-black/88 via-black/45 to-transparent px-4 pt-24 pb-4 sm:px-6 sm:pb-6">
                            <div
                                data-lightbox-bottom-panel
                                className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col items-center gap-3"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {caption && (
                                    <div className="text-center text-sm text-white/82">
                                        {caption}
                                    </div>
                                )}

                                {shouldShowFilmstrip && (
                                    <div className="w-full max-w-full overflow-hidden px-2 py-2">
                                        <div
                                            data-lightbox-filmstrip
                                            className="flex max-w-full [scrollbar-width:none] justify-center gap-2 overflow-x-auto px-2 py-2 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {filmstrip.map((item, i) => {
                                                const realIdx = winStart + i;
                                                const active =
                                                    realIdx === openIndex;
                                                return (
                                                    <FilmstripThumbnail
                                                        key={realIdx}
                                                        media={item}
                                                        active={active}
                                                        onSelect={() => {
                                                            setOpenIndex(
                                                                realIdx
                                                            );
                                                            setPlayingVideoId(
                                                                null
                                                            );
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </TooltipProvider>,
        document.body
    );
}
