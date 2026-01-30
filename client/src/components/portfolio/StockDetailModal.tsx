import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError } from "@/lib/toastHelpers";
import * as api from "@/lib/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ComposedChart
} from "recharts";
import { format, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import type { Holding, Trade } from "@shared/schema";
import { useTradeMutations } from "@/hooks/mutations";


interface StockDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  holding: Omit<Holding, 'currentPrice'> & {
    totalQuantity: number;
    totalInvested: number;
    averagePrice: number;
    currentPrice: number | null;
    currentValue: number | null;
    gainLoss: number | null;
    gainLossPercent: number | null;
  };
  trades: Trade[];
  initialIsEditing?: boolean;
}

export function StockDetailModal({
  isOpen,
  onClose,
  holding,
  trades,
  initialIsEditing = false,
}: StockDetailModalProps) {
  const [isEditing, setIsEditing] = useState(initialIsEditing);
  const [ticker, setTicker] = useState(holding.ticker);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setIsEditing(initialIsEditing);
  }, [initialIsEditing, isOpen]);

  useEffect(() => {
    setTicker(holding.ticker);
  }, [holding.ticker]);

  /*
  const updateHoldingMutation = useMutation({
    mutationFn: (newTicker: string) => api.updateHolding(holding.id, { ticker: newTicker }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["holdings"] });
      queryClient.invalidateQueries({ queryKey: ["trades"] }); 
      queryClient.invalidateQueries({ queryKey: ["transactions"] }); 
      toast({ title: "Holding updated", description: "Ticker updated successfully." });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating holding",
        description: error.message,
        variant: "destructive"
      });
    },
  });
  */

  const { updateHolding } = useTradeMutations();

  const handleSave = () => {
    if (!ticker.trim()) return;
    updateHolding.mutate({ id: holding.id, ticker: ticker.toUpperCase() }, {
      onSuccess: () => {
        showSuccess(toast, "Holding updated", "Ticker updated successfully.");
        setIsEditing(false);
      },
      onError: (error) => {
        showError(toast, "Error updating holding", error.message);
      }
    });
  };


  const handleCancel = () => {
    setTicker(holding.ticker);
    setIsEditing(false);
  };

  const chartData = useMemo(() => {
    // Sort trades by date
    const sortedTrades = [...trades].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulativeQuantity = 0;
    let cumulativeInvested = 0;
    const dataPoints: any[] = [];

    sortedTrades.forEach((trade) => {
      const qty = parseFloat(trade.quantity);
      const price = parseFloat(trade.pricePerUnit);
      const total = parseFloat(trade.totalAmount); // This might include fees, but for PMC usually we consider purchase price + fees or just purchase price depending on tax logic.
      // In the main page logic: totalInvested += amount.
      // Let's stick to the logic used in Portfolio.tsx for consistency.

      if (trade.type === "buy") {
        cumulativeQuantity += qty;
        cumulativeInvested += total;
      } else {
        // For sell, standard PMC calculation methods vary (FIFO, LIFO, Weighted Average).
        // Weighted Average usually doesn't change on sell if we just reduce quantity proportionally.
        // However, if we track "Total Invested" as absolute amount spent, it decreases.
        // Let's mirror the simple logic: totalInvested -= amount.
        // But for PMC history: PMC = Invested / Quantity.
        cumulativeQuantity -= qty;
        cumulativeInvested -= total;
      }

      const currentPMC = cumulativeQuantity > 0 ? cumulativeInvested / cumulativeQuantity : 0;

      dataPoints.push({
        date: trade.date,
        purchasePrice: trade.type === 'buy' ? price : null, // Only plot buys as points maybe? Or both?
        sellPrice: trade.type === 'sell' ? price : null,
        pmc: currentPMC,
        type: trade.type,
        quantity: qty,
      });
    });

    return dataPoints;
  }, [trades]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(val);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mr-8">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Input
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-32 font-bold text-xl uppercase"
                  autoFocus
                />
                <Button size="icon" variant="ghost" onClick={handleSave} disabled={updateHolding.isPending}>
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button size="icon" variant="ghost" onClick={handleCancel}>
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group">
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-bold text-xl">{holding.ticker}</span>
                  <span className="text-muted-foreground font-normal text-base">
                    {holding.name}
                  </span>
                </DialogTitle>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-3 w-3 text-muted-foreground" />
                </Button>
              </div>
            )}
          </div>
          <div className="text-sm text-muted-foreground mt-1">Detailed view of your holding and trade history.</div>
        </DialogHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Quantità Totale
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">
                {holding.totalQuantity.toFixed(4)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                PMC
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">
                {formatCurrency(holding.averagePrice)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valore Attuale
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">
                {holding.currentValue
                  ? formatCurrency(holding.currentValue)
                  : "—"}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Gain/Loss
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div
                className={`text-2xl font-bold ${(holding.gainLoss || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
                  }`}
              >
                {holding.gainLoss
                  ? ((holding.gainLoss >= 0 ? "+" : "") + formatCurrency(holding.gainLoss))
                  : "—"}
              </div>
              {holding.gainLossPercent !== null && (
                <p
                  className={`text-xs ${holding.gainLossPercent >= 0
                    ? "text-green-600"
                    : "text-red-600"
                    }`}
                >
                  {holding.gainLossPercent >= 0 ? "+" : ""}
                  {holding.gainLossPercent.toFixed(2)}%
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="h-[400px] w-full mt-6">
          <h3 className="text-lg font-semibold mb-4">Andamento Prezzi e Acquisti</h3>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => format(parseISO(date), "MMM yy", { locale: it })}
                minTickGap={30}
              />
              <YAxis domain={['auto', 'auto']} tickFormatter={(val) => `€${val}`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-md">
                        <p className="font-semibold mb-2">
                          {format(parseISO(label), "d MMM yyyy", { locale: it })}
                        </p>
                        {data.type && (
                          <p className={`text-sm ${data.type === 'buy' ? 'text-green-600' : 'text-red-600'}`}>
                            {data.type === 'buy' ? 'Acquisto' : 'Vendita'}: {formatCurrency(data.purchasePrice || data.sellPrice)}
                          </p>
                        )}
                        <p className="text-sm text-blue-500">
                          PMC Storico: {formatCurrency(data.pmc)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              {/* PMC Line */}
              <Line
                type="stepAfter"
                dataKey="pmc"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="PMC Storico"
              />
              {/* Purchase Points */}
              <Scatter
                dataKey="purchasePrice"
                fill="#22c55e"
                name="Acquisti"
                shape="circle"
              />
              {/* Sell Points */}
              <Scatter
                dataKey="sellPrice"
                fill="#ef4444"
                name="Vendite"
                shape="triangle"
              />

              {/* Current PMC Reference Line */}
              <ReferenceLine y={holding.averagePrice} label="PMC Attuale" stroke="#9ca3af" strokeDasharray="3 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}
