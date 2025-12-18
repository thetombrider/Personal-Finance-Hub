import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Activity, PiggyBank, CreditCard, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, ReferenceLine, Legend } from "recharts";
import { useState, useMemo } from "react";
import { format, subMonths, isSameMonth, parseISO, startOfMonth, endOfMonth } from "date-fns";

export default function Dashboard() {
  const { accounts, transactions, categories, formatCurrency } = useFinance();
  const [timeRange, setTimeRange] = useState("12"); // months
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryTrendId, setCategoryTrendId] = useState<string>("");
  const [privacyMode, setPrivacyMode] = useState(false);

  const displayCurrency = (amount: number) => {
    if (privacyMode) return "•••••";
    return formatCurrency(amount);
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  // Find transfer category to exclude from income/expense calculations
  const transferCategoryId = categories.find(c => c.name.toLowerCase() === 'trasferimenti')?.id;
  
  // Calculate monthly income/expense (excluding transfers)
  const currentMonth = new Date();
  const monthlyStats = useMemo(() => {
    const stats = transactions.filter(t => {
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
    return stats;
  }, [transactions, selectedAccount, selectedCategory, transferCategoryId]);

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
    
    let budget: number | null = null;
    if (selectedCategoryForTrend.budget !== null && selectedCategoryForTrend.budget !== undefined && selectedCategoryForTrend.type === 'expense') {
      const parsedBudget = parseFloat(selectedCategoryForTrend.budget);
      if (!isNaN(parsedBudget)) {
        budget = parsedBudget;
      }
    }
    
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
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
        overBudget: budget !== null && monthTotal > budget
      });
    }
    return data;
  }, [transactions, categoryTrendId, timeRange, selectedAccount, selectedCategoryForTrend]);

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

  const totalInvestments = useMemo(() => {
    return accounts
      .filter(acc => acc.type === 'investment')
      .reduce((sum, acc) => sum + acc.balance, 0);
  }, [accounts]);

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

  // Net Worth by account type
  const netWorthByTypeData = useMemo(() => {
    const typeMap = new Map<string, number>();
    const typeLabels: Record<string, string> = {
      'checking': 'Conto Corrente',
      'savings': 'Risparmi',
      'credit': 'Credito',
      'investment': 'Investimenti',
      'cash': 'Contanti'
    };
    
    accounts.forEach(acc => {
      const label = typeLabels[acc.type] || acc.type;
      const current = typeMap.get(label) || 0;
      typeMap.set(label, current + acc.balance);
    });
    
    return Array.from(typeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.value !== 0)
      .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }, [accounts]);

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
        <div className="grid gap-4 md:grid-cols-6">
          <Card className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading">{displayCurrency(totalBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {accounts.length} accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-blue-600 dark:text-blue-400">
                {displayCurrency(totalCash)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Cash & Checking</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                {displayCurrency(totalSavings)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Savings accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
              <div className="h-8 w-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-violet-600 dark:text-violet-400">
                {displayCurrency(totalInvestments)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Investment accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Flow</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs text-muted-foreground">Income</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  +{displayCurrency(monthlyStats.income)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                  <span className="text-xs text-muted-foreground">Expenses</span>
                </div>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">
                  -{displayCurrency(monthlyStats.expense)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Carte di Credito</CardTitle>
              <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <CreditCard className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-rose-600 dark:text-rose-400">
                {displayCurrency(Math.abs(totalCredit))}
              </div>
              {creditUsageThisMonth && creditUsageThisMonth.limit > 0 ? (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Speso questo mese</span>
                    <span>{displayCurrency(creditUsageThisMonth.spent)} / {displayCurrency(creditUsageThisMonth.limit)}</span>
                  </div>
                  <Progress 
                    value={Math.min(creditUsageThisMonth.percentage, 100)} 
                    className={creditUsageThisMonth.percentage > 80 ? "bg-rose-200" : ""}
                  />
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
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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
                        formatter={(value: number) => [displayCurrency(value), 'Saldo']}
                        contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                        itemStyle={{ color: 'var(--color-foreground)' }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 4, 4, 0]}
                      >
                        {netWorthByTypeData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.value >= 0 ? COLORS[index % COLORS.length] : '#ef4444'} 
                          />
                        ))}
                      </Bar>
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
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
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
                  {selectedCategoryForTrend?.budget !== null && 
                   selectedCategoryForTrend?.budget !== undefined && 
                   selectedCategoryForTrend?.budget !== "" &&
                   selectedCategoryForTrend.type === 'expense' && 
                   !isNaN(parseFloat(selectedCategoryForTrend.budget)) && (
                    <span className="ml-2 text-primary font-medium">
                      (Budget: {displayCurrency(parseFloat(selectedCategoryForTrend.budget))})
                    </span>
                  )}
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
                  <BarChart data={categoryTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                        const label = name === 'total' ? (selectedCategoryForTrend?.name || 'Totale') : 'Budget';
                        return [displayCurrency(value), label];
                      }}
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Bar 
                      dataKey="total" 
                      radius={[4, 4, 0, 0]}
                      name="Speso"
                    >
                      {categoryTrendData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.overBudget ? '#ef4444' : '#8b5cf6'} 
                        />
                      ))}
                    </Bar>
                    {selectedCategoryForTrend?.budget !== null && 
                     selectedCategoryForTrend?.budget !== undefined && 
                     selectedCategoryForTrend?.budget !== "" &&
                     selectedCategoryForTrend.type === 'expense' && 
                     !isNaN(parseFloat(selectedCategoryForTrend.budget)) && (
                      <ReferenceLine 
                        y={parseFloat(selectedCategoryForTrend.budget)} 
                        stroke="#ef4444" 
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        label={{ 
                          value: 'Budget', 
                          position: 'right',
                          fill: '#ef4444',
                          fontSize: 12
                        }}
                      />
                    )}
                  </BarChart>
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
    </Layout>
  );
}
