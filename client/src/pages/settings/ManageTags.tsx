import { useState } from "react";
import { useFinance, Tag } from "@/context/FinanceContext";
import { useToast } from "@/hooks/use-toast";
import { toastPatterns, showError } from "@/lib/toastHelpers";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, Edit2, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { TagBadge } from "@/components/common/TagBadge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const tagSchema = z.object({
    name: z.string().min(2, "Name is required"),
    color: z.string().default("#3b82f6"),
});

type TagFormValues = z.infer<typeof tagSchema>;

export default function ManageTags() {
    const { tags, addTag, updateTag, deleteTag, isLoading } = useFinance();
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [tagToDelete, setTagToDelete] = useState<number | null>(null);

    // Inline editing state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<TagFormValues>({
        name: "",
        color: "#3b82f6",
    });

    const form = useForm<TagFormValues>({
        resolver: zodResolver(tagSchema),
        defaultValues: {
            name: "",
            color: "#3b82f6",
        },
    });

    const onSubmit = async (data: TagFormValues) => {
        try {
            await addTag(data);
            setIsDialogOpen(false);
            form.reset();
            toastPatterns.created(toast, "Tag", "The tag has been successfully created.");
        } catch (error) {
            console.error(error);
            toastPatterns.failed(toast, "create tag", error);
        }
    };

    const startEditing = (tag: Tag) => {
        setEditingId(tag.id);
        setEditForm({
            name: tag.name,
            color: tag.color,
        });
    };

    const cancelEditing = () => {
        setEditingId(null);
    };

    const saveEditing = async (id: number) => {
        try {
            // Basic validation
            if (!editForm.name || editForm.name.length < 2) {
                showError(toast, "Validation Error", "Tag name must be at least 2 characters.");
                return;
            }
            await updateTag(id, editForm);
            setEditingId(null);
            toastPatterns.updated(toast, "Tag", "The tag has been successfully updated.");
        } catch (error) {
            console.error("Failed to update tag", error);
            toastPatterns.failed(toast, "update tag", error);
        }
    };

    const handleDelete = async () => {
        if (tagToDelete !== null) {
            await deleteTag(tagToDelete);
            setTagToDelete(null);
        }
    };

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </Layout>
        );
    }

    const sortedTags = [...tags].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-foreground">Tag Management</h1>
                        <p className="text-muted-foreground">Create and manage tags to organize your transactions</p>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                        setIsDialogOpen(open);
                        if (!open) {
                            form.reset({ name: "", color: "#3b82f6" });
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2" data-testid="button-add-tag">
                                <Plus size={16} /> Add Tag
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>New Tag</DialogTitle>
                            </DialogHeader>
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Vacation" {...field} data-testid="input-name" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="color"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Color</FormLabel>
                                                <div className="flex items-center gap-2">
                                                    <FormControl>
                                                        <Input type="color" className="w-12 h-9 p-1" {...field} data-testid="input-color" />
                                                    </FormControl>
                                                    <div className="text-sm text-muted-foreground">{field.value}</div>
                                                </div>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <DialogFooter>
                                        <Button type="submit" data-testid="button-submit-tag">Create Tag</Button>
                                    </DialogFooter>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="rounded-md border w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Color</TableHead>
                                <TableHead className="w-[100px] text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTags.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                                        No tags found. Create one to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedTags.map((tag) => {
                                    const isEditing = editingId === tag.id;

                                    return (
                                        <TableRow key={tag.id} data-testid={`row-tag-${tag.id}`}>
                                            <TableCell>
                                                {isEditing ? (
                                                    <Input
                                                        value={editForm.name}
                                                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                        className="h-8 max-w-[200px]"
                                                        autoFocus
                                                    />
                                                ) : ( // Use TagBadge for consistent display
                                                    <div onClick={() => startEditing(tag)} className="cursor-pointer inline-block">
                                                        <TagBadge tag={tag} />
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2">
                                                        <Input
                                                            type="color"
                                                            value={editForm.color}
                                                            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                                                            className="w-12 h-8 p-1"
                                                        />
                                                        <span className="text-xs text-muted-foreground">{editForm.color}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                                        <div
                                                            className="w-4 h-4 rounded-full border border-gray-200"
                                                            style={{ backgroundColor: tag.color }}
                                                        />
                                                        <span className="font-mono text-xs">{tag.color}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {isEditing ? (
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => saveEditing(tag.id)}>
                                                            <Check size={16} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={cancelEditing}>
                                                            <X size={16} />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startEditing(tag)} data-testid={`button-edit-${tag.id}`}>
                                                            <Edit2 size={14} />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setTagToDelete(tag.id)} data-testid={`button-delete-${tag.id}`}>
                                                            <Trash2 size={14} />
                                                        </Button>
                                                    </div>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <ConfirmDialog
                open={tagToDelete !== null}
                onOpenChange={(open) => !open && setTagToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Tag"
                description="Are you sure you want to delete this tag? It will be removed from all associated transactions."
                confirmText="Delete"
                variant="destructive"
            />
        </Layout>
    );
}
