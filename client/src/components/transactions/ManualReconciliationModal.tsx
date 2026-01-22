
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Search, Link } from "lucide-react";
import { useFinance, Transaction } from "@/context/FinanceContext";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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

interface ManualReconciliationModalProps {
    isOpen: boolean;
    onClose: () => void;
    stagedTransaction: StagedTransaction | null;
}

export function ManualReconciliationModal({ isOpen, onClose, stagedTransaction }: ManualReconciliationModalProps) {
    const { formatCurrency, accounts, categories } = useFinance();
    const [searchTerm, setSearchTerm] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // Fetch all transactions to search locally (or could filter on backend if too many)
    // For now, fetching all is consistent with other parts of the app, assuming reasonable volume
    const { data: allTransactions = [], isLoading } = useQuery<Transaction[]>({
        queryKey: ["/api/transactions"],
        enabled: isOpen,
    });

    const filteredTransactions = useMemo(() => {
        if (!stagedTransaction || !allTransactions) return [];

        let filtered = allTransactions.filter(t => !t.externalId); // Only show unreconciled transactions

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                t.description.toLowerCase().includes(lowerTerm) ||
                t.amount.includes(searchTerm) ||
                format(new Date(t.date), "dd/MM/yyyy").includes(searchTerm)
            );
        } else {
            // Default filter: Same account, +/- 14 days, similar amount?
            // Let's just filter by account and show recent ones first to avoid being too restrictive initially
            // Or better, don't filter by account strictly if they want to cross-match? 
            // Usually reconciliation is per account.
            filtered = filtered.filter(t => t.accountId === stagedTransaction.accountId);

            // Sort by date proximity
            filtered.sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                const targetDate = new Date(stagedTransaction.date).getTime();
                return Math.abs(dateA - targetDate) - Math.abs(dateB - targetDate);
            });

            // Take top 20 suggestions
            filtered = filtered.slice(0, 20);
        }

        return filtered;
    }, [allTransactions, stagedTransaction, searchTerm]);

    const linkMutation = useMutation({
        mutationFn: async (transactionId: number) => {
            if (!stagedTransaction) return;
            await apiRequest("POST", `/api/transactions/staging/${stagedTransaction.id}/link`, { transactionId });
        },
        onSuccess: () => {
            toast({ title: "Transaction Linked", description: "The transaction has been successfully reconciled." });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
            queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
            onClose();
        },
        onError: () => {
            toast({ title: "Failed to link", variant: "destructive" });
        }
    });

    if (!stagedTransaction) return null;

    const stagedAmount = parseFloat(stagedTransaction.amount);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manual Reconciliation</DialogTitle>
                    <DialogDescription>
                        Select a transaction to link with the imported bank transaction.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/30 p-4 rounded-md border mb-4">
                    <h3 className="text-sm font-medium text-muted-foreground mb-2">Imported Transaction</h3>
                    <div className="flex justify-between items-center text-sm">
                        <div>
                            <span className="font-semibold">{format(new Date(stagedTransaction.date), "dd/MM/yyyy")}</span>
                            <span className="mx-2">•</span>
                            <span>{stagedTransaction.description}</span>
                        </div>
                        <div className={`font-mono font-bold ${stagedAmount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                            {formatCurrency(stagedAmount)}
                        </div>
                    </div>
                </div>

                <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search for matching transaction (description, amount, date)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>

                <div className="flex-1 overflow-auto min-h-[300px] border rounded-md">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="flex flex-col justify-center items-center h-40 text-muted-foreground">
                            <p>No matching transactions found.</p>
                            <p className="text-xs mt-1">Try adjusting your search.</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredTransactions.map(tx => {
                                    const amount = parseFloat(tx.amount);
                                    const isMatch = Math.abs(amount - stagedAmount) < 0.01;
                                    const dateDiff = Math.ceil(Math.abs(new Date(tx.date).getTime() - new Date(stagedTransaction.date).getTime()) / (1000 * 60 * 60 * 24));

                                    return (
                                        <TableRow key={tx.id}>
                                            <TableCell>{format(new Date(tx.date), "dd/MM/yyyy")}</TableCell>
                                            <TableCell>{tx.description}</TableCell>
                                            <TableCell>{categories.find(c => c.id === tx.categoryId)?.name}</TableCell>
                                            <TableCell className={`text-right font-mono ${amount < 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                                {formatCurrency(amount)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    size="sm"
                                                    variant={isMatch ? "default" : "secondary"}
                                                    className="h-8 gap-1"
                                                    onClick={() => linkMutation.mutate(tx.id)}
                                                    disabled={linkMutation.isPending}
                                                >
                                                    <Link className="h-3 w-3" />
                                                    Link
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
