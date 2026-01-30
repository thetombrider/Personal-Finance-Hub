import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Trash2, Download, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError, toastPatterns } from "@/lib/toastHelpers";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import * as api from "@/lib/api";
import type { Trade, Holding, Account } from "@shared/schema";

interface TransactionsHistoryProps {
    trades: Trade[];
    holdings: Holding[];
    accounts: Account[];
}

export function TransactionsHistory({ trades, holdings, accounts }: TransactionsHistoryProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [tradesHoldingFilter, setTradesHoldingFilter] = useState<string>("all");
    const [selectedTradeIds, setSelectedTradeIds] = useState<Set<number>>(new Set());
    const [editingTrade, setEditingTrade] = useState<(Trade & { holding?: Holding }) | null>(null);
    const [tradeToDelete, setTradeToDelete] = useState<(Trade & { holding?: Holding }) | null>(null);

    const [editForm, setEditForm] = useState({
        quantity: "",
        pricePerUnit: "",
        fees: "0",
        date: "",
        type: "buy" as "buy" | "sell",
        accountId: ""
    });

    const tradesWithHoldings = useMemo(() => {
        return trades.map(trade => {
            const holding = holdings.find(h => h.id === trade.holdingId);
            return { ...trade, holding };
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [trades, holdings]);

    const [itemsPerPage] = useState(50);
    const [currentPage, setCurrentPage] = useState(1);

    const filteredTrades = useMemo(() => {
        if (tradesHoldingFilter === "all") return tradesWithHoldings;
        return tradesWithHoldings.filter(trade => trade.holdingId === parseInt(tradesHoldingFilter));
    }, [tradesWithHoldings, tradesHoldingFilter]);

    // Reset pagination when filter changes
    useMemo(() => {
        setCurrentPage(1);
    }, [tradesHoldingFilter]);

    const totalPages = Math.ceil(filteredTrades.length / itemsPerPage);
    const paginatedTrades = filteredTrades.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const allFilteredTradesSelected = filteredTrades.length > 0 && filteredTrades.every(t => selectedTradeIds.has(t.id));
    const someFilteredTradesSelected = filteredTrades.some(t => selectedTradeIds.has(t.id)) && !allFilteredTradesSelected;

    const toggleTradeSelection = (id: number) => {
        const newSelected = new Set(selectedTradeIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTradeIds(newSelected);
    };

    const toggleAllTrades = () => {
        if (allFilteredTradesSelected) {
            const newSelected = new Set(selectedTradeIds);
            filteredTrades.forEach(t => newSelected.delete(t.id));
            setSelectedTradeIds(newSelected);
        } else {
            const newSelected = new Set(selectedTradeIds);
            filteredTrades.forEach(t => newSelected.add(t.id));
            setSelectedTradeIds(newSelected);
        }
    };

    const deleteTradesBulkMutation = useMutation({
        mutationFn: api.deleteTradesBulk,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trades"] });
            toastPatterns.deleted(toast, "Transactions");
            setSelectedTradeIds(new Set());
        },
    });

    const updateTradeMutation = useMutation({
        mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateTrade>[1] }) =>
            api.updateTrade(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trades"] });
            toastPatterns.updated(toast, "Transaction", "Changes saved.");
            setEditingTrade(null);
        },
        onError: () => {
            showError(toast, "Error", "Could not update transaction.");
        },
    });

    const deleteTradeMutation = useMutation({
        mutationFn: api.deleteTrade,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trades"] });
            toastPatterns.deleted(toast, "Transaction");
            setTradeToDelete(null);
        },
    });

    const handleBulkDeleteTrades = async () => {
        if (confirm(`Are you sure you want to delete ${selectedTradeIds.size} transactions?`)) {
            await deleteTradesBulkMutation.mutateAsync(Array.from(selectedTradeIds));
        }
    };

    const exportTradesToCSV = () => {
        if (trades.length === 0) {
            showError(toast, "No trades to export");
            return;
        }

        const csvHeader = "Date,Type,Ticker,Name,Quantity,Unit Price,Fees,Total,Account\n";
        const csvRows = trades.map(trade => {
            const holding = holdings.find(h => h.id === trade.holdingId);
            const date = format(parseISO(trade.date), "yyyy-MM-dd");
            const type = trade.type === "buy" ? "Buy" : "Sell";
            const ticker = holding?.ticker || "";
            const name = (holding?.name || "").replace(/,/g, " ");
            const quantity = parseFloat(trade.quantity).toFixed(4);
            const pricePerUnit = parseFloat(trade.pricePerUnit).toFixed(2);
            const fees = parseFloat(trade.fees).toFixed(2);
            const totalAmount = parseFloat(trade.totalAmount).toFixed(2);
            const account = accounts.find((a: Account) => a.id === trade.accountId);
            const accountName = (account?.name || "").replace(/,/g, " ");

            return `${date},${type},${ticker},"${name}",${quantity},${pricePerUnit},${fees},${totalAmount},"${accountName}"`;
        }).join("\n");

        const csvContent = csvHeader + csvRows;
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `portfolio_trades_${format(new Date(), "yyyy-MM-dd")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showSuccess(toast, "Export completed", `${trades.length} transactions exported`);
    };

    const openEditDialog = (trade: Trade & { holding?: Holding }) => {
        setEditingTrade(trade);
        const dateStr = trade.date.includes("T")
            ? trade.date.split("T")[0]
            : trade.date.split(" ")[0];
        setEditForm({
            quantity: trade.quantity,
            pricePerUnit: trade.pricePerUnit,
            fees: trade.fees,
            date: dateStr,
            type: trade.type as "buy" | "sell",
            accountId: trade.accountId ? trade.accountId.toString() : ""
        });
    };

    const handleUpdateTrade = () => {
        if (!editingTrade) return;

        const quantity = parseFloat(editForm.quantity);
        const pricePerUnit = parseFloat(editForm.pricePerUnit);
        const fees = parseFloat(editForm.fees) || 0;

        if (isNaN(quantity) || quantity <= 0) {
            showError(toast, "Error", "Please enter a valid quantity.");
            return;
        }
        if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
            showError(toast, "Error", "Please enter a valid price.");
            return;
        }
        if (isNaN(fees) || fees < 0) {
            showError(toast, "Error", "Please enter valid fees.");
            return;
        }

        const grossAmount = quantity * pricePerUnit;
        const totalAmount = editForm.type === "buy"
            ? grossAmount + fees
            : grossAmount - fees;

        updateTradeMutation.mutate({
            id: editingTrade.id,
            data: {
                date: editForm.date.includes("T") ? editForm.date : `${editForm.date}T12:00:00`,
                quantity: quantity.toString(),
                pricePerUnit: pricePerUnit.toString(),
                totalAmount: totalAmount.toFixed(2),
                fees: fees.toFixed(2),
                type: editForm.type,
                accountId: parseInt(editForm.accountId) || undefined
            }
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    return (
        <>
            <Card className="flex-1 flex flex-col min-h-0 border-0 shadow-none bg-transparent sm:border sm:shadow-sm sm:bg-card">
                <CardHeader className="flex-none px-0 sm:px-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Transaction History</CardTitle>
                            <CardDescription>All registered buy and sell transactions</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {selectedTradeIds.size > 0 && (
                                <Button variant="destructive" size="sm" onClick={handleBulkDeleteTrades}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Delete ({selectedTradeIds.size})
                                </Button>
                            )}
                            <Select value={tradesHoldingFilter} onValueChange={setTradesHoldingFilter}>
                                <SelectTrigger className="w-[200px]" data-testid="select-trades-holding-filter">
                                    <SelectValue placeholder="All Holdings" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Holdings</SelectItem>
                                    {holdings.map(h => (
                                        <SelectItem key={h.id} value={h.id.toString()}>{h.ticker} - {h.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportTradesToCSV}
                                disabled={trades.length === 0}
                                data-testid="button-export-trades"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 p-0 sm:p-6 sm:pt-0">
                    {filteredTrades.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>No transactions registered</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 border rounded-lg bg-card overflow-hidden">
                            <div className="flex-1 overflow-auto relative">
                                <table className="w-full caption-bottom text-sm">
                                    <TableHeader className="sticky top-0 z-10 bg-card shadow-sm">
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox
                                                    checked={allFilteredTradesSelected || someFilteredTradesSelected}
                                                    onCheckedChange={toggleAllTrades}
                                                    aria-label="Select all"
                                                />
                                            </TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Holding</TableHead>
                                            <TableHead className="text-right">Quantity</TableHead>
                                            <TableHead className="text-right">Price</TableHead>
                                            <TableHead className="text-right">Fees</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedTrades.map((trade) => (
                                            <TableRow key={trade.id} data-testid={`row-trade-${trade.id}`}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedTradeIds.has(trade.id)}
                                                        onCheckedChange={() => toggleTradeSelection(trade.id)}
                                                        aria-label="Select row"
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {format(parseISO(trade.date), "dd MMM yyyy", { locale: it })}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={trade.type === "buy" ? "default" : "secondary"}>
                                                        {trade.type === "buy" ? "Buy" : "Sell"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div>
                                                        <p className="font-medium">{trade.holding?.ticker || "—"}</p>
                                                        <p className="text-sm text-muted-foreground truncate max-w-[150px]">
                                                            {trade.holding?.name || "—"}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {parseFloat(trade.quantity).toFixed(4)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatCurrency(parseFloat(trade.pricePerUnit))}
                                                </TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {formatCurrency(parseFloat(trade.fees))}
                                                </TableCell>
                                                <TableCell className="text-right font-mono font-medium">
                                                    {formatCurrency(parseFloat(trade.totalAmount))}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => openEditDialog(trade)}
                                                            data-testid={`button-edit-trade-${trade.id}`}
                                                        >
                                                            <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => setTradeToDelete(trade)}
                                                            data-testid={`button-delete-trade-${trade.id}`}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </table>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 border-t bg-card z-10">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTrades.length)} of {filteredTrades.length} transactions
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                            disabled={currentPage === 1}
                                            data-testid="button-prev-page"
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum: number;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "outline"}
                                                        size="sm"
                                                        className="w-8 h-8 p-0"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        data-testid={`button-page-${pageNum}`}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                            disabled={currentPage === totalPages}
                                            data-testid="button-next-page"
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!editingTrade} onOpenChange={(open) => !open && setEditingTrade(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Transaction</DialogTitle>
                    </DialogHeader>
                    {editingTrade && (
                        <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-medium">{editingTrade.holding?.ticker}</p>
                                <p className="text-sm text-muted-foreground">{editingTrade.holding?.name}</p>
                            </div>

                            <div className="space-y-2">
                                <Label>Investment Account</Label>
                                <Select
                                    value={editForm.accountId}
                                    onValueChange={(v) => setEditForm(prev => ({ ...prev, accountId: v }))}
                                >
                                    <SelectTrigger data-testid="select-edit-trade-account">
                                        <SelectValue placeholder="Select account..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {accounts.map((account: Account) => (
                                            <SelectItem key={account.id} value={account.id.toString()}>
                                                {account.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Transaction Type</Label>
                                    <Select
                                        value={editForm.type}
                                        onValueChange={(value: "buy" | "sell") => setEditForm(prev => ({ ...prev, type: value }))}
                                    >
                                        <SelectTrigger data-testid="select-edit-type">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="buy">Buy</SelectItem>
                                            <SelectItem value="sell">Sell</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Date</Label>
                                    <Input
                                        type="date"
                                        value={editForm.date}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                                        data-testid="input-edit-date"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Quantity</Label>
                                    <Input
                                        type="number"
                                        step="0.00000001"
                                        value={editForm.quantity}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                                        data-testid="input-edit-quantity"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Price per Unit (EUR)</Label>
                                    <Input
                                        type="number"
                                        step="0.0001"
                                        value={editForm.pricePerUnit}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, pricePerUnit: e.target.value }))}
                                        data-testid="input-edit-price"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Fees</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={editForm.fees}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, fees: e.target.value }))}
                                    data-testid="input-edit-fees"
                                />
                            </div>

                            {editForm.quantity && editForm.pricePerUnit && (
                                <div className="p-3 bg-muted rounded-lg">
                                    <div className="flex justify-between">
                                        <span>Transaction Total:</span>
                                        <span className="font-bold">
                                            {formatCurrency(
                                                editForm.type === "buy"
                                                    ? parseFloat(editForm.quantity) * parseFloat(editForm.pricePerUnit) + (parseFloat(editForm.fees) || 0)
                                                    : parseFloat(editForm.quantity) * parseFloat(editForm.pricePerUnit) - (parseFloat(editForm.fees) || 0)
                                            )}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button
                            onClick={handleUpdateTrade}
                            disabled={!editForm.quantity || !editForm.pricePerUnit || updateTradeMutation.isPending}
                            data-testid="button-save-edit"
                        >
                            {updateTradeMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!tradeToDelete} onOpenChange={(open) => !open && setTradeToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this transaction?
                            {tradeToDelete && (
                                <div className="mt-3 p-3 bg-muted rounded-lg text-foreground">
                                    <p className="font-medium">{tradeToDelete.holding?.ticker}</p>
                                    <p className="text-sm">
                                        {tradeToDelete.type === "buy" ? "Buy" : "Sell"} of {parseFloat(tradeToDelete.quantity).toFixed(4)} units
                                        at {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(parseFloat(tradeToDelete.pricePerUnit))}
                                    </p>
                                    <p className="text-sm font-medium mt-1">
                                        Total: {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(parseFloat(tradeToDelete.totalAmount))}
                                    </p>
                                </div>
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => tradeToDelete && deleteTradeMutation.mutate(tradeToDelete.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            data-testid="button-confirm-delete"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
