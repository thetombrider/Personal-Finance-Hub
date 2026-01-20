import { useState } from "react";
import { useFinance, Tag } from "@/context/FinanceContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { TagBadge } from "./TagBadge";

interface TagInputProps {
    selectedTagIds: number[];
    onTagsChange: (tagIds: number[]) => void;
    className?: string;
    placeholder?: string;
}

export function TagInput({ selectedTagIds, onTagsChange, className, placeholder = "Select tags..." }: TagInputProps) {
    const { tags, addTag } = useFinance();
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

    const handleSelect = (tagId: number) => {
        if (selectedTagIds.includes(tagId)) {
            onTagsChange(selectedTagIds.filter(id => id !== tagId));
        } else {
            onTagsChange([...selectedTagIds, tagId]);
        }
    };

    const handleCreateTag = async () => {
        if (!search.trim()) return;
        try {
            // Default color or random? Let's pick a random one from a set or default
            const colors = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e", "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];

            const newTag = await addTag({ name: search.trim(), color: randomColor });
            onTagsChange([...selectedTagIds, newTag.id]);
            setSearch("");
        } catch (error) {
            console.error("Failed to create tag:", error);
        }
    };

    // Check if the search term matches any existing tag exactly (case insensitive)
    const exactMatch = tags.some(tag => tag.name.toLowerCase() === search.trim().toLowerCase());

    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-[2.5rem] py-2 px-3 hover:bg-transparent"
                    >
                        <div className="flex flex-wrap gap-1 items-center w-full">
                            {selectedTags.length === 0 && <span className="text-muted-foreground font-normal">{placeholder}</span>}
                            {selectedTags.map(tag => (
                                <TagBadge
                                    key={tag.id}
                                    tag={tag}
                                    onRemove={() => handleSelect(tag.id)}
                                />
                            ))}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Search tags..."
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            <CommandEmpty className="py-2 px-4 text-sm">
                                {search && !exactMatch ? (
                                    <div className="flex flex-col gap-1">
                                        <p className="text-muted-foreground">No tags found.</p>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-auto py-1 px-2 text-xs justify-start font-normal text-primary"
                                            onClick={handleCreateTag}
                                        >
                                            <Plus className="mr-1 h-3 w-3" />
                                            Create "{search}"
                                        </Button>
                                    </div>
                                ) : (
                                    "No tags found."
                                )}
                            </CommandEmpty>
                            <CommandGroup>
                                {tags.map(tag => (
                                    <CommandItem
                                        key={tag.id}
                                        value={tag.name}
                                        onSelect={() => handleSelect(tag.id)}
                                    >
                                        <div
                                            className="w-3 h-3 rounded-full mr-2"
                                            style={{ backgroundColor: tag.color }}
                                        />
                                        <span>{tag.name}</span>
                                        <Check
                                            className={cn(
                                                "ml-auto h-4 w-4",
                                                selectedTagIds.includes(tag.id) ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}
