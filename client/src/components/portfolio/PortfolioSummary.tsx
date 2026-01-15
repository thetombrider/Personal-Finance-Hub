import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { PortfolioSummary as PortfolioSummaryType } from "@/hooks/usePortfolioStats";

interface PortfolioSummaryProps {
    portfolioSummary: PortfolioSummaryType;
}

export function PortfolioSummary({ portfolioSummary }: PortfolioSummaryProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    return (
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
    );
}
