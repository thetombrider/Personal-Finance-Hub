import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useFinance } from "@/context/FinanceContext";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { Check, X, Loader2, RefreshCw, Pencil, Undo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ImportedTransactionsProps {
    accountId?: number | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

interface StagedTransaction {
    id: number;
    date: string;
    amount: string;
    description: string;
    accountId: number;
    externalId: string;
    suggestedCategoryId?: number;
    status: 'pending' | 'dismissed' | 'reconciled';
}

export function ImportedTransactions({ accountId, isOpen, onOpenChange }: ImportedTransactionsProps) {
    const { categories, accounts, formatCurrency } = useFinance();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [statusFilter, setStatusFilter] = useState<string>("pending");
    const titleAccountName = accountId ? accounts.find(a => a.id === accountId)?.name : null;

    // Fetch staged transactions
    const { data: transactions = [], isLoading } = useQuery<StagedTransaction[]>({
        queryKey: ["/api/transactions/staging", accountId, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (accountId) params.append("accountId", accountId.toString());
            // If we want "all" in UI, we can pass 'all', or specific status
            // The requirement says "show all transactions... with new column for status".
            // But usually for workflow it's easier to filter.
            // Let's support Tabs for status.
            params.append("status", statusFilter);

            const res = await apiRequest("GET", `/api/transactions/staging?${params.toString()}`);
            return res.json();
        },
        enabled: isOpen,
    });

    const approveMutation = useMutation({
        mutationFn: async (data: { id: number; categoryId: number; description: string }) => {
            await apiRequest("POST", `/api/transactions/staging/${data.id}/approve`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }); // Refresh main list
            toast({ title: "Transaction Approved" });
        },
        onError: () => {
            toast({ title: "Failed to approve transaction", variant: "destructive" });
        },
    });

    const dismissMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/transactions/staging/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
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
        let categoryId = edit.categoryId || tx.suggestedCategoryId;

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

    const handleDismiss = (tx: StagedTransaction) => {
        if (confirm("Dismiss this transaction? It will be hidden from the pending list.")) {
            dismissMutation.mutate(tx.id);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Review Imported Transactions{titleAccountName ? ` - ${titleAccountName}` : ""}</DialogTitle>
                    <DialogDescription>
                        Review and categorize transactions fetched from your bank.
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={statusFilter} onValueChange={setStatusFilter} className="w-full">
                    <TabsList>
                        <TabsTrigger value="pending">Pending</TabsTrigger>
                        <TabsTrigger value="dismissed">Dismissed</TabsTrigger>
                        <TabsTrigger value="reconciled">Reconciled</TabsTrigger>
                        <TabsTrigger value="all">All</TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex-1 overflow-auto min-h-[300px] mt-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">
                            No transactions found for this filter.
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[100px]">Date</TableHead>
                                    {!accountId && <TableHead className="w-[150px]">Account</TableHead>}
                                    <TableHead className="w-[250px]">Description</TableHead>
                                    <TableHead className="w-[100px] text-right">Amount</TableHead>
                                    <TableHead className="w-[200px]">Category</TableHead>
                                    <TableHead className="w-[100px]">Status</TableHead>
                                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map(tx => {
                                    const amount = parseFloat(tx.amount);
                                    const suggestedId = tx.suggestedCategoryId;
                                    const selectedId = edits[tx.id]?.categoryId || suggestedId;
                                    const accountName = accounts.find(a => a.id === tx.accountId)?.name || "Unknown";
                                    const isEditable = tx.status === 'pending';

                                    return (
                                        <TableRow key={tx.id} className={tx.status === 'dismissed' ? 'opacity-60' : ''}>
                                            <TableCell>{format(new Date(tx.date), "dd/MM/yyyy")}</TableCell>
                                            {!accountId && (
                                                <TableCell className="text-muted-foreground text-xs">{accountName}</TableCell>
                                            )}
                                            <TableCell>
                                                {isEditable ? (
                                                    <Input
                                                        value={edits[tx.id]?.description ?? tx.description}
                                                        onChange={(e) => handleEdit(tx.id, "description", e.target.value)}
                                                        className="h-8"
                                                    />
                                                ) : (
                                                    <span className="text-sm">{tx.description}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className={`text-right font-medium ${amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                {formatCurrency(parseFloat(tx.amount))}
                                            </TableCell>
                                            <TableCell>
                                                {isEditable ? (
                                                    <div className="flex items-center gap-2">
                                                        <Select
                                                            value={selectedId?.toString() || ""}
                                                            onValueChange={(val) => handleEdit(tx.id, "categoryId", parseInt(val))}
                                                        >
                                                            <SelectTrigger className="h-8 w-full">
                                                                <SelectValue placeholder="Select Category" />
                                                            </SelectTrigger>
                                                            <SelectContent className="max-h-[200px]">
                                                                {categories.map(c => (
                                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                                        {c.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        {suggestedId && !edits[tx.id]?.categoryId && (
                                                            <div className="text-xs text-blue-500 font-bold" title="AI Suggestion">AI</div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-sm">
                                                        {categories.find(c => c.id === (tx.suggestedCategoryId ?? 0))?.name || '-'}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    tx.status === 'reconciled' ? 'default' :
                                                        tx.status === 'dismissed' ? 'destructive' : 'secondary'
                                                }>
                                                    {tx.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {tx.status === 'pending' && (
                                                        <>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                onClick={() => handleApprove(tx)}
                                                                disabled={approveMutation.isPending}
                                                                title="Approve"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => handleDismiss(tx)}
                                                                disabled={dismissMutation.isPending}
                                                                title="Dismiss"
                                                            >
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    )}
                                                    {tx.status === 'dismissed' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-8"
                                                            disabled // Making dismissed items read-only for now as per "edit for dismissed... depending on status"
                                                        // Logic for "undismissing" or "re-evaluating" would need backend support to set status back to pending.
                                                        // For now, let's keep it simple.
                                                        >
                                                            <Undo className="h-4 w-4 mr-1" /> Restore
                                                        </Button>
                                                    )}
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
