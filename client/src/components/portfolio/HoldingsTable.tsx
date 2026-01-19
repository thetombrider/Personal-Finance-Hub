import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PiggyBank, Pencil } from "lucide-react";
import type { HoldingWithStats } from "@/hooks/usePortfolioStats";

interface HoldingsTableProps {
    holdingsWithStats: HoldingWithStats[];
    onSelectHolding: (holding: HoldingWithStats) => void;
    onEditHolding?: (holding: HoldingWithStats) => void;
}

export function HoldingsTable({ holdingsWithStats, onSelectHolding, onEditHolding }: HoldingsTableProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    return (
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
                                <TableHead className="w-[50px]"></TableHead>
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
                                    onClick={() => onSelectHolding(holding)}
                                >
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary z-10"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEditHolding?.(holding);
                                            }}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
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
    );
}
