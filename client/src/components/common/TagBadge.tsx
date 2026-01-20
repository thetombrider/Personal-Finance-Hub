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
    return (
        <Badge
            variant="outline"
            className={cn(
                "font-normal text-xs flex items-center gap-1 transition-colors",
                onClick && "cursor-pointer hover:bg-opacity-80 active:bg-opacity-100",
                className
            )}
            style={{
                backgroundColor: `${tag.color}20`, // 12% opacity (approx 20 hex)
                color: tag.color,
                borderColor: `${tag.color}40`, // 25% opacity
            }}
            onClick={onClick}
        >
            {tag.name}
            {onRemove && (
                <span
                    role="button"
                    className="rounded-full p-0.5 hover:bg-black/10 cursor-pointer ml-1"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                >
                    <X size={10} />
                </span>
            )}
        </Badge>
    );
}
