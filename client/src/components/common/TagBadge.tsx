import { Badge } from "@/components/ui/badge";
import { Tag } from "@/context/FinanceContext";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
    tag: Tag;
    onRemove?: () => void;
    className?: string;
    onClick?: () => void;
}

export function TagBadge({ tag, onRemove, className, onClick }: TagBadgeProps) {
    // Helper to convert hex to rgb string for CSS custom property
    const getRgbFromHex = (hex: string) => {
        const cleanHex = hex.replace('#', '');
        const r = parseInt(cleanHex.substring(0, 2), 16);
        const g = parseInt(cleanHex.substring(2, 4), 16);
        const b = parseInt(cleanHex.substring(4, 6), 16);
        return `${r}, ${g}, ${b}`;
    };

    const rgbColor = getRgbFromHex(tag.color);

    return (
        <Badge
            variant="outline"
            className={cn(
                "font-normal text-xs flex items-center gap-1 transition-colors",
                "bg-[rgba(var(--tag-rgb),var(--tag-bg-alpha,0.12))] border-[rgba(var(--tag-rgb),var(--tag-border-alpha,0.25))]",
                onClick && "cursor-pointer hover:bg-opacity-80 active:bg-opacity-100 group",
                className
            )}
            style={{
                "--tag-rgb": rgbColor,
                color: tag.color,
            } as React.CSSProperties}
            onClick={onClick}
        >
            {tag.name}
            {onRemove && (
                <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-black/10 cursor-pointer ml-1 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    aria-label={`Remove tag ${tag.name}`}
                >
                    <X size={10} />
                </button>
            )}
        </Badge>
    );
}
