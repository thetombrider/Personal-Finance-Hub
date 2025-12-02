import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Activity } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, BarChart, Bar } from "recharts";
import { useState, useMemo } from "react";
import { format, subMonths, isSameMonth, parseISO, startOfMonth, endOfMonth } from "date-fns";

export default function Dashboard() {
  const { accounts, transactions, categories, formatCurrency } = useFinance();
  const [timeRange, setTimeRange] = useState("12"); // months
  const [selectedAccount, setSelectedAccount] = useState("all");

  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  
  // Calculate monthly income/expense
  const currentMonth = new Date();
  const monthlyStats = useMemo(() => {
    const stats = transactions.filter(t => {
      const date = parseISO(t.date);
      return isSameMonth(date, currentMonth) && (selectedAccount === "all" || t.accountId === selectedAccount);
    }).reduce((acc, t) => {
      if (t.type === 'income') acc.income += t.amount;
      else acc.expense += t.amount;
      return acc;
    }, { income: 0, expense: 0 });
    return stats;
  }, [transactions, selectedAccount]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const months = parseInt(timeRange);
    const data = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      
      const monthTx = transactions.filter(t => {
        const tDate = parseISO(t.date);
        return tDate >= monthStart && tDate <= monthEnd && (selectedAccount === "all" || t.accountId === selectedAccount);
      });

      const income = monthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTx.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

      data.push({
        name: format(date, 'MMM'),
        income,
        expense,
        net: income - expense
      });
    }
    return data;
  }, [transactions, timeRange, selectedAccount]);

  // Category data
  const categoryData = useMemo(() => {
    const expenseTx = transactions.filter(t => t.type === 'expense' && (selectedAccount === "all" || t.accountId === selectedAccount));
    const catMap = new Map();
    
    expenseTx.forEach(t => {
      const cat = categories.find(c => c.id === t.categoryId);
      if (cat) {
        const current = catMap.get(cat.name) || 0;
        catMap.set(cat.name, current + t.amount);
      }
    });

    return Array.from(catMap.entries()).map(([name, value]) => ({ name, value }));
  }, [transactions, selectedAccount, categories]);

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
          
          <div className="flex items-center gap-3 bg-card border border-border p-1 rounded-lg shadow-sm">
            <Select value={selectedAccount} onValueChange={setSelectedAccount}>
              <SelectTrigger className="w-[180px] border-none bg-transparent shadow-none focus:ring-0">
                <SelectValue placeholder="All Accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Accounts</SelectItem>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-primary/5 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading">{formatCurrency(totalBalance)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {accounts.length} accounts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(monthlyStats.income)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
              <div className="h-8 w-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-heading text-rose-600 dark:text-rose-400">
                -{formatCurrency(monthlyStats.expense)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Area */}
        <div className="grid gap-6 md:grid-cols-7">
          <Card className="md:col-span-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Cash Flow</CardTitle>
                  <CardDescription>Income vs Expenses over time</CardDescription>
                </div>
                <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
                  <TabsList className="grid w-full grid-cols-3 h-8">
                    <TabsTrigger value="3" className="text-xs">3M</TabsTrigger>
                    <TabsTrigger value="6" className="text-xs">6M</TabsTrigger>
                    <TabsTrigger value="12" className="text-xs">1Y</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
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
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                      itemStyle={{ color: 'var(--color-foreground)' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
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
                         formatter={(value: number) => formatCurrency(value)}
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
                       <span className="font-medium">{formatCurrency(entry.value as number)}</span>
                     </div>
                   ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
