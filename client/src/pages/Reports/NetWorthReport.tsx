import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, endOfMonth, parseISO, getYear, getMonth, lastDayOfMonth } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Layout from "@/components/Layout";
import { useFinance } from "@/context/FinanceContext";
import { usePortfolioStats } from "@/hooks/usePortfolioStats";

export default function NetWorthReport() {
    const { accounts, transactions, formatCurrency, isLoading: isFinanceLoading } = useFinance();
    const { trades, isLoading: isPortfolioLoading } = usePortfolioStats();

    // State for filter
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<string>(currentYear.toString());

    // Get available years from data
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        years.add(currentYear);

        transactions.forEach(t => {
            years.add(getYear(parseISO(t.date)));
        });

        trades.forEach(t => {
            years.add(getYear(new Date(t.date)));
        });

        return Array.from(years).sort((a, b) => b - a);
    }, [transactions, trades, currentYear]);

    // Calculate report data
    const reportData = useMemo(() => {
        const year = parseInt(selectedYear);
        const isCurrentYear = year === currentYear;
        const months = isCurrentYear ? new Date().getMonth() + 1 : 12;

        const data = [];

        // Calculate starting balances for all accounts
        const accountStartingBalances = new Map<number, number>();
        accounts.forEach(acc => {
            accountStartingBalances.set(acc.id, parseFloat(acc.startingBalance?.toString() || "0"));
        });

        const sortedTransactions = [...transactions].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        const sortedTrades = [...trades].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Iterate through each month of the selected year
        for (let monthIndex = 0; monthIndex < months; monthIndex++) {
            const date = endOfMonth(new Date(year, monthIndex));

            // Calculate balances up to this date
            let totalCash = 0;
            let totalSavings = 0;
            let totalDebt = 0;
            let totalInvestmentsCash = 0;
            let totalInvestedValue = 0;

            // 1. Calculate Account Balances
            // Initialize with starting balances
            const currentAccountBalances = new Map(accountStartingBalances);

            // Apply all transactions up to this date
            sortedTransactions.forEach(t => {
                const tDate = parseISO(t.date);
                if (tDate <= date) {
                    const amount = parseFloat(t.amount.toString()) || 0;
                    const currentBal = currentAccountBalances.get(t.accountId) || 0;

                    if (t.type === 'income') {
                        currentAccountBalances.set(t.accountId, currentBal + amount);
                    } else {
                        currentAccountBalances.set(t.accountId, currentBal - amount);
                    }
                }
            });

            // Sum up balances by type
            accounts.forEach(acc => {
                const bal = currentAccountBalances.get(acc.id) || 0;
                if (acc.type === 'checking' || acc.type === 'cash') {
                    totalCash += bal;
                } else if (acc.type === 'savings') {
                    totalSavings += bal;
                } else if (acc.type === 'credit') {
                    totalDebt += bal;
                } else if (acc.type === 'investment') {
                    totalInvestmentsCash += bal;
                }
            });

            // 2. Calculate Invested Amount (Cost Basis) from Trades
            sortedTrades.forEach(t => {
                const tDate = new Date(t.date);
                if (tDate <= date) {
                    const amount = parseFloat(t.totalAmount.toString());
                    if (t.type === 'buy') {
                        totalInvestedValue += amount;
                    } else {
                        totalInvestedValue -= amount;
                    }
                }
            });

            const totalInvestments = totalInvestmentsCash + totalInvestedValue;
            const totalNetWorth = totalCash + totalSavings + totalDebt + totalInvestments;

            data.push({
                monthLabel: format(date, 'MMM'),
                fullDate: date,
                netWorth: totalNetWorth,
                cash: totalCash,
                savings: totalSavings,
                investments: totalInvestments,
                debt: totalDebt
            });
        }

        // Return reversed to show latest month on top? Or Jan to Dec? 
        // Typically reports are Jan -> Dec (chronological) or Dec -> Jan (reverse chronological).
        // Let's stick to chronological (Jan -> Dec) as it's a "History" table.
        return data;
    }, [selectedYear, currentYear, accounts, transactions, trades]);

    if (isFinanceLoading || isPortfolioLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-heading font-bold text-foreground">Net Worth History</h1>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select Year" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableYears.map(year => (
                                <SelectItem key={year} value={year.toString()}>
                                    {year}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <Card className="overflow-hidden">
                    <CardContent className="p-0">
                        <ScrollArea className="w-full">
                            <div className="min-w-[800px]">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[100px]">Month</TableHead>
                                            <TableHead className="text-right">Total Net Worth</TableHead>
                                            <TableHead className="text-right">Total Cash</TableHead>
                                            <TableHead className="text-right">Total Savings</TableHead>
                                            <TableHead className="text-right">Total Investments</TableHead>
                                            <TableHead className="text-right">Total Debt</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {reportData.map((row) => (
                                            <TableRow key={row.monthLabel}>
                                                <TableCell className="font-medium">{row.monthLabel}</TableCell>
                                                <TableCell className={`text-right font-bold ${row.netWorth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {formatCurrency(row.netWorth)}
                                                </TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.cash)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.savings)}</TableCell>
                                                <TableCell className="text-right">{formatCurrency(row.investments)}</TableCell>
                                                <TableCell className={`text-right ${row.debt < 0 ? 'text-rose-600' : ''}`}>
                                                    {formatCurrency(row.debt)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
