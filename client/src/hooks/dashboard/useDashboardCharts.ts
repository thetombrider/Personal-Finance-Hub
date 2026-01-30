import { useMemo, useCallback } from "react";
import { format, subMonths, startOfMonth, endOfMonth, getYear, parseISO, isSameMonth, getDaysInMonth, getDate } from "date-fns";
import { Trade } from "@shared/schema";
import { Account, Transaction, Category } from "@/context/FinanceContext";
import type { PortfolioSummary, YearlyBudget } from "@/types/charts";

interface UseDashboardChartsProps {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    trades: Trade[];
    portfolioSummary: PortfolioSummary | null;
    categoryTrendId: string;
    currentYearBudget: YearlyBudget | null | undefined;
    previousYearBudget: YearlyBudget | null | undefined;
    nextYearBudget: YearlyBudget | null | undefined;
    currentYear: number;
    totalBalance: number;
}

export function useDashboardCharts({
    transactions,
    accounts,
    categories,
    trades,
    portfolioSummary,
    categoryTrendId,
    currentYearBudget,
    previousYearBudget,
    nextYearBudget,
    currentYear,
    totalBalance
}: UseDashboardChartsProps) {

    // Find transfer category to exclude from income/expense calculations
    const transferCategoryId = useMemo(() =>
        categories.find(c => c.name.toLowerCase() === 'trasferimenti')?.id,
        [categories]
    );

    // Helper to get budget for a specific month, year, and type
    const getMonthlyBudgetTotal = useCallback((monthIndex: number, year: number, type: 'income' | 'expense') => {
        const budgetSource = year === currentYear ? currentYearBudget : (year === currentYear - 1 ? previousYearBudget : (year === currentYear + 1 ? nextYearBudget : null));
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
        const months = 12;
        const data = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            const monthStart = startOfMonth(date);
            const monthEnd = endOfMonth(date);

            const monthTx = transactions.filter(t => {
                const tDate = parseISO(t.date);
                const isTransfer = t.categoryId === transferCategoryId;
                return !isTransfer && tDate >= monthStart && tDate <= monthEnd;
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
    }, [transactions, transferCategoryId]);

    // Category data (excluding transfers) - filtered by time range (fixed to 12 months)
    const categoryData = useMemo(() => {
        const months = 12;
        const startDate = startOfMonth(subMonths(new Date(), months - 1));
        const endDate = endOfMonth(new Date());

        const expenseTx = transactions.filter(t => {
            const tDate = parseISO(t.date);
            return t.type === 'expense' &&
                t.categoryId !== transferCategoryId &&
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
    }, [transactions, categories, transferCategoryId]);

    // Net Worth evolution over time
    const netWorthData = useMemo(() => {
        const months = 12;
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
    }, [transactions, accounts, trades]);

    // Category trend data (monthly totals for selected category)
    const selectedCategoryForTrend = useMemo(() =>
        categories.find(c => c.id === parseInt(categoryTrendId)),
        [categories, categoryTrendId]
    );

    const categoryTrendData = useMemo(() => {
        if (!categoryTrendId || !selectedCategoryForTrend) return [];

        const months = 12;
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
                        tDate <= monthEnd;
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
    }, [transactions, categoryTrendId, selectedCategoryForTrend, currentYearBudget, previousYearBudget, currentYear]);

    // Budget vs Actual Expenses (Global)
    const budgetExpenseComparisonData = useMemo(() => {
        const months = 12;
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
                return !isTransfer && t.type === 'expense' && tDate >= monthStart && tDate <= monthEnd;
            }).reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);

            // Budget
            let budget = getMonthlyBudgetTotal(monthIndex, year, 'expense');

            data.push({
                name: format(date, 'MMM'),
                budget,
                actual
            });
        }
        return data;
    }, [transactions, getMonthlyBudgetTotal, transferCategoryId, currentYearBudget, previousYearBudget, currentYear]);

    // Budget vs Actual Income (Global)
    const budgetIncomeComparisonData = useMemo(() => {
        const months = 12;
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

                return !isTransfer && t.type === 'income' && tDate >= monthStart && tDate <= monthEnd;
            }).reduce((sum, t) => sum + (parseFloat(t.amount.toString()) || 0), 0);

            // Budget
            let budget = getMonthlyBudgetTotal(monthIndex, year, 'income');

            data.push({
                name: format(date, 'MMM'),
                budget,
                actual
            });
        }
        return data;
    }, [transactions, getMonthlyBudgetTotal, transferCategoryId, categories, currentYearBudget, previousYearBudget, currentYear]);

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
            .filter(item => item.base !== 0 || item.gain !== 0 || item.loss !== 0)
            .sort((a, b) => {
                // Sort by total magnitude
                const valA = a.base + a.gain + a.loss;
                const valB = b.base + b.gain + b.loss;
                return Math.abs(valB) - Math.abs(valA);
            });
    }, [accounts, portfolioSummary]);

    // Net Worth projection for the next 12 months
    const netWorthProjectionData = useMemo(() => {
        const data = [];
        const today = new Date();

        // Start from current actual Net Worth
        let accumulatedNetWorth = totalBalance;

        // Point 0: Current Status
        data.push({
            name: "Start",
            netWorth: accumulatedNetWorth
        });

        // Loop 12 months ahead starting from CURRENT month
        for (let i = 0; i < 12; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const year = date.getFullYear();
            const monthIndex = date.getMonth() + 1; // 1-12

            const budgetedIncome = getMonthlyBudgetTotal(monthIndex, year, 'income');
            const budgetedExpense = getMonthlyBudgetTotal(monthIndex, year, 'expense');
            const monthlyNet = budgetedIncome - budgetedExpense;

            if (i === 0) {
                // For current month, apply only the remaining portion (pro rata)
                const daysInMonth = getDaysInMonth(today);
                const currentDay = getDate(today);
                const remainingDays = Math.max(0, daysInMonth - currentDay);
                const ratio = remainingDays / daysInMonth;

                accumulatedNetWorth += monthlyNet * ratio;
            } else {
                // Future months get full budget impact
                accumulatedNetWorth += monthlyNet;
            }

            data.push({
                name: format(date, 'MMM yy'),
                netWorth: accumulatedNetWorth
            });
        }

        return data;
    }, [accounts, getMonthlyBudgetTotal, totalBalance]);

    // Sankey Data - By Category (Net Flow)
    // Sankey Data - By Category (Net Flow)
    const sankeyCategoryData = useMemo(() => {
        const months = 12;
        const startDate = startOfMonth(subMonths(new Date(), months - 1));
        const endDate = endOfMonth(new Date());

        // Filter transactions
        const relevantTx = transactions.filter(t => {
            const tDate = parseISO(t.date);
            const isTransfer = t.categoryId === transferCategoryId;
            return !isTransfer &&
                tDate >= startDate && tDate <= endDate;
        });

        // Calculate Net Flow per Category
        const catMap = new Map<string, { value: number, color: string }>();

        relevantTx.forEach(t => {
            const amount = parseFloat(t.amount.toString()) || 0;
            const cat = categories.find(c => c.id === t.categoryId);
            const name = cat ? cat.name : 'Unknown';
            const color = cat ? cat.color : '#888888';

            const current = catMap.get(name) || { value: 0, color };

            if (t.type === 'income') {
                catMap.set(name, { value: current.value + amount, color });
            } else if (t.type === 'expense') {
                catMap.set(name, { value: current.value - amount, color });
            }
        });

        const nodes: { name: string, fill?: string }[] = [];
        const links: { source: number; target: number; value: number }[] = [];

        // Distribute categories based on Net Flow direction
        const incomeEntries: { name: string, value: number, color: string }[] = [];
        const expenseEntries: { name: string, value: number, color: string }[] = [];

        catMap.forEach((data, name) => {
            if (data.value > 0) {
                // Net Inflow
                incomeEntries.push({ name, value: data.value, color: data.color });
            } else if (data.value < 0) {
                // Net Outflow
                expenseEntries.push({ name, value: Math.abs(data.value), color: data.color });
            }
        });

        incomeEntries.sort((a, b) => b.value - a.value);
        expenseEntries.sort((a, b) => b.value - a.value);

        // 1. Income Nodes (Sources)
        nodes.push(...incomeEntries.map(e => ({ name: e.name, fill: e.color })));

        // 2. Center Node
        const centerNodeIndex = nodes.length;
        nodes.push({ name: 'Net Flow', fill: 'var(--foreground)' });

        // 3. Expense Nodes (Targets)
        const firstExpenseNodeIndex = nodes.length;
        nodes.push(...expenseEntries.map(e => ({ name: e.name, fill: e.color })));

        // Links: Income -> Center
        incomeEntries.forEach((entry, idx) => {
            links.push({ source: idx, target: centerNodeIndex, value: entry.value });
        });

        // Links: Center -> Expense
        expenseEntries.forEach((entry, idx) => {
            links.push({ source: centerNodeIndex, target: firstExpenseNodeIndex + idx, value: entry.value });
        });

        return { nodes, links };
    }, [transactions, categories, transferCategoryId]);

    return {
        globalMonthlyStats,
        chartData,
        categoryData,
        netWorthData,
        categoryTrendData,
        budgetExpenseComparisonData,
        budgetIncomeComparisonData,
        netWorthByTypeData,
        netWorthProjectionData,
        selectedCategoryForTrend,
        sankeyCategoryData
    };
}
