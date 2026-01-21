import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Account, Category } from "@/context/FinanceContext";
import { useEffect } from "react";
import { TagInput } from "@/components/common/TagInput";

const transactionSchema = z.object({
    amount: z.coerce.number().min(0.01, "Amount must be positive"),
    description: z.string().min(2, "Description is required"),
    accountId: z.coerce.number().min(1, "Account is required"),
    categoryId: z.coerce.number().min(1, "Category is required"),
    date: z.date(),
    type: z.enum(["income", "expense"]),
    tagIds: z.array(z.number()).optional(),
});

const bulkTransactionSchema = z.object({
    amount: z.coerce.number().optional(),
    description: z.string().optional(),
    accountId: z.coerce.number().optional(),
    categoryId: z.coerce.number().optional(),
    date: z.date().optional(),
    type: z.enum(["income", "expense"]).optional(),
    tagIds: z.array(z.number()).optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
export type BulkTransactionFormValues = z.infer<typeof bulkTransactionSchema>;

interface TransactionFormProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit: (data: TransactionFormValues | BulkTransactionFormValues, dirtyFields?: Partial<Record<keyof TransactionFormValues, boolean>>) => Promise<void>;
    initialData?: TransactionFormValues | null;
    accounts: Account[];
    categories: Category[];
    mode?: "create" | "edit" | "bulk-edit";
}

export function TransactionForm({
    isOpen,
    onOpenChange,
    onSubmit,
    initialData,
    accounts,
    categories,
    mode = "create"
}: TransactionFormProps) {
    const isBulkEdit = mode === "bulk-edit";
    const resolver = isBulkEdit ? zodResolver(bulkTransactionSchema) : zodResolver(transactionSchema);

    const form = useForm<TransactionFormValues>({
        resolver,
        defaultValues: {
            amount: 0,
            description: "",
            accountId: 0,
            categoryId: 0,
            date: new Date(),
            type: "expense",
            tagIds: [],
        },
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                form.reset(initialData);
            } else {
                form.reset({
                    amount: 0,
                    description: "",
                    accountId: 0,
                    categoryId: 0,
                    date: new Date(),
                    type: "expense",
                    tagIds: [],
                });
            }
        }
    }, [isOpen, initialData, form]);

    const handleSubmit = async (data: TransactionFormValues | BulkTransactionFormValues) => {
        await onSubmit(data, form.formState.dirtyFields);
    };

    const getTitle = () => {
        if (mode === "bulk-edit") return "Bulk Edit Transactions";
        if (mode === "edit") return "Edit Transaction";
        return "New Transaction";
    };

    const getButtonText = () => {
        if (mode === "bulk-edit") return "Update Transactions";
        if (mode === "edit") return "Save Changes";
        return "Add Transaction";
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{getTitle()}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isBulkEdit}>
                                            <FormControl>
                                                <SelectTrigger data-testid="select-type">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="expense">Expense</SelectItem>
                                                <SelectItem value="income">Income</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} data-testid="input-amount" disabled={isBulkEdit} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g. Weekly Groceries" {...field} data-testid="input-description" disabled={isBulkEdit} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="accountId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Account</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                                            <FormControl>
                                                <SelectTrigger data-testid="select-account">
                                                    <SelectValue placeholder="Select account" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-[200px]">
                                                {accounts.map(acc => (
                                                    <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="categoryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Category</FormLabel>
                                        <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                                            <FormControl>
                                                <SelectTrigger data-testid="select-category">
                                                    <SelectValue placeholder="Select category" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="max-h-[200px]">
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="date"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                    data-testid="button-date-picker"
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="tagIds"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tags</FormLabel>
                                    <FormControl>
                                        <TagInput
                                            selectedTagIds={field.value || []}
                                            onTagsChange={field.onChange}
                                            placeholder="Select tags..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit" data-testid="button-submit-transaction">{getButtonText()}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
