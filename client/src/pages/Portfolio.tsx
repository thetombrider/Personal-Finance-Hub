import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, RefreshCw, Search, Trash2, ArrowUpRight, ArrowDownRight, Pencil, Download } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { Checkbox } from "@/components/ui/checkbox";
import * as api from "@/lib/api";
import type { Holding, Trade, Account } from "@shared/schema";
import { StockDetailModal } from "@/components/portfolio/StockDetailModal";
import { usePortfolioStats, type HoldingWithStats } from "@/hooks/usePortfolioStats";


export default function Portfolio() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [entryMode, setEntryMode] = useState<"search" | "manual">("manual");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<api.StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<api.StockSearchResult | null>(null);
  const [currentQuote, setCurrentQuote] = useState<api.StockQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [manualTicker, setManualTicker] = useState("");
  const [manualName, setManualName] = useState("");
  const [tradeForm, setTradeForm] = useState({
    quantity: "",
    pricePerUnit: "",
    fees: "0",
    date: format(new Date(), "yyyy-MM-dd"),
    type: "buy" as "buy" | "sell",
    accountId: ""
  });

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.fetchAccounts
  });

  const investmentAccounts = accountsData?.filter((a: Account) => a.type === "investment") || [];
  const {
    holdings,
    trades,
    quotes, // Ensure quotes are available
    holdingsWithStats,
    portfolioSummary,
    refreshQuotes,
    isRefreshingQuotes,
    isLoading: isLoadingPortfolio
  } = usePortfolioStats();

  const [editingTrade, setEditingTrade] = useState<(Trade & { holding?: Holding }) | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: "",
    pricePerUnit: "",
    fees: "0",
    date: "",
    type: "buy" as "buy" | "sell",
    accountId: ""
  });
  const [tradeToDelete, setTradeToDelete] = useState<(Trade & { holding?: Holding }) | null>(null);
  const [showHoldingsDropdown, setShowHoldingsDropdown] = useState(false);
  const [tradesHoldingFilter, setTradesHoldingFilter] = useState<string>("all");
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<number>>(new Set());
  const [selectedHoldingForDetail, setSelectedHoldingForDetail] = useState<HoldingWithStats | null>(null);


  const createHoldingMutation = useMutation({
    mutationFn: api.createHolding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holdings"] }),
  });

  const createTradeMutation = useMutation({
    mutationFn: api.createTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Purchase registered", description: "The transaction was saved successfully." });
      resetTradeForm();
      setIsAddTradeOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not save transaction.", variant: "destructive" });
    },
  });

  const deleteTradeMutation = useMutation({
    mutationFn: api.deleteTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Transaction deleted" });
      setTradeToDelete(null);
    },
  });

  const deleteTradesBulkMutation = useMutation({
    mutationFn: api.deleteTradesBulk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Transactions deleted" });
      setSelectedTradeIds(new Set());
    },
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateTrade>[1] }) =>
      api.updateTrade(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Transaction updated", description: "Changes saved." });
      setEditingTrade(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Could not update transaction.", variant: "destructive" });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: api.deleteHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Holding deleted" });
    },
  });

  const resetTradeForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedStock(null);
    setCurrentQuote(null);
    setManualTicker("");
    setManualName("");
    setShowHoldingsDropdown(false);
    setTradeForm({
      quantity: "",
      pricePerUnit: "",
      fees: "0",
      date: format(new Date(), "yyyy-MM-dd"),
      type: "buy",
      accountId: ""
    });
  };

  const selectExistingHolding = async (holding: Holding) => {
    setShowHoldingsDropdown(false);
    if (entryMode === "manual") {
      setManualTicker(holding.ticker);
      setManualName(holding.name);
    } else {
      const stockData: api.StockSearchResult = {
        symbol: holding.ticker,
        name: holding.name,
        type: holding.assetType,
        region: "",
        currency: holding.currency
      };
      await handleSelectStock(stockData);
    }
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
      toast({ title: "Error", description: "Please enter a valid quantity.", variant: "destructive" });
      return;
    }
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      toast({ title: "Error", description: "Please enter a valid price.", variant: "destructive" });
      return;
    }
    if (isNaN(fees) || fees < 0) {
      toast({ title: "Error", description: "Please enter valid fees.", variant: "destructive" });
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
        fees: fees.toFixed(2),
        type: editForm.type,
        accountId: parseInt(editForm.accountId) || undefined
      }
    });
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await api.searchStocks(searchQuery);
      setSearchResults(results);
    } catch (error: any) {
      toast({ title: "Search Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectStock = async (stock: api.StockSearchResult) => {
    setSelectedStock(stock);
    setSearchResults([]);
    setSearchQuery(stock.symbol);
    setIsLoadingQuote(true);
    try {
      const quote = await api.fetchStockQuote(stock.symbol);
      setCurrentQuote(quote);
      setTradeForm(prev => ({ ...prev, pricePerUnit: quote.price.toFixed(4) }));
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleSubmitTrade = async () => {
    const isManual = entryMode === "manual";
    const ticker = isManual ? manualTicker.trim().toUpperCase() : selectedStock?.symbol;
    const name = isManual ? (manualName.trim() || manualTicker.trim().toUpperCase()) : selectedStock?.name;

    if (!ticker || !tradeForm.quantity || !tradeForm.pricePerUnit || !tradeForm.accountId) {
      toast({ title: "Missing Data", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    const quantity = parseFloat(tradeForm.quantity);
    const pricePerUnit = parseFloat(tradeForm.pricePerUnit);
    const fees = parseFloat(tradeForm.fees) || 0;
    const grossAmount = quantity * pricePerUnit;
    const totalAmount = tradeForm.type === "buy"
      ? grossAmount + fees
      : grossAmount - fees;

    try {
      const holding = await createHoldingMutation.mutateAsync({
        ticker,
        name: name || ticker,
        assetType: isManual ? "ETF" : (selectedStock?.type || "ETF"),
        currency: "EUR",
      });

      await createTradeMutation.mutateAsync({
        holdingId: holding.id,
        date: tradeForm.date.includes("T") ? tradeForm.date : `${tradeForm.date}T12:00:00`,
        quantity: quantity.toString(),
        pricePerUnit: pricePerUnit.toString(),
        totalAmount: totalAmount.toFixed(2),
        fees: fees.toFixed(2),
        type: tradeForm.type,
        accountId: parseInt(tradeForm.accountId) || undefined
      });
    } catch (error) {
      console.error("Error creating trade:", error);
    }
  };


  const exportTradesToCSV = () => {
    if (trades.length === 0) {
      toast({ title: "No trades to export", variant: "destructive" });
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
      const account = accountsData?.find((a: Account) => a.id === trade.accountId);
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

    toast({ title: "Export completed", description: `${trades.length} transactions exported` });
  };



  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const tradesWithHoldings = useMemo(() => {
    return trades.map(trade => {
      const holding = holdings.find(h => h.id === trade.holdingId);
      return { ...trade, holding };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [trades, holdings]);

  const filteredTrades = useMemo(() => {
    if (tradesHoldingFilter === "all") return tradesWithHoldings;
    return tradesWithHoldings.filter(trade => trade.holdingId === parseInt(tradesHoldingFilter));
  }, [tradesWithHoldings, tradesHoldingFilter]);

  const toggleTradeSelection = (id: number) => {
    const newSelected = new Set(selectedTradeIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTradeIds(newSelected);
  };

  const allFilteredTradesSelected = filteredTrades.length > 0 && filteredTrades.every(t => selectedTradeIds.has(t.id));
  const someFilteredTradesSelected = filteredTrades.some(t => selectedTradeIds.has(t.id)) && !allFilteredTradesSelected;

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

  const handleBulkDeleteTrades = async () => {
    if (confirm(`Are you sure you want to delete ${selectedTradeIds.size} transactions?`)) {
      await deleteTradesBulkMutation.mutateAsync(Array.from(selectedTradeIds));
    }
  };

  if (isLoadingPortfolio) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Investment Portfolio</h1>
            <p className="text-muted-foreground">Track your investments</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refreshQuotes(true)}
              disabled={isRefreshingQuotes}
              data-testid="button-refresh-quotes"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingQuotes ? "animate-spin" : ""}`} />
              Aggiorna Prezzi
            </Button>
            <Dialog open={isAddTradeOpen} onOpenChange={(open) => { setIsAddTradeOpen(open); if (!open) resetTradeForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-trade">
                  <Plus className="mr-2 h-4 w-4" />
                  New Buy
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Register Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "search" | "manual")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual" data-testid="tab-manual-entry">Manual Entry</TabsTrigger>
                      <TabsTrigger value="search" data-testid="tab-search-entry">Search Online</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 relative">
                          <Label>Ticker / Symbol *</Label>
                          <Input
                            placeholder="Es. SWDA.LON, VWCE.DEX"
                            value={manualTicker}
                            onChange={(e) => { setManualTicker(e.target.value); setShowHoldingsDropdown(false); }}
                            onFocus={() => holdings.length > 0 && setShowHoldingsDropdown(true)}
                            onBlur={() => setTimeout(() => setShowHoldingsDropdown(false), 200)}
                            data-testid="input-manual-ticker"
                          />
                          {showHoldingsDropdown && holdings.length > 0 && (
                            <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-40 overflow-y-auto">
                              <div className="p-2 text-xs text-muted-foreground border-b">Holdings in portfolio:</div>
                              {holdings.map((h) => (
                                <button
                                  key={h.id}
                                  type="button"
                                  className="w-full px-3 py-2 text-left hover:bg-accent flex justify-between items-center text-sm"
                                  onClick={() => selectExistingHolding(h)}
                                  data-testid={`button-select-holding-${h.id}`}
                                >
                                  <div>
                                    <span className="font-medium">{h.ticker}</span>
                                    <span className="text-muted-foreground ml-2 text-xs">{h.name}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Name (optional)</Label>
                          <Input
                            placeholder="Es. iShares MSCI World"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            onFocus={() => setShowHoldingsDropdown(false)}
                            data-testid="input-manual-name"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="search" className="space-y-4 mt-4">
                      <div className="space-y-2 relative">
                        <Label>Search Holding</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Es. VWCE, IWDA, AAPL..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setShowHoldingsDropdown(false); }}
                            onFocus={() => holdings.length > 0 && !selectedStock && setShowHoldingsDropdown(true)}
                            onBlur={() => setTimeout(() => setShowHoldingsDropdown(false), 200)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            data-testid="input-search-stock"
                          />
                          <Button onClick={handleSearch} disabled={isSearching} data-testid="button-search-stock">
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
                        {showHoldingsDropdown && holdings.length > 0 && !selectedStock && searchResults.length === 0 && (
                          <div className="absolute z-50 top-full left-0 right-0 mt-1 border rounded-md bg-popover shadow-md max-h-40 overflow-y-auto">
                            <div className="p-2 text-xs text-muted-foreground border-b">Holdings in portfolio:</div>
                            {holdings.map((h) => (
                              <button
                                key={h.id}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-accent flex justify-between items-center text-sm"
                                onClick={() => selectExistingHolding(h)}
                                data-testid={`button-select-holding-search-${h.id}`}
                              >
                                <div>
                                  <span className="font-medium">{h.ticker}</span>
                                  <span className="text-muted-foreground ml-2 text-xs">{h.name}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                        {searchResults.length > 0 && (
                          <div className="border rounded-md max-h-40 overflow-y-auto">
                            {searchResults.map((result) => (
                              <button
                                key={result.symbol}
                                className="w-full px-3 py-2 text-left hover:bg-accent flex justify-between items-center"
                                onClick={() => handleSelectStock(result)}
                                data-testid={`button-select-stock-${result.symbol}`}
                              >
                                <div>
                                  <span className="font-medium">{result.symbol}</span>
                                  <span className="text-sm text-muted-foreground ml-2">{result.name}</span>
                                </div>
                                <Badge variant="outline">{result.type}</Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>



                      {selectedStock && (
                        <div className="p-3 bg-accent rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{selectedStock.symbol}</p>
                              <p className="text-sm text-muted-foreground">{selectedStock.name}</p>
                            </div>
                            {isLoadingQuote ? (
                              <Skeleton className="h-6 w-20" />
                            ) : currentQuote && (
                              <div className="text-right">
                                <p className="font-bold">{formatCurrency(currentQuote.price)}</p>
                                <p className={`text-sm ${currentQuote.change >= 0 ? "text-green-600" : "text-red-600"}`}>
                                  {currentQuote.change >= 0 ? "+" : ""}{currentQuote.changePercent}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </TabsContent>
                  </Tabs>

                  {(entryMode === "manual" || selectedStock) && (
                    <>
                      <div className="space-y-2">
                        <Label>Investment Account</Label>
                        <Select
                          value={tradeForm.accountId}
                          onValueChange={(v) => setTradeForm(prev => ({ ...prev, accountId: v }))}
                        >
                          <SelectTrigger data-testid="select-trade-account">
                            <SelectValue placeholder="Select account..." />
                          </SelectTrigger>
                          <SelectContent>
                            {investmentAccounts.map((account: Account) => (
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
                          <Select value={tradeForm.type} onValueChange={(v: "buy" | "sell") => setTradeForm(prev => ({ ...prev, type: v }))}>
                            <SelectTrigger data-testid="select-trade-type">
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
                            value={tradeForm.date}
                            onChange={(e) => setTradeForm(prev => ({ ...prev, date: e.target.value }))}
                            data-testid="input-trade-date"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            step="0.00000001"
                            placeholder="Es. 1.5"
                            value={tradeForm.quantity}
                            onChange={(e) => setTradeForm(prev => ({ ...prev, quantity: e.target.value }))}
                            data-testid="input-trade-quantity"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Price per Unit (EUR)</Label>
                          <Input
                            type="number"
                            step="0.0001"
                            placeholder="Es. 97.54"
                            value={tradeForm.pricePerUnit}
                            onChange={(e) => setTradeForm(prev => ({ ...prev, pricePerUnit: e.target.value }))}
                            data-testid="input-trade-price"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Fees</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={tradeForm.fees}
                          onChange={(e) => setTradeForm(prev => ({ ...prev, fees: e.target.value }))}
                          data-testid="input-trade-fees"
                        />
                      </div>

                      {tradeForm.quantity && tradeForm.pricePerUnit && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between">
                            <span>Transaction Total:</span>
                            <span className="font-bold">
                              {formatCurrency(
                                tradeForm.type === "buy"
                                  ? parseFloat(tradeForm.quantity) * parseFloat(tradeForm.pricePerUnit) + (parseFloat(tradeForm.fees) || 0)
                                  : parseFloat(tradeForm.quantity) * parseFloat(tradeForm.pricePerUnit) - (parseFloat(tradeForm.fees) || 0)
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    onClick={handleSubmitTrade}
                    disabled={
                      (entryMode === "manual" ? !manualTicker.trim() : !selectedStock) ||
                      !tradeForm.quantity ||
                      !tradeForm.pricePerUnit ||
                      !tradeForm.accountId ||
                      createTradeMutation.isPending
                    }
                    data-testid="button-submit-trade"
                  >
                    {createTradeMutation.isPending ? "Saving..." : "Save Transaction"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-invested">
                {formatCurrency(portfolioSummary.totalInvested)}
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolioSummary.holdingsCount} holdings in portfolio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Value</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-current-value">
                {portfolioSummary.holdingsWithValue > 0
                  ? formatCurrency(portfolioSummary.totalCurrentValue)
                  : "—"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolioSummary.holdingsWithValue}/{portfolioSummary.holdingsCount} with updated price
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gain/Loss</CardTitle>
              {portfolioSummary.totalGainLoss >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${portfolioSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}
                data-testid="text-gain-loss"
              >
                {portfolioSummary.holdingsWithValue > 0
                  ? `${portfolioSummary.totalGainLoss >= 0 ? "+" : ""}${formatCurrency(portfolioSummary.totalGainLoss)}`
                  : "—"
                }
              </div>
              <p className={`text-xs ${portfolioSummary.totalGainLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                {portfolioSummary.holdingsWithValue > 0
                  ? `${portfolioSummary.totalGainLossPercent >= 0 ? "+" : ""}${portfolioSummary.totalGainLossPercent.toFixed(2)}%`
                  : "Refresh prices"
                }
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performance</CardTitle>
              {portfolioSummary.totalGainLossPercent >= 0 ? (
                <ArrowUpRight className="h-4 w-4 text-green-600" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${portfolioSummary.totalGainLossPercent >= 0 ? "text-green-600" : "text-red-600"}`}
                data-testid="text-performance"
              >
                {portfolioSummary.holdingsWithValue > 0
                  ? `${portfolioSummary.totalGainLossPercent >= 0 ? "+" : ""}${portfolioSummary.totalGainLossPercent.toFixed(2)}%`
                  : "—"
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Total return
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="holdings" data-testid="tab-holdings">Holdings</TabsTrigger>
            <TabsTrigger value="trades" data-testid="tab-trades">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <Card>
              <CardHeader>
                <CardTitle>Your Holdings</CardTitle>
                <CardDescription>Overview of portfolio holdings with average purchase price and current value</CardDescription>
              </CardHeader>
              <CardContent>
                {holdingsWithStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <PiggyBank className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>No holdings in portfolio</p>
                    <p className="text-sm">Start by adding your first purchase</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Holding</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Avg Price</TableHead>
                        <TableHead className="text-right">Current Price</TableHead>
                        <TableHead className="text-right">Invested</TableHead>
                        <TableHead className="text-right">Current Value</TableHead>
                        <TableHead className="text-right">Gain/Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdingsWithStats.map((holding) => (
                        <TableRow
                          key={holding.id}
                          data-testid={`row-holding-${holding.id}`}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setSelectedHoldingForDetail(holding)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium">{holding.ticker}</p>
                              <p className="text-sm text-muted-foreground truncate max-w-[200px]">{holding.name}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {holding.totalQuantity.toFixed(4)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(holding.averagePrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {holding.currentPrice !== null ? (
                              <span>{formatCurrency(holding.currentPrice)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(holding.totalInvested)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {holding.currentValue !== null ? (
                              <span>{formatCurrency(holding.currentValue)}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {holding.gainLoss !== null ? (
                              <div className={holding.gainLoss >= 0 ? "text-green-600" : "text-red-600"}>
                                <p className="font-mono">
                                  {holding.gainLoss >= 0 ? "+" : ""}{formatCurrency(holding.gainLoss)}
                                </p>
                                <p className="text-xs">
                                  {holding.gainLossPercent !== null && (
                                    <>({holding.gainLossPercent >= 0 ? "+" : ""}{holding.gainLossPercent.toFixed(2)}%)</>
                                  )}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trades">
            <Card>
              <CardHeader>
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
              <CardContent>
                {filteredTrades.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No transactions registered</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
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
                      {filteredTrades.map((trade) => (
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
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

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
                    {investmentAccounts.map((account: Account) => (
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

      {selectedHoldingForDetail && (
        <StockDetailModal
          isOpen={!!selectedHoldingForDetail}
          onClose={() => setSelectedHoldingForDetail(null)}
          holding={selectedHoldingForDetail}
          trades={trades.filter(t => t.holdingId === selectedHoldingForDetail.id)}
        />
      )}
    </Layout>
  );
}
