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
import { Plus, TrendingUp, TrendingDown, Wallet, PiggyBank, RefreshCw, Search, Trash2, ArrowUpRight, ArrowDownRight, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import * as api from "@/lib/api";
import type { Holding, Trade } from "@shared/schema";

interface HoldingWithStats extends Holding {
  totalQuantity: number;
  totalInvested: number;
  averagePrice: number;
  currentPrice: number | null;
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPercent: number | null;
}

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
    type: "buy" as "buy" | "sell"
  });
  const [quotes, setQuotes] = useState<Record<string, { price: number; change: number; changePercent: string }>>({});
  const [isRefreshingQuotes, setIsRefreshingQuotes] = useState(false);
  const [editingTrade, setEditingTrade] = useState<(Trade & { holding?: Holding }) | null>(null);
  const [editForm, setEditForm] = useState({
    quantity: "",
    pricePerUnit: "",
    fees: "0",
    date: "",
    type: "buy" as "buy" | "sell"
  });
  const [tradeToDelete, setTradeToDelete] = useState<(Trade & { holding?: Holding }) | null>(null);

  const { data: holdings = [], isLoading: holdingsLoading } = useQuery({
    queryKey: ["holdings"],
    queryFn: api.fetchHoldings,
  });

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: api.fetchTrades,
  });

  const createHoldingMutation = useMutation({
    mutationFn: api.createHolding,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holdings"] }),
  });

  const createTradeMutation = useMutation({
    mutationFn: api.createTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Acquisto registrato", description: "L'operazione è stata salvata con successo." });
      resetTradeForm();
      setIsAddTradeOpen(false);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile salvare l'operazione.", variant: "destructive" });
    },
  });

  const deleteTradeMutation = useMutation({
    mutationFn: api.deleteTrade,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Operazione eliminata" });
      setTradeToDelete(null);
    },
  });

  const updateTradeMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof api.updateTrade>[1] }) => 
      api.updateTrade(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Operazione modificata", description: "Le modifiche sono state salvate." });
      setEditingTrade(null);
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile modificare l'operazione.", variant: "destructive" });
    },
  });

  const deleteHoldingMutation = useMutation({
    mutationFn: api.deleteHolding,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      toast({ title: "Titolo eliminato" });
    },
  });

  const resetTradeForm = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedStock(null);
    setCurrentQuote(null);
    setManualTicker("");
    setManualName("");
    setTradeForm({
      quantity: "",
      pricePerUnit: "",
      fees: "0",
      date: format(new Date(), "yyyy-MM-dd"),
      type: "buy"
    });
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
      type: trade.type as "buy" | "sell"
    });
  };

  const handleUpdateTrade = () => {
    if (!editingTrade) return;
    
    const quantity = parseFloat(editForm.quantity);
    const pricePerUnit = parseFloat(editForm.pricePerUnit);
    const fees = parseFloat(editForm.fees) || 0;

    if (isNaN(quantity) || quantity <= 0) {
      toast({ title: "Errore", description: "Inserisci una quantità valida.", variant: "destructive" });
      return;
    }
    if (isNaN(pricePerUnit) || pricePerUnit <= 0) {
      toast({ title: "Errore", description: "Inserisci un prezzo valido.", variant: "destructive" });
      return;
    }
    if (isNaN(fees) || fees < 0) {
      toast({ title: "Errore", description: "Inserisci commissioni valide.", variant: "destructive" });
      return;
    }

    const grossAmount = quantity * pricePerUnit;
    const totalAmount = editForm.type === "buy" 
      ? grossAmount + fees 
      : grossAmount - fees;

    updateTradeMutation.mutate({
      id: editingTrade.id,
      data: {
        date: editForm.date,
        quantity: quantity.toString(),
        pricePerUnit: pricePerUnit.toString(),
        totalAmount: totalAmount.toFixed(2),
        fees: fees.toFixed(2),
        type: editForm.type,
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
      toast({ title: "Errore ricerca", description: error.message, variant: "destructive" });
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
      toast({ title: "Errore", description: error.message, variant: "destructive" });
    } finally {
      setIsLoadingQuote(false);
    }
  };

  const handleSubmitTrade = async () => {
    const isManual = entryMode === "manual";
    const ticker = isManual ? manualTicker.trim().toUpperCase() : selectedStock?.symbol;
    const name = isManual ? (manualName.trim() || manualTicker.trim().toUpperCase()) : selectedStock?.name;

    if (!ticker || !tradeForm.quantity || !tradeForm.pricePerUnit) {
      toast({ title: "Dati mancanti", description: "Compila tutti i campi obbligatori.", variant: "destructive" });
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
        date: tradeForm.date,
        quantity: quantity.toString(),
        pricePerUnit: pricePerUnit.toString(),
        totalAmount: totalAmount.toFixed(2),
        fees: fees.toFixed(2),
        type: tradeForm.type,
      });
    } catch (error) {
      console.error("Error creating trade:", error);
    }
  };

  const refreshQuotes = async () => {
    if (holdings.length === 0) return;
    setIsRefreshingQuotes(true);
    try {
      const symbols = holdings.map(h => h.ticker);
      const newQuotes = await api.fetchBatchQuotes(symbols);
      setQuotes(newQuotes);
    } catch (error: any) {
      toast({ title: "Errore aggiornamento prezzi", description: error.message, variant: "destructive" });
    } finally {
      setIsRefreshingQuotes(false);
    }
  };

  useEffect(() => {
    if (holdings.length > 0 && Object.keys(quotes).length === 0) {
      refreshQuotes();
    }
  }, [holdings]);

  const holdingsWithStats: HoldingWithStats[] = useMemo(() => {
    return holdings.map(holding => {
      const holdingTrades = trades.filter(t => t.holdingId === holding.id);
      
      let totalQuantity = 0;
      let totalInvested = 0;

      holdingTrades.forEach(trade => {
        const qty = parseFloat(trade.quantity);
        const amount = parseFloat(trade.totalAmount);
        if (trade.type === "buy") {
          totalQuantity += qty;
          totalInvested += amount;
        } else {
          totalQuantity -= qty;
          totalInvested -= amount;
        }
      });

      const averagePrice = totalQuantity > 0 ? totalInvested / totalQuantity : 0;
      const quote = quotes[holding.ticker];
      const currentPrice = quote?.price || null;
      const currentValue = currentPrice && totalQuantity > 0 ? currentPrice * totalQuantity : null;
      const gainLoss = currentValue !== null ? currentValue - totalInvested : null;
      const gainLossPercent = gainLoss !== null && totalInvested > 0 ? (gainLoss / totalInvested) * 100 : null;

      return {
        ...holding,
        totalQuantity,
        totalInvested,
        averagePrice,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent,
      };
    }).filter(h => h.totalQuantity > 0);
  }, [holdings, trades, quotes]);

  const portfolioSummary = useMemo(() => {
    const totalInvested = holdingsWithStats.reduce((sum, h) => sum + h.totalInvested, 0);
    const totalCurrentValue = holdingsWithStats.reduce((sum, h) => sum + (h.currentValue || 0), 0);
    const totalGainLoss = totalCurrentValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;
    const holdingsWithValue = holdingsWithStats.filter(h => h.currentValue !== null).length;

    return {
      totalInvested,
      totalCurrentValue,
      totalGainLoss,
      totalGainLossPercent,
      holdingsCount: holdingsWithStats.length,
      holdingsWithValue,
    };
  }, [holdingsWithStats]);

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

  if (holdingsLoading || tradesLoading) {
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
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Portfolio Investimenti</h1>
            <p className="text-muted-foreground">Monitora i tuoi investimenti su Scalable Capital</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={refreshQuotes} 
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
                  Nuovo Acquisto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Registra Operazione</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Tabs value={entryMode} onValueChange={(v) => setEntryMode(v as "search" | "manual")}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="manual" data-testid="tab-manual-entry">Inserimento Manuale</TabsTrigger>
                      <TabsTrigger value="search" data-testid="tab-search-entry">Cerca Online</TabsTrigger>
                    </TabsList>

                    <TabsContent value="manual" className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Ticker / Simbolo *</Label>
                          <Input
                            placeholder="Es. SWDA.LON, VWCE.DEX"
                            value={manualTicker}
                            onChange={(e) => setManualTicker(e.target.value)}
                            data-testid="input-manual-ticker"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Nome (opzionale)</Label>
                          <Input
                            placeholder="Es. iShares MSCI World"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            data-testid="input-manual-name"
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="search" className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Cerca Titolo</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Es. VWCE, IWDA, AAPL..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            data-testid="input-search-stock"
                          />
                          <Button onClick={handleSearch} disabled={isSearching} data-testid="button-search-stock">
                            <Search className="h-4 w-4" />
                          </Button>
                        </div>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo Operazione</Label>
                          <Select value={tradeForm.type} onValueChange={(v: "buy" | "sell") => setTradeForm(prev => ({ ...prev, type: v }))}>
                            <SelectTrigger data-testid="select-trade-type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="buy">Acquisto</SelectItem>
                              <SelectItem value="sell">Vendita</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Data</Label>
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
                          <Label>Quantità</Label>
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
                          <Label>Prezzo per Unità (EUR)</Label>
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
                        <Label>Commissioni</Label>
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
                            <span>Totale Operazione:</span>
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
                    <Button variant="outline">Annulla</Button>
                  </DialogClose>
                  <Button 
                    onClick={handleSubmitTrade} 
                    disabled={
                      (entryMode === "manual" ? !manualTicker.trim() : !selectedStock) || 
                      !tradeForm.quantity || 
                      !tradeForm.pricePerUnit || 
                      createTradeMutation.isPending
                    }
                    data-testid="button-submit-trade"
                  >
                    {createTradeMutation.isPending ? "Salvataggio..." : "Salva Operazione"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Totale Investito</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-invested">
                {formatCurrency(portfolioSummary.totalInvested)}
              </div>
              <p className="text-xs text-muted-foreground">
                {portfolioSummary.holdingsCount} titoli in portafoglio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valore Attuale</CardTitle>
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
                {portfolioSummary.holdingsWithValue}/{portfolioSummary.holdingsCount} con prezzo aggiornato
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
                  : "Aggiorna i prezzi"
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
                Rendimento totale
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="holdings" data-testid="tab-holdings">Titoli</TabsTrigger>
            <TabsTrigger value="trades" data-testid="tab-trades">Storico Operazioni</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <Card>
              <CardHeader>
                <CardTitle>I tuoi Titoli</CardTitle>
                <CardDescription>Panoramica dei titoli in portafoglio con prezzo medio di carico e valore attuale</CardDescription>
              </CardHeader>
              <CardContent>
                {holdingsWithStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <PiggyBank className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Nessun titolo in portafoglio</p>
                    <p className="text-sm">Inizia aggiungendo il tuo primo acquisto</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titolo</TableHead>
                        <TableHead className="text-right">Quantità</TableHead>
                        <TableHead className="text-right">PMC</TableHead>
                        <TableHead className="text-right">Prezzo Attuale</TableHead>
                        <TableHead className="text-right">Investito</TableHead>
                        <TableHead className="text-right">Valore Attuale</TableHead>
                        <TableHead className="text-right">Gain/Loss</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holdingsWithStats.map((holding) => (
                        <TableRow key={holding.id} data-testid={`row-holding-${holding.id}`}>
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
                <CardTitle>Storico Operazioni</CardTitle>
                <CardDescription>Tutte le operazioni di acquisto e vendita registrate</CardDescription>
              </CardHeader>
              <CardContent>
                {tradesWithHoldings.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>Nessuna operazione registrata</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Titolo</TableHead>
                        <TableHead className="text-right">Quantità</TableHead>
                        <TableHead className="text-right">Prezzo</TableHead>
                        <TableHead className="text-right">Commissioni</TableHead>
                        <TableHead className="text-right">Totale</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tradesWithHoldings.map((trade) => (
                        <TableRow key={trade.id} data-testid={`row-trade-${trade.id}`}>
                          <TableCell>
                            {format(parseISO(trade.date), "dd MMM yyyy", { locale: it })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={trade.type === "buy" ? "default" : "secondary"}>
                              {trade.type === "buy" ? "Acquisto" : "Vendita"}
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
            <DialogTitle>Modifica Operazione</DialogTitle>
          </DialogHeader>
          {editingTrade && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{editingTrade.holding?.ticker}</p>
                <p className="text-sm text-muted-foreground">{editingTrade.holding?.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo Operazione</Label>
                  <Select 
                    value={editForm.type} 
                    onValueChange={(value: "buy" | "sell") => setEditForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger data-testid="select-edit-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="buy">Acquisto</SelectItem>
                      <SelectItem value="sell">Vendita</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data</Label>
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
                  <Label>Quantità</Label>
                  <Input
                    type="number"
                    step="0.00000001"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm(prev => ({ ...prev, quantity: e.target.value }))}
                    data-testid="input-edit-quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Prezzo per Unità (EUR)</Label>
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
                <Label>Commissioni (EUR)</Label>
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
                    <span>Totale Operazione:</span>
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
              <Button variant="outline">Annulla</Button>
            </DialogClose>
            <Button 
              onClick={handleUpdateTrade}
              disabled={!editForm.quantity || !editForm.pricePerUnit || updateTradeMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateTradeMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!tradeToDelete} onOpenChange={(open) => !open && setTradeToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Conferma Eliminazione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questa operazione?
              {tradeToDelete && (
                <div className="mt-3 p-3 bg-muted rounded-lg text-foreground">
                  <p className="font-medium">{tradeToDelete.holding?.ticker}</p>
                  <p className="text-sm">
                    {tradeToDelete.type === "buy" ? "Acquisto" : "Vendita"} di {parseFloat(tradeToDelete.quantity).toFixed(4)} unità 
                    a {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(parseFloat(tradeToDelete.pricePerUnit))}
                  </p>
                  <p className="text-sm font-medium mt-1">
                    Totale: {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(parseFloat(tradeToDelete.totalAmount))}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => tradeToDelete && deleteTradeMutation.mutate(tradeToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
