import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/common/TagInput";
import { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError } from "@/lib/toastHelpers";
import { Tag } from "lucide-react";

interface BulkTagDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    selectedIds: number[];
}

export function BulkTagDialog({ isOpen, onOpenChange, selectedIds }: BulkTagDialogProps) {
    const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
    const { batchAssignTags, batchRemoveTags } = useFinance();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleAssign = async () => {
        if (selectedTagIds.length === 0) return;
        setIsLoading(true);
        try {
            await batchAssignTags(selectedIds, selectedTagIds);
            showSuccess(toast, "Tags added", `Added ${selectedTagIds.length} tags to ${selectedIds.length} transactions.`);
            onOpenChange(false);
            setSelectedTagIds([]);
        } catch (error) {
            showError(toast, "Error", "Failed to add tags.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async () => {
        if (selectedTagIds.length === 0) return;
        setIsLoading(true);
        try {
            await batchRemoveTags(selectedIds, selectedTagIds);
            showSuccess(toast, "Tags removed", `Removed ${selectedTagIds.length} tags from ${selectedIds.length} transactions.`);
            onOpenChange(false);
            setSelectedTagIds([]);
        } catch (error) {
            showError(toast, "Error", "Failed to remove tags.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            setSelectedTagIds([]);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5" />
                        Manage Tags for {selectedIds.length} items
                    </DialogTitle>
                    <DialogDescription>
                        Select tags to add or remove from the selected transactions.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="tags">Tags</Label>
                        <TagInput
                            selectedTagIds={selectedTagIds}
                            onTagsChange={setSelectedTagIds}
                            placeholder="Select tags..."
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        onClick={handleRemove}
                        disabled={selectedTagIds.length === 0 || isLoading}
                        className="w-full sm:w-auto text-destructive border-destructive hover:bg-destructive/10"
                    >
                        Remove Tags
                    </Button>
                    <Button
                        onClick={handleAssign}
                        disabled={selectedTagIds.length === 0 || isLoading}
                        className="w-full sm:w-auto"
                    >
                        Add Tags
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
