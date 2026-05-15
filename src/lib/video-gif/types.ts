export type CropRect = {
    x: number;
    y: number;
    width: number;
    height: number;
};

export type VideoMetadata = {
    width: number;
    height: number;
    duration: number;
};

export type VideoGifDefaults = {
    fps: number;
    playbackSpeed: number;
    compressionRate: number;
    outputScale: number;
    outputWidth: number;
    outputHeight: number;
    preserveAspectRatio: boolean;
    sampleEstimate: boolean;
};

export type VideoGifSettings = VideoGifDefaults & {
    trimStart: number;
    trimEnd: number;
    crop: CropRect;
};

export type GifEstimate = {
    bytes: number;
    frameCount: number;
    megapixels: number;
};

export type GifConversionProgress = {
    currentFrame?: number;
    totalFrames?: number;
    percent: number;
    stage?: string;
};

export type GifConversionResult = {
    blob: Blob;
    bytes: number;
    objectUrl: string;
};
