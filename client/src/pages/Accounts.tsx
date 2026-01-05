import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subMonths, parseISO } from "date-fns";
import { it } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export default function Accounts() {
  const { accounts, transactions, formatCurrency, isLoading } = useFinance();
  const [timeRange, setTimeRange] = useState('12');
  const [page, setPage] = useState(0);

  const monthsList = useMemo(() => {
    const months = parseInt(timeRange);
    const list = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      list.push({
        date,
        key: format(date, 'yyyy-MM'),
        label: format(date, 'MMM', { locale: it })
      });
    }
    return list;
  }, [timeRange]);

  // Reset page when timeRange changes
  useEffect(() => {
    setPage(0);
  }, [timeRange]);

  const visibleMonths = useMemo(() => {
    // Show 6 months per page.
    // Page 0 = Last 6 months (indices: length-6 to length)
    // Page 1 = Previous 6 months, etc.
    const itemsPerPage = 6;
    const totalMonths = monthsList.length;

    // Calculate start/end indices from the END of the list (most recent)
    // For page 0: slice(total - 6, total)
    // For page 1: slice(total - 12, total - 6)

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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">Analisi del flusso per conto</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Flusso per Conto</CardTitle>
                <CardDescription>Riepilogo mensile entrate/uscite nette per ogni conto</CardDescription>
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
                      ? `${visibleMonths[0].label} - ${visibleMonths[visibleMonths.length - 1].label}`
                      : 'Nessun dato'}
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
                    <SelectItem value="6">Ultimi 6 mesi</SelectItem>
                    <SelectItem value="12">Ultimi 12 mesi</SelectItem>
                    <SelectItem value="24">Ultimi 24 mesi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 w-[20%] min-w-[150px]">Conto</TableHead>
                      {visibleMonths.map(m => (
                        <TableHead key={m.key} className="text-center w-[10%] min-w-[80px] text-xs sm:text-sm p-1 capitalize">{m.label}</TableHead>
                      ))}
                      <TableHead className="text-center w-[10%] min-w-[100px] font-semibold p-1">Totale Periodo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(accountMonthlyData).map(([accountName, months]) => {
                      // Calculate total based on ALL months in the selected range, not just visible ones
                      const total = Object.values(months).reduce((sum, val) => sum + val, 0);
                      return (
                        <TableRow key={accountName}>
                          <TableCell className="sticky left-0 bg-card z-10 font-medium">{accountName}</TableCell>
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
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell className="sticky left-0 bg-muted/50 z-10">Totale</TableCell>
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
      </div>
    </Layout>
  );
}
