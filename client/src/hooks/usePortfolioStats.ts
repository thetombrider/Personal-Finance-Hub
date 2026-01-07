import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import * as api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Holding } from "@shared/schema";

export interface HoldingWithStats extends Omit<Holding, 'currentPrice'> {
    totalQuantity: number;
    totalInvested: number;
    averagePrice: number;
    currentPrice: number | null;
    currentValue: number | null;
    gainLoss: number | null;
    gainLossPercent: number | null;
}

export function usePortfolioStats() {
    const [quotes, setQuotes] = useState<Record<string, { price: number; change: number; changePercent: string }>>({});
    const [isRefreshingQuotes, setIsRefreshingQuotes] = useState(false);

    const { data: holdings = [], isLoading: holdingsLoading } = useQuery({
        queryKey: ["holdings"],
        queryFn: api.fetchHoldings,
    });

    const { data: trades = [], isLoading: tradesLoading } = useQuery({
        queryKey: ["trades"],
        queryFn: api.fetchTrades,
    });

    const { toast } = useToast();

    const refreshQuotes = async (isManual: boolean = false) => {
        if (holdings.length === 0) return;
        setIsRefreshingQuotes(true);
        try {
            const symbols = holdings.map(h => h.ticker);
            const newQuotes = await api.fetchBatchQuotes(symbols);
            setQuotes(newQuotes);

            if (isManual) {
                const cachedCount = Object.values(newQuotes).filter(q => q.cached).length;
                if (cachedCount > 0) {
                    toast({
                        title: "Prezzi aggiornati",
                        description: `Recuperati ${cachedCount} prezzi dalla cache locale (validi 24h).`,
                    });
                } else {
                    toast({
                        title: "Prezzi aggiornati",
                        description: "I prezzi sono stati scaricati in tempo reale.",
                    });
                }
            }
        } catch (error) {
            console.error("Failed to refresh quotes:", error);
            if (isManual) {
                toast({
                    title: "Errore",
                    description: "Impossibile aggiornare i prezzi.",
                    variant: "destructive"
                });
            }
        } finally {
            setIsRefreshingQuotes(false);
        }
    };

    useEffect(() => {
        if (holdings.length > 0 && Object.keys(quotes).length === 0) {
            refreshQuotes();
        }
    }, [holdings.length]);

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
            // Use quote price if available (fresh), otherwise fall back to persisted price
            const currentPrice = quote?.price || (holding.currentPrice ? parseFloat(holding.currentPrice.toString()) : null);

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
                lastPriceUpdate: holding.lastPriceUpdate
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

    return {
        holdings,
        trades,
        holdingsWithStats,
        portfolioSummary,
        quotes,
        refreshQuotes,
        isRefreshingQuotes,
        isLoading: holdingsLoading || tradesLoading
    };
}
