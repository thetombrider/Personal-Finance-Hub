import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subMonths, parseISO, startOfMonth, endOfMonth, parse } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Landmark, RefreshCw } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TransactionDrilldown } from "@/components/reports/TransactionDrilldown";


export default function Accounts() {
  const { accounts, transactions, formatCurrency, isLoading } = useFinance();
  const [timeRange, setTimeRange] = useState('12');
  const [page, setPage] = useState(0);

  const [drilldownConfig, setDrilldownConfig] = useState<{
    title: string;
    filters: {
      accountId?: string;
      dateFrom: Date;
      dateTo: Date;
    }
  } | null>(null);

  const monthsList = useMemo(() => {
    const months = parseInt(timeRange);
    const list = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      list.push({
        date,
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM')
      });
    }
    return list;
  }, [timeRange]);

  // Reset page when timeRange changes
  useEffect(() => {
    setPage(0);
  }, [timeRange]);

  const visibleMonths = useMemo(() => {
    const itemsPerPage = 6;
    const totalMonths = monthsList.length;
    const endIndex = totalMonths - (page * itemsPerPage);
    const startIndex = Math.max(0, endIndex - itemsPerPage);
    return monthsList.slice(startIndex, endIndex);
  }, [monthsList, page]);

  const totalPages = Math.ceil(monthsList.length / 6);
  const canGoBack = page < totalPages - 1;
  const canGoForward = page > 0;

  const accountMonthlyData = useMemo(() => {
    const data: Record<string, Record<string, number>> = {};

    accounts.forEach(acc => {
      data[acc.name] = {};
      monthsList.forEach(m => {
        data[acc.name][m.key] = 0;
      });
    });

    transactions.forEach(t => {
      const account = accounts.find(a => a.id === t.accountId);
      if (!account) return;

      const tDate = parseISO(t.date);
      const monthKey = format(tDate, 'yyyy-MM');

      if (data[account.name] && data[account.name][monthKey] !== undefined) {
        const amount = parseFloat(t.amount) || 0;
        if (t.type === 'income') {
          data[account.name][monthKey] += amount;
        } else {
          data[account.name][monthKey] -= amount;
        }
      }
    });

    return data;
  }, [transactions, accounts, monthsList]);

  const handleDrilldown = (accountName: string, monthKey: string) => {
    const account = accounts.find(a => a.name === accountName);
    if (!account) return;

    const date = parse(monthKey, 'yyyy-MM', new Date());
    const dateFrom = startOfMonth(date);
    const dateTo = endOfMonth(date);

    setDrilldownConfig({
      title: `${accountName} - ${format(date, 'MMMM yyyy')}`,
      filters: {
        accountId: account.id.toString(),
        dateFrom,
        dateTo
      }
    });
  };

  const handleTotalDrilldown = (accountName: string) => {
    // Drilldown for the entire visible period for an account (or maybe just strict total? The table shows "Period Total")
    // The "Period Total" column sums the visible months? 
    // The code says: const total = Object.values(months).reduce((sum, val) => sum + val, 0);
    // Wait, 'months' in the reduce is `data[acc.name]`. `data` is initialized with `monthsList`.
    // So it sums ALL months in `monthsList` (last 6/12/24), not just visible columns.
    // So the date range should cover the entire `monthsList`.

    const account = accounts.find(a => a.name === accountName);
    if (!account || monthsList.length === 0) return;

    const startDate = monthsList[0].date;
    const endDate = monthsList[monthsList.length - 1].date;

    setDrilldownConfig({
      title: `${accountName} - Total (${timeRange} months)`,
      filters: {
        accountId: account.id.toString(),
        dateFrom: startOfMonth(startDate),
        dateTo: endOfMonth(endDate)
      }
    });
  }


  if (isLoading) {
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
      <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Accounts</h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md mr-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => p + 1)}
                disabled={!canGoBack}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm px-2 font-medium min-w-[80px] text-center">
                {visibleMonths.length > 0
                  ? `${visibleMonths[0].label} - ${visibleMonths[visibleMonths.length - 1].label} `
                  : 'No data'}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={!canGoForward}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[170px]" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
                <SelectItem value="24">Last 24 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="flex flex-col max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-12rem)]">
          <CardContent className="p-0 overflow-auto">
            <ScrollArea className="w-full h-full">
              <div className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 w-[20%] min-w-[150px]">Account</TableHead>
                      {visibleMonths.map(m => (
                        <TableHead key={m.key} className="text-center w-[10%] min-w-[80px] text-xs sm:text-sm p-1 capitalize">{m.label}</TableHead>
                      ))}
                      <TableHead className="text-center w-[10%] min-w-[100px] font-semibold p-1">Period Total</TableHead>

                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(accountMonthlyData).map(([accountName, months]) => {
                      const total = Object.values(months).reduce((sum, val) => sum + val, 0);
                      const account = accounts.find(a => a.name === accountName);

                      return (
                        <TableRow key={accountName}>
                          <TableCell className="sticky left-0 bg-card z-10 font-medium">
                            <div className="flex items-center gap-2">
                              {accountName}
                              {account?.gocardlessAccountId && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Landmark size={14} className="text-blue-500/70" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Bank Linked</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </TableCell>
                          {visibleMonths.map(m => {
                            const val = months[m.key];
                            return (
                              <TableCell
                                key={m.key}
                                className={`text-center text-xs sm:text-sm p-1 ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : ''} cursor-pointer hover:underline hover:bg-muted/50 transition-colors`}
                                onClick={() => handleDrilldown(accountName, m.key)}
                                title="View transactions"
                              >
                                {val !== 0 ? formatCurrency(val) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell
                            className={`text-center font-semibold ${total > 0 ? 'text-emerald-600' : total < 0 ? 'text-rose-600' : ''} cursor-pointer hover:underline hover:bg-muted/50 transition-colors`}
                            onClick={() => handleTotalDrilldown(accountName)}
                            title="View all transactions for this period"
                          >
                            {total !== 0 ? formatCurrency(total) : '-'}
                          </TableCell>

                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="sticky left-0 bg-muted/50 z-10">Total</TableCell>
                      {visibleMonths.map(m => {
                        const monthTotal = Object.values(accountMonthlyData).reduce((sum, acc) => sum + (acc[m.key] || 0), 0);
                        return (
                          <TableCell key={m.key} className={`text-center ${monthTotal > 0 ? 'text-emerald-600' : monthTotal < 0 ? 'text-rose-600' : ''}`}>
                            {monthTotal !== 0 ? formatCurrency(monthTotal) : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center">
                        {formatCurrency(Object.values(accountMonthlyData).reduce((sum, acc) =>
                          sum + Object.values(acc).reduce((s, v) => s + v, 0), 0
                        ))}
                      </TableCell>

                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        {drilldownConfig && (
          <TransactionDrilldown
            isOpen={!!drilldownConfig}
            onClose={() => setDrilldownConfig(null)}
            title={drilldownConfig.title}
            initialFilters={drilldownConfig.filters}
          />
        )}
      </div>



    </Layout>
  );
}
