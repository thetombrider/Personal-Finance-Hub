
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface AccountBalance {
    id: number;
    name: string;
    balance: number;
    type: string;
}

interface CategoryData {
    total: number;
    accounts: AccountBalance[];
}

export interface BalanceSheetResponse {
    assets: {
        cash: CategoryData;
        savings: CategoryData;
        investments: CategoryData;
        total: number;
    };
    liabilities: {
        creditCards: CategoryData;
        total: number;
    };
    equity: {
        netWorth: number;
    };
}

function AccountList({ accounts, colorClass = "text-muted-foreground" }: { accounts: AccountBalance[], colorClass?: string }) {
    if (!accounts || accounts.length === 0) return null;

    return (
        <div className="pl-4 space-y-2 mt-2 mb-4 border-l-2 border-muted/50 ml-2">
            {accounts.map(account => (
                <div key={account.id} className="flex justify-between items-center text-sm">
                    <span className={cn("text-muted-foreground", colorClass)}>{account.name}</span>
                    <span className={cn("font-mono", colorClass)}>{formatCurrency(account.balance)}</span>
                </div>
            ))}
        </div>
    );
}

export function BalanceSheet() {
    const { data, isLoading, error } = useQuery<BalanceSheetResponse>({
        queryKey: ["reports", "balance-sheet"],
        queryFn: async () => {
            const res = await fetch("/api/reports/balance-sheet");
            if (!res.ok) throw new Error("Failed to fetch balance sheet");
            return res.json();
        }
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">
            {error instanceof Error ? error.message : String(error)}
        </div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Balance Sheet</CardTitle>
                    <CardDescription>Current financial position: Assets vs Liabilities</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Assets side */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold text-green-700">Assets</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                        <span className="font-medium">Liquidity (Cash + Checking)</span>
                                        <span>{formatCurrency(data.assets.cash.total)}</span>
                                    </div>
                                    <AccountList accounts={data.assets.cash.accounts} />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                        <span className="font-medium">Savings</span>
                                        <span>{formatCurrency(data.assets.savings.total)}</span>
                                    </div>
                                    <AccountList accounts={data.assets.savings.accounts} />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                        <span className="font-medium">Investments</span>
                                        <span>{formatCurrency(data.assets.investments.total)}</span>
                                    </div>
                                    <AccountList accounts={data.assets.investments.accounts} />
                                </div>

                                <Separator />
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg font-bold text-lg text-green-800">
                                    <span>Total Assets</span>
                                    <span>{formatCurrency(data.assets.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Liabilities & Equity side */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold text-red-700">Liabilities & Net Worth</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Liabilities</h4>
                                    <div>
                                        <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                            <span className="font-medium">Credit Cards</span>
                                            <span>{formatCurrency(data.liabilities.creditCards.total)}</span>
                                        </div>
                                        <AccountList accounts={data.liabilities.creditCards.accounts} colorClass="text-red-600/70" />
                                    </div>

                                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg font-bold text-red-800">
                                        <span>Total Liabilities</span>
                                        <span>{formatCurrency(data.liabilities.total)}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Net Worth (Equity)</h4>
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg font-bold text-blue-800 text-lg">
                                        <span>Net Worth</span>
                                        <span>{formatCurrency(data.equity.netWorth)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center pt-1">
                                        (Assets - Liabilities)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

