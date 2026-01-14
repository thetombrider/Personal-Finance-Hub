
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Activity, PiggyBank, CreditCard } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface StatsGridProps {
    totalBalance: number;
    totalCash: number;
    totalSavings: number;
    portfolioSummary: any;
    globalMonthlyStats: { income: number; expense: number };
    totalCredit: number;
    creditUsageThisMonth: any;
    accountsCount: number;
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
    setDetailModal: (modal: 'total' | 'cash' | 'savings' | 'investments' | null) => void;
}

export function StatsGrid({
    totalBalance,
    totalCash,
    totalSavings,
    portfolioSummary,
    globalMonthlyStats,
    totalCredit,
    creditUsageThisMonth,
    accountsCount,
    privacyMode,
    formatCurrency,
    setDetailModal
}: StatsGridProps) {

    const displayCurrency = (amount: number) => {
        if (privacyMode) return "•••••";
        return formatCurrency(amount);
    };

    return (
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <Card
                className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailModal('total')}
                data-testid="card-total-balance"
            >
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium whitespace-nowrap">Net Worth</CardTitle>
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold font-heading truncate" title={displayCurrency(totalBalance)}>
                        {displayCurrency(totalBalance)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                        Across {accountsCount} accounts
                    </p>
                </CardContent>
            </Card>

            <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailModal('cash')}
                data-testid="card-total-cash"
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Cash</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold font-heading text-blue-600 dark:text-blue-400 truncate" title={displayCurrency(totalCash)}>
                        {displayCurrency(totalCash)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Cash & Checking</p>
                </CardContent>
            </Card>

            <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailModal('savings')}
                data-testid="card-total-savings"
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0">
                        <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold font-heading text-emerald-600 dark:text-emerald-400 truncate" title={displayCurrency(totalSavings)}>
                        {displayCurrency(totalSavings)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Savings accounts</p>
                </CardContent>
            </Card>

            <Card
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setDetailModal('investments')}
                data-testid="card-total-investments"
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Investments</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                        <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col gap-1">
                        <div>
                            <div className="text-lg font-bold font-heading text-violet-600 dark:text-violet-400 truncate" title={displayCurrency(portfolioSummary?.totalInvested || 0)}>
                                {displayCurrency(portfolioSummary?.totalInvested || 0)}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Invested</p>
                        </div>
                        <div>
                            <div className="text-lg font-bold font-heading text-violet-500 dark:text-violet-300 truncate" title={displayCurrency(portfolioSummary?.totalCurrentValue || 0)}>
                                {displayCurrency(portfolioSummary?.totalCurrentValue || 0)}
                            </div>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Current</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Flow</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                    <div className="flex flex-col gap-1">
                        <div>
                            <div className="text-lg font-bold font-heading text-emerald-600 dark:text-emerald-400 truncate" title={displayCurrency(globalMonthlyStats.income)}>
                                +{displayCurrency(globalMonthlyStats.income)}
                            </div>
                            <div className="flex items-center gap-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Income</p>
                                <ArrowUpRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                            </div>
                        </div>
                        <div>
                            <div className="text-lg font-bold font-heading text-rose-600 dark:text-rose-400 truncate" title={displayCurrency(globalMonthlyStats.expense)}>
                                -{displayCurrency(globalMonthlyStats.expense)}
                            </div>
                            <div className="flex items-center gap-1">
                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Expenses</p>
                                <ArrowDownRight className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Credit Cards</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center shrink-0">
                        <CreditCard className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-lg font-bold font-heading text-rose-600 dark:text-rose-400 truncate" title={displayCurrency(Math.abs(totalCredit))}>
                        {displayCurrency(Math.abs(totalCredit))}
                    </div>
                    {creditUsageThisMonth && creditUsageThisMonth.limit > 0 ? (
                        <div className="mt-2 space-y-1">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Spent</span>
                                <span className="truncate ml-2">{displayCurrency(creditUsageThisMonth.spent)}</span>
                            </div>
                            <Progress
                                value={Math.min(creditUsageThisMonth.percentage, 100)}
                                className={creditUsageThisMonth.percentage > 80 ? "bg-rose-200" : ""}
                            />
                            <div className="text-[10px] text-right text-muted-foreground">
                                of {displayCurrency(creditUsageThisMonth.limit)}
                            </div>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-1">Total Debt</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
