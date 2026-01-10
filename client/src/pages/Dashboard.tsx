import { useFinance } from "@/context/FinanceContext";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Activity, PiggyBank, CreditCard, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar, ComposedChart, Line, ReferenceLine, Legend, Area as RechartsArea } from "recharts";
import { useState, useMemo, useCallback } from "react";
import { format, subMonths, isSameMonth, parseISO, startOfMonth, endOfMonth, getYear } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { usePortfolioStats } from "@/hooks/usePortfolioStats";

export default function Dashboard() {
  const { accounts, transactions, categories, formatCurrency } = useFinance();
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState("12"); // months
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryTrendId, setCategoryTrendId] = useState<string>("");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [detailModal, setDetailModal] = useState<'total' | 'cash' | 'savings' | 'investments' | null>(null);

  const currentYear = new Date().getFullYear();
  const { data: currentYearBudget } = useQuery({
    queryKey: ['budget', currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/budget/${currentYear}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    }
  });

  const { data: previousYearBudget } = useQuery({
    queryKey: ['budget', currentYear - 1],
    queryFn: async () => {
      const res = await fetch(`/api/budget/${currentYear - 1}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    },
    enabled: timeRange === "12" // Only fetch previous year if viewing 12 months
  });

  const displayCurrency = (amount: number) => {
    if (privacyMode) return "•••••";
    return formatCurrency(amount);
  };

  const { portfolioSummary, isLoading: isPortfolioLoading } = usePortfolioStats();

  const totalNonInvestmentBalance = accounts
    .filter(acc => acc.type !== 'investment')
    .reduce((sum, acc) => sum + acc.balance, 0);

  const totalBalance = totalNonInvestmentBalance + (portfolioSummary?.totalCurrentValue || 0);

  // Find transfer category to exclude from income/expense calculations
  const transferCategoryId = categories.find(c => c.name.toLowerCase() === 'trasferimenti')?.id;

  // Calculate monthly income/expense (excluding transfers) - affected by filters
  const monthlyStats = useMemo(() => {
    // ... logic for filtered stats (existing)
    const currentMonth = new Date();
    return transactions.filter(t => {
      const date = parseISO(t.date);
      const isTransfer = t.categoryId === transferCategoryId;
      const matchesCategory = selectedCategory === "all" || t.categoryId === parseInt(selectedCategory);
      return !isTransfer && isSameMonth(date, currentMonth) &&
        (selectedAccount === "all" || t.accountId === parseInt(selectedAccount)) &&
        matchesCategory;
    }).reduce((acc, t) => {
      const amount = parseFloat(t.amount) || 0;
      if (t.type === 'income') acc.income += amount;
      else acc.expense += amount;
      return acc;
    }, { income: 0, expense: 0 });
  }, [transactions, selectedAccount, selectedCategory, transferCategoryId]);

  // Global Monthly Flow (unaffected by filters)
  const globalMonthlyStats = useMemo(() => {
    const currentMonth = new Date();
    return transactions.filter(t => {
      const date = parseISO(t.date);
      const isTransfer = t.categoryId === transferCategoryId;
      return !isTransfer && isSameMonth(date, currentMonth);
    }).reduce((acc, t) => {
      const amount = parseFloat(t.amount) || 0;
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

      const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

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
        catMap.set(cat.name, current + (parseFloat(t.amount) || 0));
      }
    });

    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions, selectedAccount, categories, transferCategoryId, timeRange]);

  // Net Worth evolution over time
  const netWorthData = useMemo(() => {
    const months = parseInt(timeRange);
    const data = [];

    // Calculate starting balance (sum of all account starting balances)
    const totalStartingBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.startingBalance), 0);

    // Get all transactions sorted by date
    const sortedTransactions = [...transactions].sort((a, b) =>
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
          const amount = parseFloat(t.amount) || 0;
          if (t.type === 'income') {
            netWorth += amount;
          } else {
            netWorth -= amount;
          }
        }
      });

      data.push({
        name: format(date, 'MMM yy'),
        netWorth
      });
    }
    return data;
  }, [transactions, accounts, timeRange]);

  // Category trend data (monthly totals for selected category)
  const selectedCategoryForTrend = categories.find(c => c.id === parseInt(categoryTrendId));

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
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      data.push({
        name: format(date, 'MMM yy'),
        total: monthTotal,
        budget: monthlyBudget,
        overBudget: monthlyBudget > 0 && monthTotal > monthlyBudget
      });
    }
    return data;
  }, [transactions, categoryTrendId, timeRange, selectedAccount, selectedCategoryForTrend, currentYearBudget, previousYearBudget, currentYear]);

  // Helper to get budget for a specific month, year, and type
  const getMonthlyBudgetTotal = useCallback((monthIndex: number, year: number, type: 'income' | 'expense') => {
    const budgetSource = year === currentYear ? currentYearBudget : (year === currentYear - 1 ? previousYearBudget : null);
    if (!budgetSource || !budgetSource.budgetData) return 0;

    let total = 0;
    categories.forEach(cat => {
      // Filter by type and exclude 'trasferimenti'
      if (cat.type === type && cat.name.toLowerCase() !== 'trasferimenti') {
        const catBudget = budgetSource.budgetData[cat.id];
        if (catBudget && catBudget[monthIndex]) {
          total += catBudget[monthIndex].total || 0;
        }
      }
    });
    return total;
  }, [categories, currentYearBudget, previousYearBudget, currentYear]);

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
      }).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

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
        // Income usually doesn't apply to expense categories selected, but if 'all' or if logic needs refinement...
        // If a specific expense category is selected, showing income might not make sense unless we filter by income categories?
        // User behavior: usually filters by account. Category filter is mostly for expenses.
        // Let's stick to showing income regardless of category selection unless it acts as a global filter.
        // If selectedCategory is an expense category, there will be no income transactions with that categoryId.
        const matchesCategory = selectedCategory === "all" || t.categoryId === parseInt(selectedCategory);

        return !isTransfer && t.type === 'income' && tDate >= monthStart && tDate <= monthEnd &&
          (selectedAccount === "all" || t.accountId === parseInt(selectedAccount)) &&
          matchesCategory;
      }).reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      // Budget
      let budget = 0;
      if (selectedCategory !== "all") {
        // If selected category is an INCOME category, we show its budget.
        // If it's an EXPENSE category, income budget for it is 0.
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

  // Totals by account type
  const totalCash = useMemo(() => {
    return accounts
      .filter(acc => acc.type === 'checking' || acc.type === 'cash')
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  const totalSavings = useMemo(() => {
    return accounts
      .filter(acc => acc.type === 'savings')
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  // Total Investments now comes from portfolio stats
  const totalInvestments = portfolioSummary?.totalCurrentValue || 0;

  const totalCredit = useMemo(() => {
    return accounts
      .filter(acc => acc.type === 'credit')
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

  // Credit card usage this month
  const creditUsageThisMonth = useMemo(() => {
    const creditAccounts = accounts.filter(acc => acc.type === 'credit');
    if (creditAccounts.length === 0) return null;

    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    let totalSpent = 0;
    let totalLimit = 0;

    creditAccounts.forEach(acc => {
      const spent = transactions
        .filter(t => {
          const tDate = parseISO(t.date);
          return t.accountId === acc.id &&
            t.type === 'expense' &&
            tDate >= currentMonthStart &&
            tDate <= currentMonthEnd;
        })
        .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

      totalSpent += spent;
      if (acc.creditLimit) {
        totalLimit += parseFloat(acc.creditLimit);
      }
    });

    return {
      spent: totalSpent,
      limit: totalLimit,
      percentage: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0
    };
  }, [accounts, transactions]);

  // Net Worth by account type with Investment Gain/Loss split
  const netWorthByTypeData = useMemo(() => {
    const typeMap = new Map<string, { value: number; gain: number; loss: number; invested: number }>();
    const typeLabels: Record<string, string> = {
      'checking': 'Conto Corrente',
      'savings': 'Risparmi',
      'credit': 'Credito',
      'investment': 'Investimenti',
      'cash': 'Contanti'
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
      current.value += acc.balance;
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
        // For non-investments, 'value' is the total. For investments, we construct the stack.
        // Stack 1: Base (stats.value)
        // Stack 2: Gain (stats.gain)
        // Stack 3: Loss (stats.loss)
        // Note: For investments, we manipulated 'value' above to be the base.
        // Let's ensure we return the total for sorting.
        const total = stats.value + stats.gain + stats.loss; // Wait, loss is "phantom" height?
        // Representation:
        // Gain: [Invested (Base)] + [Gain (Green)] = Current Value
        // Loss: [Current (Base)] + [Loss (Red)] = Invested Amount (Showing what was lost)
        // OR
        // Loss: [Current (Base)] ... and maybe implicit loss?
        // User asked: "totale investito e valore attuale sulla stessa barra ... vedere il pezzetto di gain o loss"
        // Valid for Loss: Bar length = Invested. Color 1 = Current, Color 2 = Loss.
        // Valid for Gain: Bar length = Current. Color 1 = Invested, Color 2 = Gain.

        return {
          name,
          base: stats.value, // This is Invested (if Gain) or Current (if Loss) or Balance (others)
          gain: stats.gain,
          loss: stats.loss,
          totalDisplay: name === 'Investimenti' && portfolioSummary ? portfolioSummary.totalCurrentValue : (stats.value + (stats.loss > 0 ? 0 : 0)) // For sorting use distinct value?
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Overview of your financial health</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="bg-card border border-border p-1 rounded-lg shadow-sm">
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="w-[160px] border-none bg-transparent shadow-none focus:ring-0" data-testid="select-account-filter">
                  <SelectValue placeholder="All Accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-card border border-border p-1 rounded-lg shadow-sm">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[160px] border-none bg-transparent shadow-none focus:ring-0" data-testid="select-category-filter">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.filter(c => c.name.toLowerCase() !== 'trasferimenti').map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
              <TabsList className="h-9">
                <TabsTrigger value="3" className="text-xs px-3">3M</TabsTrigger>
                <TabsTrigger value="6" className="text-xs px-3">6M</TabsTrigger>
                <TabsTrigger value="12" className="text-xs px-3">1Y</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPrivacyMode(!privacyMode)}
              data-testid="button-privacy-toggle"
              title={privacyMode ? "Mostra importi" : "Nascondi importi"}
            >
              {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Stats Grid - Asset Breakdown */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <Card
            className="relative overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setDetailModal('total')}
            data-testid="card-total-balance"
          >
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium whitespace-nowrap">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold font-heading truncate" title={displayCurrency(totalBalance)}>
                {displayCurrency(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                Across {accounts.length} accounts
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
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Investito</p>
                </div>
                <div>
                  <div className="text-lg font-bold font-heading text-violet-500 dark:text-violet-300 truncate" title={displayCurrency(portfolioSummary?.totalCurrentValue || 0)}>
                    {displayCurrency(portfolioSummary?.totalCurrentValue || 0)}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Attuale</p>
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
              <CardTitle className="text-sm font-medium">Carte di Credito</CardTitle>
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
                    <span>Speso</span>
                    <span className="truncate ml-2">{displayCurrency(creditUsageThisMonth.spent)}</span>
                  </div>
                  <Progress
                    value={Math.min(creditUsageThisMonth.percentage, 100)}
                    className={creditUsageThisMonth.percentage > 80 ? "bg-rose-200" : ""}
                  />
                  <div className="text-[10px] text-right text-muted-foreground">
                    di {displayCurrency(creditUsageThisMonth.limit)}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">Debito totale</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Net Worth Evolution + Patrimonio per Tipo di Conto */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Net Worth Evolution</CardTitle>
                  <CardDescription>Your total wealth over time</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-lg font-bold font-heading">{displayCurrency(totalBalance)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={netWorthData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => privacyMode ? "•••" : `€${(value / 1000).toFixed(0)}k`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip
                      formatter={(value: number) => [displayCurrency(value), 'Net Worth']}
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="netWorth"
                      stroke="#6366f1"
                      fillOpacity={1}
                      fill="url(#colorNetWorth)"
                      strokeWidth={2}
                      dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                      activeDot={{ r: 5, fill: '#6366f1' }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Patrimonio per Tipo</CardTitle>
              <CardDescription>Distribuzione del patrimonio</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                {netWorthByTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={netWorthByTypeData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <XAxis
                        type="number"
                        stroke="#888888"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => privacyMode ? "•••" : `€${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#888888"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={70}
                      />
                      <Tooltip
                        formatter={(value: number, name: string) => {
                          if (name === 'loss') return [displayCurrency(value), 'Perdita Latente'];
                          if (name === 'gain') return [displayCurrency(value), 'Guadagno Latente'];
                          return [displayCurrency(value), 'Valore Base'];
                        }}
                        contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        itemStyle={{ color: 'var(--color-foreground)' }}
                      />
                      <Bar dataKey="base" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                        {netWorthByTypeData.map((entry, index) => (
                          <Cell key={`cell-base-${index}`} fill={entry.name === 'Investimenti' ? '#3b82f6' : COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                      <Bar dataKey="gain" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="loss" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Nessun conto disponibile
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Area */}
        <div className="grid gap-6 md:grid-cols-7">
          <Card className="md:col-span-4">
            <CardHeader>
              <CardTitle>Cash Flow</CardTitle>
              <CardDescription>Income vs Expenses over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => privacyMode ? "•••" : `€${value.toFixed(2)}`} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const formattedValue = privacyMode ? "•••••" : `€${value.toFixed(2)}`;
                        const label = name === 'income' ? 'Entrate' : 'Uscite';
                        return [formattedValue, label];
                      }}
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name="income" />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name="expense" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>Spending by Category</CardTitle>
              <CardDescription>Where your money goes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full flex flex-col items-center justify-center">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => privacyMode ? "•••••" : `€${value.toFixed(2)}`}
                        contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-muted-foreground text-sm">No expense data available</div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                  {categoryData.slice(0, 4).map((entry, index) => (
                    <div key={index} className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="truncate flex-1">{entry.name}</span>
                      <span className="font-medium">{displayCurrency(entry.value as number)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Budget vs Actual Charts */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Budget vs Actual Income */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Income</CardTitle>
              <CardDescription>Monthly comparison of budgeted vs actual income</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={budgetIncomeComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBudgetIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActualIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => privacyMode ? "•••" : `€${value.toFixed(0)}`} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const formattedValue = privacyMode ? "•••••" : `€${value.toFixed(2)}`;
                        const label = name === 'budget' ? 'Budget' : 'Entrate Reali';
                        return [formattedValue, label];
                      }}
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Area type="monotone" dataKey="budget" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBudgetIncome)" strokeWidth={2} name="budget" />
                    <Area type="monotone" dataKey="actual" stroke="#10b981" fillOpacity={1} fill="url(#colorActualIncome)" strokeWidth={2} name="actual" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Budget vs Actual Expenses */}
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Actual Expenses</CardTitle>
              <CardDescription>Monthly comparison of budgeted vs actual spending</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={budgetExpenseComparisonData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBudgetExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActualExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => privacyMode ? "•••" : `€${value.toFixed(0)}`} />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        const formattedValue = privacyMode ? "•••••" : `€${value.toFixed(2)}`;
                        const label = name === 'budget' ? 'Budget' : 'Spese Reali';
                        return [formattedValue, label];
                      }}
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Area type="monotone" dataKey="budget" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBudgetExpense)" strokeWidth={2} name="budget" />
                    <Area type="monotone" dataKey="actual" stroke="#ef4444" fillOpacity={1} fill="url(#colorActualExpense)" strokeWidth={2} name="actual" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Trend Chart */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Andamento Categoria</CardTitle>
                <CardDescription>
                  {selectedCategoryForTrend
                    ? `Totale mensile ${selectedCategoryForTrend.type === 'income' ? 'entrate' : 'spese'}: ${selectedCategoryForTrend.name}`
                    : 'Seleziona una categoria per vedere il trend'}

                </CardDescription>
              </div>
              <Select value={categoryTrendId} onValueChange={setCategoryTrendId}>
                <SelectTrigger className="w-[200px]" data-testid="select-category-trend">
                  <SelectValue placeholder="Seleziona categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.filter(c => c.name.toLowerCase() !== 'trasferimenti').map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
              {categoryTrendId && categoryTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">

                  <ComposedChart data={categoryTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => privacyMode ? "•••" : `€${value.toFixed(0)}`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => {
                        if (name === 'budget') return [displayCurrency(value), 'Budget'];
                        const label = selectedCategoryForTrend?.name || 'Totale';
                        return [displayCurrency(value), label];
                      }}
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Bar
                      dataKey="total"
                      radius={[4, 4, 0, 0]}
                      name="total"
                      maxBarSize={50}
                    >
                      {categoryTrendData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.overBudget ? '#ef4444' : '#8b5cf6'}
                        />
                      ))}
                    </Bar>
                    <Line
                      type="monotone"
                      dataKey="budget"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      name="budget"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  {categoryTrendId ? 'Nessun dato disponibile' : 'Seleziona una categoria per vedere l\'andamento'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Account Detail Modal */}
      <Dialog open={detailModal !== null} onOpenChange={(open) => !open && setDetailModal(null)}>
        <DialogContent className="max-w-3xl w-[95%] md:w-full max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {detailModal === 'total' && 'Tutti i Conti'}
              {detailModal === 'cash' && 'Conti Cash & Checking'}
              {detailModal === 'savings' && 'Conti Risparmio'}
              {detailModal === 'investments' && 'Conti Investimento'}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4 flex-1 overflow-y-auto">
            {(() => {
              let filteredAccounts = accounts;
              if (detailModal === 'cash') {
                filteredAccounts = accounts.filter(a => a.type === 'cash' || a.type === 'checking');
              } else if (detailModal === 'savings') {
                filteredAccounts = accounts.filter(a => a.type === 'savings');
              } else if (detailModal === 'investments') {
                filteredAccounts = accounts.filter(a => a.type === 'investment');
              }

              if (filteredAccounts.length === 0) {
                return <p className="text-muted-foreground text-center py-4">Nessun conto disponibile</p>;
              }

              const total = filteredAccounts.reduce((sum, acc) => sum + acc.balance, 0);

              return (
                <>
                  <div className={detailModal === 'total' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pr-2" : "space-y-3"}>
                    {filteredAccounts.map(account => (
                      <div
                        key={account.id}
                        className={detailModal === 'total'
                          ? "flex flex-col p-3 bg-muted/50 rounded-lg"
                          : "flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        }
                        data-testid={`modal-account-${account.id}`}
                      >
                        {detailModal === 'total' ? (
                          <>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm truncate">{account.name}</span>
                              <span className="text-xs text-muted-foreground capitalize">{account.type}</span>
                            </div>
                            <span className="text-lg font-bold font-heading mt-1">
                              {displayCurrency(account.balance)}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: account.color || '#6366f1' }}
                              />
                              <div>
                                <p className="font-medium">{account.name}</p>
                                <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                              </div>
                            </div>
                            <span className={`font-bold ${account.balance >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                              {displayCurrency(account.balance)}
                            </span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 mt-3 flex justify-between items-center">
                    <span className="font-medium">Totale</span>
                    <span className="text-xl font-bold">{displayCurrency(total)}</span>
                  </div>
                  {detailModal === 'investments' && (
                    <Button
                      className="w-full mt-4"
                      onClick={() => {
                        setDetailModal(null);
                        setLocation('/portfolio');
                      }}
                      data-testid="button-go-to-portfolio"
                    >
                      Dettagli Portfolio
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
          <DialogFooter className="mt-4 sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setDetailModal(null)} className="w-full sm:w-auto">
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
