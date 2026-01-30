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
import { Check, X, Loader2, RefreshCw, Pencil, Undo, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showError } from "@/lib/toastHelpers";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ManualReconciliationModal } from "./transactions/ManualReconciliationModal";
import { Checkbox } from "@/components/ui/checkbox";
import { useStagingMutations } from "@/hooks/mutations";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";


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
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [reconcileTx, setReconcileTx] = useState<StagedTransaction | null>(null);
    const [txToDismiss, setTxToDismiss] = useState<StagedTransaction | null>(null);
    const [showBulkApproveDialog, setShowBulkApproveDialog] = useState(false);
    const [showBulkDismissDialog, setShowBulkDismissDialog] = useState(false);
    const [bulkApproveUpdates, setBulkApproveUpdates] = useState<any[]>([]);
    const titleAccountName = accountId ? accounts.find(a => a.id === accountId)?.name : null;

    // Reset selection when filter changes
    useMemo(() => {
        setSelectedIds(new Set());
    }, [statusFilter, accountId, isOpen]);

    // Fetch staged transactions
    const { data: transactions = [], isLoading } = useQuery<StagedTransaction[]>({
        queryKey: ["/api/transactions/staging", accountId, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (accountId) params.append("accountId", accountId.toString());
            params.append("status", statusFilter);

            const res = await apiRequest("GET", `/api/transactions/staging?${params.toString()}`);
            return res.json();
        },
        enabled: isOpen,
    });

    const {
        approveTransaction,
        bulkApprove,
        dismissTransaction,
        bulkDismiss,
        restoreTransaction,
        isApproving,
        isDismissing,
        isRestoring
    } = useStagingMutations();


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
            showError(toast, "Please select a category");
            return;
        }

        approveTransaction.mutate({
            categoryId,
            description: edit.description || tx.description,
            stagingId: tx.id // Ensure consistency if payload requires it
        });

    };

    const handleDismiss = (tx: StagedTransaction) => {
        setTxToDismiss(tx);
    }

    const confirmDismiss = () => {
        if (txToDismiss) {
            dismissTransaction.mutate(txToDismiss.id);
            setTxToDismiss(null);
        }
    };

    const toggleSelectAll = (checked: boolean | 'indeterminate') => {
        if (checked === true) {
            setSelectedIds(new Set(transactions.map(t => t.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleBulkApprove = () => {
        const updates = [];
        for (const id of Array.from(selectedIds)) {
            const tx = transactions.find(t => t.id === id);
            if (!tx) continue;

            const edit = edits[id] || {};
            const categoryId = edit.categoryId || tx.suggestedCategoryId;

            if (!categoryId) {
                showError(toast, `Cannot approve transaction "${tx.description}"`, "Please select a category first.");
                return;
            }

            updates.push({
                stagingId: id,
                categoryId,
                description: edit.description
            });

        }

        if (updates.length > 0) {
            setBulkApproveUpdates(updates);
            setShowBulkApproveDialog(true);
        }
    };

    const confirmBulkApprove = () => {
        if (bulkApproveUpdates.length > 0) {
            bulkApprove.mutate(bulkApproveUpdates);
            setBulkApproveUpdates([]);
            setShowBulkApproveDialog(false);
        }
    };

    const handleBulkDismiss = () => {
        if (selectedIds.size > 0) {
            setShowBulkDismissDialog(true);
        }
    };

    const confirmBulkDismiss = () => {
        bulkDismiss.mutate(Array.from(selectedIds));
        setShowBulkDismissDialog(false);
    };

    const isPendingTab = statusFilter === 'pending';
    const areAllSelected = transactions.length > 0 && selectedIds.size === transactions.length;

    return (
        <>
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

                    {/* Bulk Actions Indicator */}
                    {selectedIds.size > 0 && isPendingTab && (
                        <div className="flex items-center justify-between bg-primary/10 p-2 px-4 rounded-md border border-primary/20 text-sm">
                            <span className="font-medium text-primary">{selectedIds.size} selected</span>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleBulkApprove} disabled={bulkApprove.isPending}>
                                    <Check className="mr-1 h-4 w-4" /> Approve Selected
                                </Button>
                                <Button size="sm" variant="destructive" onClick={handleBulkDismiss} disabled={bulkDismiss.isPending}>
                                    <X className="mr-1 h-4 w-4" /> Dismiss Selected
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-auto min-h-[300px] mt-2">
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
                                        {isPendingTab && (
                                            <TableHead className="w-[40px]">
                                                <Checkbox
                                                    checked={areAllSelected}
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                        )}
                                        <TableHead className="w-[100px]">Date</TableHead>
                                        {!accountId && <TableHead className="w-[150px]">Account</TableHead>}
                                        <TableHead className="w-[250px]">Description</TableHead>
                                        <TableHead className="w-[100px] text-right">Amount</TableHead>
                                        <TableHead className="w-[200px]">Category</TableHead>
                                        <TableHead className="w-[100px]">Status</TableHead>
                                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map(tx => {
                                        const amount = parseFloat(tx.amount);
                                        const suggestedId = tx.suggestedCategoryId;
                                        const selectedId = edits[tx.id]?.categoryId || suggestedId;
                                        const accountName = accounts.find(a => a.id === tx.accountId)?.name || "Unknown";
                                        const isEditable = tx.status === 'pending';
                                        const isSelected = selectedIds.has(tx.id);

                                        return (
                                            <TableRow key={tx.id} className={tx.status === 'dismissed' ? 'opacity-60' : ''} data-state={isSelected ? "selected" : undefined}>
                                                {isPendingTab && (
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={isSelected}
                                                            onCheckedChange={() => toggleSelect(tx.id)}
                                                        />
                                                    </TableCell>
                                                )}
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
                                                    <div className="flex justify-end gap-1">
                                                        {tx.status === 'pending' && (
                                                            <>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                                    onClick={() => handleApprove(tx)}
                                                                    disabled={isApproving}
                                                                    title="Approve"
                                                                >
                                                                    <Check className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                                    onClick={() => setReconcileTx(tx)}
                                                                    title="Manual Link"
                                                                >
                                                                    <Link className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    onClick={() => handleDismiss(tx)}
                                                                    disabled={isDismissing}
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
                                                                onClick={() => restoreTransaction.mutate(tx.id)}
                                                                disabled={isRestoring}
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

            <ManualReconciliationModal
                isOpen={!!reconcileTx}
                onClose={() => setReconcileTx(null)}
                stagedTransaction={reconcileTx}
            />

            <ConfirmDialog
                open={txToDismiss !== null}
                onOpenChange={(open) => !open && setTxToDismiss(null)}
                onConfirm={confirmDismiss}
                title="Dismiss Transaction"
                description="Dismiss this transaction? It will be hidden from the pending list."
                confirmText="Dismiss"
                variant="destructive"
            />

            <ConfirmDialog
                open={showBulkApproveDialog}
                onOpenChange={setShowBulkApproveDialog}
                onConfirm={confirmBulkApprove}
                title="Approve Transactions"
                description={`Approve ${bulkApproveUpdates.length} transactions?`}
                confirmText="Approve"
            />

            <ConfirmDialog
                open={showBulkDismissDialog}
                onOpenChange={setShowBulkDismissDialog}
                onConfirm={confirmBulkDismiss}
                title="Dismiss Transactions"
                description={`Dismiss ${selectedIds.size} transactions?`}
                confirmText="Dismiss"
                variant="destructive"
            />
        </>
    );
}
