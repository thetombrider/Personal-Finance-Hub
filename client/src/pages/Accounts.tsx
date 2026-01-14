import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subMonths, parseISO } from "date-fns";
// import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Landmark, RefreshCw } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ImportedTransactions } from "@/components/ImportedTransactions";
import { List } from "lucide-react";

export default function Accounts() {
  const { accounts, transactions, formatCurrency, isLoading } = useFinance();
  const [timeRange, setTimeRange] = useState('12');
  const [page, setPage] = useState(0);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [reviewAccountId, setReviewAccountId] = useState<number | null>(null);
  const { toast } = useToast();

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

  const handleSync = async (accountId: number) => {
    setSyncing(accountId);
    try {
      const res = await apiRequest("POST", `/api/gocardless/sync/${accountId}`);
      const data = await res.json();
      toast({
        title: "Sync Complete",
        description: `Staged ${data.added} new transactions for review.`,
      });
      // queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }); // No longer needed as they are not imported yet
    } catch (error: any) {
      // Check if it's a rate limit error (parsed from response by queryClient/apiRequest helper usually returns error object)
      // Note: apiRequest throws if !res.ok. We need to catch the error object which might have status or we need to check the response manually if apiRequest didn't throw.
      // Actually apiRequest from `lib/queryClient` usually throws an Error object.
      // Let's assume the standard error handling, but we might need to parse the response if the error object contains it.

      // If we use standard fetch pattern, we get response.
      // But here we used `apiRequest`. Let's see how `apiRequest` behaves.
      // Usually it throws.

      const isRateLimit = error.message?.includes("429") || error.message?.includes("Rate limit") || (error as any).status === 429;

      toast({
        title: isRateLimit ? "Limit Reached" : "Sync Failed",
        description: isRateLimit
          ? "Too many requests to the bank. Please try again later."
          : "Unable to sync transactions.",
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Accounts</h1>
            <p className="text-muted-foreground">Account flow analysis</p>
          </div>
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Account Flow</CardTitle>
                <CardDescription>Monthly summary of net income/expense for each account</CardDescription>
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
                  <SelectTrigger className="w-[140px]" data-testid="select-time-range">
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
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-hidden relative">
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
                      <TableHead className="text-center w-[100px]">Actions</TableHead>
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
                                <div className="w-2 h-2 rounded-full bg-green-500" title="Bank Linked" />
                              )}
                            </div>
                          </TableCell>
                          {visibleMonths.map(m => {
                            const val = months[m.key];
                            return (
                              <TableCell key={m.key} className={`text-center text-xs sm:text-sm p-1 ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : ''}`}>
                                {val !== 0 ? formatCurrency(val) : '-'}
                              </TableCell>
                            );
                          })}
                          <TableCell className={`text-center font-semibold ${total > 0 ? 'text-emerald-600' : total < 0 ? 'text-rose-600' : ''}`}>
                            {total !== 0 ? formatCurrency(total) : '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            {account?.gocardlessAccountId && (
                              <div className="flex items-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSync(account.id)}
                                  disabled={syncing === account.id}
                                  title="Sync with Bank"
                                >
                                  <RefreshCw className={`h-4 w-4 ${syncing === account.id ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setReviewAccountId(account.id)}
                                  title="Review Imported Transactions"
                                >
                                  <List className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
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
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>
      </div>


      {reviewAccountId && (
        <ImportedTransactions
          accountId={reviewAccountId}
          isOpen={!!reviewAccountId}
          onOpenChange={(open) => !open && setReviewAccountId(null)}
        />
      )}
    </Layout>
  );
}
