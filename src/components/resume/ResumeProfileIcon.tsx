import { Figma, Github, Gitlab, Link, Linkedin, Package } from "lucide-react";
import type { ResumeProfilePreset } from "@/types/resume";

type ResumeProfileIconProps = {
    preset: ResumeProfilePreset;
    className?: string;
};

export const ResumeProfileIcon = ({
    preset,
    className = "h-4 w-4",
}: ResumeProfileIconProps) => {
    if (preset === "github") return <Github className={className} />;
    if (preset === "gitlab") return <Gitlab className={className} />;
    if (preset === "linkedin") return <Linkedin className={className} />;
    if (preset === "figma") return <Figma className={className} />;
    if (preset === "npm") return <Package className={className} />;
    return <Link className={className} />;
};
