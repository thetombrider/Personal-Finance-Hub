import { useMemo, useCallback } from "react";
import { format, subMonths, startOfMonth, endOfMonth, getYear, parseISO, isSameMonth } from "date-fns";
import { Trade } from "@shared/schema";
import { Account, Transaction, Category } from "@/context/FinanceContext";

interface UseDashboardChartsProps {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    trades: Trade[];
    portfolioSummary: any; // Using any for now or the interface from useDashboardStats if shared
    timeRange: string;
    selectedAccount: string;
    selectedCategory: string;
    categoryTrendId: string;
    currentYearBudget: any;
    previousYearBudget: any;
    currentYear: number;
}

export function useDashboardCharts({
    transactions,
    accounts,
    categories,
    trades,
    portfolioSummary,
    timeRange,
    selectedAccount,
    selectedCategory,
    categoryTrendId,
    currentYearBudget,
    previousYearBudget,
    currentYear
}: UseDashboardChartsProps) {

    // Find transfer category to exclude from income/expense calculations
    const transferCategoryId = useMemo(() =>
        categories.find(c => c.name.toLowerCase() === 'trasferimenti')?.id,
        [categories]
    );

    // Helper to get budget for a specific month, year, and type
    const getMonthlyBudgetTotal = useCallback((monthIndex: number, year: number, type: 'income' | 'expense') => {
        const budgetSource = year === currentYear ? currentYearBudget : (year === currentYear - 1 ? previousYearBudget : null);
        if (!budgetSource || !budgetSource.budgetData) return 0;

        let total = 0;
        categories.forEach(cat => {
            // Filter by type and exclude 'trasferimenti'
            if (cat.type === type && cat.id !== transferCategoryId) {
                const catBudget = budgetSource.budgetData[cat.id];
                if (catBudget && catBudget[monthIndex]) {
                    total += catBudget[monthIndex].total || 0;
                }
            }
        });
        return total;
    }, [categories, currentYearBudget, previousYearBudget, currentYear, transferCategoryId]);

    // Global Monthly Flow (unaffected by filters)
    const globalMonthlyStats = useMemo(() => {
        const currentMonth = new Date();
        return transactions.filter(t => {
            const date = parseISO(t.date);
            const isTransfer = t.categoryId === transferCategoryId;
            return !isTransfer && isSameMonth(date, currentMonth);
        }).reduce((acc, t) => {
            const amount = parseFloat(t.amount.toString()) || 0;
            if (t.type === 'income') acc.income += amount;
            else acc.expense += amount;
            return acc;
        }, { income: 0, expense: 0 });
    }, [transactions, transferCategoryId]);

    // Prepare chart data (excluding transfers)
    const chartData = useMemo(() => {
        const months = parseInt(timeRange);
        const data = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);

            const monthTx = transactions.filter(t => {
                const tDate = parseISO(t.date);
                const isTransfer = t.categoryId === transferCategoryId;
                const matchesCategory = selectedCategory === "all" || t.categoryId === parseInt(selectedCategory);
                return !isTransfer && tDate >= monthStart && tDate <= monthEnd &&
                    (selectedAccount === "all" || t.accountId === parseInt(selectedAccount)) &&
                    matchesCategory;
            });

            const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);
            const expense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);

            data.push({
                name: format(date, 'MMM'),
                income,
                expense,
                net: income - expense
            });
        }
        return data;
    }, [transactions, timeRange, selectedAccount, selectedCategory, transferCategoryId]);

    // Category data (excluding transfers) - filtered by time range
    const categoryData = useMemo(() => {
        const months = parseInt(timeRange);
        const startDate = startOfMonth(subMonths(new Date(), months - 1));
        const endDate = endOfMonth(new Date());

        const expenseTx = transactions.filter(t => {
            const tDate = parseISO(t.date);
            return t.type === 'expense' &&
                t.categoryId !== transferCategoryId &&
                (selectedAccount === "all" || t.accountId === parseInt(selectedAccount)) &&
                tDate >= startDate && tDate <= endDate;
        });
        const catMap = new Map<string, number>();

        expenseTx.forEach(t => {
            const cat = categories.find(c => c.id === t.categoryId);
            if (cat) {
                const current = catMap.get(cat.name) || 0;
                catMap.set(cat.name, current + (parseFloat(t.amount.toString()) || 0));
            }
        });

        return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
    }, [transactions, selectedAccount, categories, transferCategoryId, timeRange]);

    // Net Worth evolution over time
    const netWorthData = useMemo(() => {
        const months = parseInt(timeRange);
        const data = [];

        // Calculate starting balance (sum of all account starting balances)
        const totalStartingBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.startingBalance.toString()), 0);

        // Get all transactions sorted by date
        const sortedTransactions = [...transactions].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        // Get all trades sorted by date
        const sortedTrades = [...trades].sort((a, b) =>
            new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthEnd = endOfMonth(date);

            // Calculate net worth at end of this month
            // = starting balance + all income - all expenses up to this month
            let netWorth = totalStartingBalance;

            sortedTransactions.forEach(t => {
                const tDate = parseISO(t.date);
                if (tDate <= monthEnd) {
                    const amount = parseFloat(t.amount.toString()) || 0;
                    if (t.type === 'income') {
                        netWorth += amount;
                    } else {
                        netWorth -= amount;
                    }
                }
            });

            // Add invested amount (Cost Basis)
            // Buys are expenses, so they reduced the 'netWorth' (Cash) above.
            // We add them back here as Assets.
            let investedAmount = 0;
            sortedTrades.forEach(t => {
                const tDate = new Date(t.date); // trades have ISO string dates
                if (tDate <= monthEnd) {
                    const amount = parseFloat(t.totalAmount.toString());
                    if (t.type === 'buy') {
                        investedAmount += amount;
                    } else {
                        investedAmount -= amount;
                    }
                }
            });

            netWorth += investedAmount;

            data.push({
                name: format(date, 'MMM yy'),
                netWorth
            });
        }
        return data;
    }, [transactions, accounts, timeRange, trades]);

    // Category trend data (monthly totals for selected category)
    const selectedCategoryForTrend = useMemo(() =>
        categories.find(c => c.id === parseInt(categoryTrendId)),
        [categories, categoryTrendId]
    );

    const categoryTrendData = useMemo(() => {
        if (!categoryTrendId || !selectedCategoryForTrend) return [];

        const months = parseInt(timeRange);
        const data = [];
        const catId = parseInt(categoryTrendId);
        const categoryType = selectedCategoryForTrend.type;

        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const year = getYear(date);
            const monthIndex = date.getMonth() + 1; // 1-12

            // Determine which budget data to use
            let monthlyBudget = 0;
            const budgetSource = year === currentYear ? currentYearBudget : (year === currentYear - 1 ? previousYearBudget : null);

            if (budgetSource && budgetSource.budgetData && budgetSource.budgetData[catId] && budgetSource.budgetData[catId][monthIndex]) {
                monthlyBudget = budgetSource.budgetData[catId][monthIndex].total || 0;
            }

            const monthTotal = transactions
                .filter(t => {
                    const tDate = parseISO(t.date);
                    return t.categoryId === catId &&
                        t.type === categoryType &&
                        tDate >= monthStart &&
                        tDate <= monthEnd &&
                        (selectedAccount === "all" || t.accountId === parseInt(selectedAccount));
                })
                .reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);

            data.push({
                name: format(date, 'MMM yy'),
                total: monthTotal,
                budget: monthlyBudget,
                overBudget: monthlyBudget > 0 && monthTotal > monthlyBudget
            });
        }
        return data;
    }, [transactions, categoryTrendId, timeRange, selectedAccount, selectedCategoryForTrend, currentYearBudget, previousYearBudget, currentYear]);

    // Budget vs Actual Expenses (Global)
    const budgetExpenseComparisonData = useMemo(() => {
        const months = parseInt(timeRange);
        const data = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const year = getYear(date);
            const monthIndex = date.getMonth() + 1; // 1-12

            // Actual Expenses
            const actual = transactions.filter(t => {
                const tDate = parseISO(t.date);
                const isTransfer = t.categoryId === transferCategoryId;
                const matchesCategory = selectedCategory === "all" || t.categoryId === parseInt(selectedCategory);
                return !isTransfer && t.type === 'expense' && tDate >= monthStart && tDate <= monthEnd &&
                    (selectedAccount === "all" || t.accountId === parseInt(selectedAccount)) &&
                    matchesCategory;
            }).reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);

            // Budget
            let budget = 0;
            if (selectedCategory !== "all") {
                const catId = parseInt(selectedCategory);
                const budgetSource = year === currentYear ? currentYearBudget : (year === currentYear - 1 ? previousYearBudget : null);
                if (budgetSource && budgetSource.budgetData && budgetSource.budgetData[catId] && budgetSource.budgetData[catId][monthIndex]) {
                    budget = budgetSource.budgetData[catId][monthIndex].total || 0;
                }
            } else {
                budget = getMonthlyBudgetTotal(monthIndex, year, 'expense');
            }

            data.push({
                name: format(date, 'MMM'),
                budget,
                actual
            });
        }
        return data;
    }, [transactions, timeRange, selectedAccount, selectedCategory, getMonthlyBudgetTotal, transferCategoryId, currentYearBudget, previousYearBudget, currentYear]);

    // Budget vs Actual Income (Global)
    const budgetIncomeComparisonData = useMemo(() => {
        const months = parseInt(timeRange);
        const data = [];

        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);
            const year = getYear(date);
            const monthIndex = date.getMonth() + 1; // 1-12

            // Actual Income
            const actual = transactions.filter(t => {
                const tDate = parseISO(t.date);
                const isTransfer = t.categoryId === transferCategoryId;
                const matchesCategory = selectedCategory === "all" || t.categoryId === parseInt(selectedCategory);

                return !isTransfer && t.type === 'income' && tDate >= monthStart && tDate <= monthEnd &&
                    (selectedAccount === "all" || t.accountId === parseInt(selectedAccount)) &&
                    matchesCategory;
            }).reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);

            // Budget
            let budget = 0;
            if (selectedCategory !== "all") {
                const catId = parseInt(selectedCategory);
                const cat = categories.find(c => c.id === catId);
                if (cat && cat.type === 'income') {
                    const budgetSource = year === currentYear ? currentYearBudget : (year === currentYear - 1 ? previousYearBudget : null);
                    if (budgetSource && budgetSource.budgetData && budgetSource.budgetData[catId] && budgetSource.budgetData[catId][monthIndex]) {
                        budget = budgetSource.budgetData[catId][monthIndex].total || 0;
                    }
                }
            } else {
                budget = getMonthlyBudgetTotal(monthIndex, year, 'income');
            }

            data.push({
                name: format(date, 'MMM'),
                budget,
                actual
            });
        }
        return data;
    }, [transactions, timeRange, selectedAccount, selectedCategory, getMonthlyBudgetTotal, transferCategoryId, categories, currentYearBudget, previousYearBudget, currentYear]);

    // Net Worth by account type with Investment Gain/Loss split
    const netWorthByTypeData = useMemo(() => {
        const typeMap = new Map<string, { value: number; gain: number; loss: number; invested: number }>();
        const typeLabels: Record<string, string> = {
            'checking': 'Checking',
            'savings': 'Savings',
            'credit': 'Credit',
            'investment': 'Investments',
            'cash': 'Cash'
        };

        // Initialize map
        Object.values(typeLabels).forEach(label => {
            typeMap.set(label, { value: 0, gain: 0, loss: 0, invested: 0 });
        });

        // Process non-investment accounts
        accounts.forEach(acc => {
            if (acc.type === 'investment') return;

            let label = typeLabels[acc.type];
            if (!label) {
                // Fallback for unknown types
                label = acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
                if (!typeMap.has(label)) {
                    typeMap.set(label, { value: 0, gain: 0, loss: 0, invested: 0 });
                }
            }

            const current = typeMap.get(label)!;
            current.value += Number(acc.balance);
        });

        // Process investments using portfolio summary
        const invLabel = typeLabels['investment'];
        const invStats = typeMap.get(invLabel)!;

        if (portfolioSummary) {
            const invested = portfolioSummary.totalInvested;
            const current = portfolioSummary.totalCurrentValue;
            invStats.invested = invested;
            invStats.value = current; // Total value for sorting/display

            if (current >= invested) {
                // Find gain
                invStats.gain = current - invested;
                invStats.value = invested; // Base bar is invested amount
            } else {
                // Find loss
                invStats.loss = invested - current;
                invStats.value = current; // Base bar is current value
            }
        }

        return Array.from(typeMap.entries())
            .map(([name, stats]) => {
                return {
                    name,
                    base: stats.value,
                    gain: stats.gain,
                    loss: stats.loss,
                    totalDisplay: name === 'Investments' && portfolioSummary ? portfolioSummary.totalCurrentValue : stats.value
                };
            })
            .filter(item => item.base > 0 || item.gain > 0 || item.loss > 0)
            .sort((a, b) => {
                // Sort by total magnitude
                const valA = a.base + a.gain + a.loss;
                const valB = b.base + b.gain + b.loss;
                return Math.abs(valB) - Math.abs(valA);
            });
    }, [accounts, portfolioSummary]);

    return {
        globalMonthlyStats,
        chartData,
        categoryData,
        netWorthData,
        categoryTrendData,
        budgetExpenseComparisonData,
        budgetIncomeComparisonData,
        netWorthByTypeData,
        selectedCategoryForTrend
    };
}
