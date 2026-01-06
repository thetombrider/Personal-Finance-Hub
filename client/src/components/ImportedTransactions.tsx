import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useFinance } from "@/context/FinanceContext";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Check, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportedTransactionsProps {
    accountId: number;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

interface StagedTransaction {
    id: number;
    date: string;
    amount: string;
    description: string;
    accountId: number;
    gocardlessTransactionId: string;
}

export function ImportedTransactions({ accountId, isOpen, onOpenChange }: ImportedTransactionsProps) {
    const { categories, formatCurrency } = useFinance();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    // Fetch staged transactions
    const { data: transactions = [], isLoading } = useQuery<StagedTransaction[]>({
        queryKey: ["/api/transactions/staging", accountId],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/transactions/staging?accountId=${accountId}`);
            return res.json();
        },
        enabled: isOpen,
    });

    const approveMutation = useMutation({
        mutationFn: async (data: { id: number; categoryId: number; description: string }) => {
            await apiRequest("POST", `/api/transactions/staging/${data.id}/approve`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging", accountId] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }); // Refresh main list
            toast({ title: "Transaction Approved" });
        },
        onError: () => {
            toast({ title: "Failed to approve transaction", variant: "destructive" });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/transactions/staging/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging", accountId] });
            toast({ title: "Transaction Dismissed" });
        },
    });

    // Local state for edits
    const [edits, setEdits] = useState<Record<number, { categoryId?: number; description?: string }>>({});

    const handleEdit = (id: number, field: "categoryId" | "description", value: any) => {
        setEdits(prev => ({
            ...prev,
            [id]: { ...prev[id], [field]: value }
        }));
    };

    const handleApprove = (tx: StagedTransaction) => {
        const edit = edits[tx.id] || {};
        let categoryId = edit.categoryId;

        if (!categoryId) {
            toast({ title: "Please select a category", variant: "destructive" });
            return;
        }

        approveMutation.mutate({
            id: tx.id,
            categoryId,
            description: edit.description || tx.description,
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Review Imported Transactions</DialogTitle>
                    <DialogDescription>
                        Review and categorize transactions fetched from your bank before adding them to your records.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto min-h-[300px]">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">
                            No new transactions to review.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">Date</TableHead>
                                    <TableHead className="w-[300px]">Description</TableHead>
                                    <TableHead className="w-[100px] text-right">Amount</TableHead>
                                    <TableHead className="w-[200px]">Category</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map(tx => {
                                    const amount = parseFloat(tx.amount);
                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(new Date(tx.date), "dd/MM/yyyy")}</TableCell>
                                            <TableCell>
                                                <Input
                                                    value={edits[tx.id]?.description ?? tx.description}
                                                    onChange={(e) => handleEdit(tx.id, "description", e.target.value)}
                                                    className="h-8"
                                                />
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                {formatCurrency(parseFloat(tx.amount))}
                                            </TableCell>
                                            <TableCell>
                                                <Select
                                                    value={edits[tx.id]?.categoryId?.toString() || ""}
                                                    onValueChange={(val) => handleEdit(tx.id, "categoryId", parseInt(val))}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue placeholder="Select Category" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {categories.map(c => (
                                                            <SelectItem key={c.id} value={c.id.toString()}>
                                                                {c.name}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleApprove(tx)}
                                                        disabled={approveMutation.isPending}
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => deleteMutation.mutate(tx.id)}
                                                        disabled={deleteMutation.isPending}
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
