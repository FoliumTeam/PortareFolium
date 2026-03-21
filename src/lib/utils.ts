import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// 클래스명 병합 유틸
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}
