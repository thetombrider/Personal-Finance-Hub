import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { format } from "date-fns";
import type { Holding, Account } from "@shared/schema";

interface AddTradeModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    accounts: Account[];
    holdings: Holding[];
    defaultType?: "buy" | "sell";
}

export function AddTradeModal({ isOpen, onOpenChange, accounts, holdings, defaultType = "buy" }: AddTradeModalProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const [entryMode, setEntryMode] = useState<"search" | "manual">("manual");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<api.StockSearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedStock, setSelectedStock] = useState<api.StockSearchResult | null>(null);
    const [currentQuote, setCurrentQuote] = useState<api.StockQuote | null>(null);
    const [isLoadingQuote, setIsLoadingQuote] = useState(false);
    const [manualTicker, setManualTicker] = useState("");
    const [manualName, setManualName] = useState("");
    const [showHoldingsDropdown, setShowHoldingsDropdown] = useState(false);

    const [tradeForm, setTradeForm] = useState({
        quantity: "",
        pricePerUnit: "",
        fees: "0",
        date: format(new Date(), "yyyy-MM-dd"),
        type: defaultType,
        accountId: ""
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
            type: defaultType,
            accountId: ""
        });
    };

    useEffect(() => {
        if (!isOpen) {
            resetTradeForm();
        } else {
            // Ensure type is updated if modal is kept open (unlikely but good practice)
            // or just rely on resetTradeForm being called on next open.
            // Actually better to just set the type when it opens.
            setTradeForm(prev => ({ ...prev, type: defaultType }));
        }
    }, [isOpen, defaultType]);

    const createHoldingMutation = useMutation({
        mutationFn: api.createHolding,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["holdings"] }),
    });

    const createTradeMutation = useMutation({
        mutationFn: api.createTrade,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["trades"] });
            queryClient.invalidateQueries({ queryKey: ["transactions"] });
            queryClient.invalidateQueries({ queryKey: ["accounts"] });
            queryClient.invalidateQueries({ queryKey: ["portfolio-stats"] }); // Also refresh portfolio stats
            toast({ title: "Purchase registered", description: "The transaction was saved successfully." });
            onOpenChange(false);
        },
        onError: () => {
            toast({ title: "Error", description: "Could not save transaction.", variant: "destructive" });
        },
    });

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

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
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
    );
}
