import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subMonths, parseISO } from "date-fns";
import { it } from "date-fns/locale";

export default function Accounts() {
  const { accounts, transactions, formatCurrency, isLoading } = useFinance();
  const [timeRange, setTimeRange] = useState('12');

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

  const totalStartingBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.startingBalance), 0);
  const totalCurrentBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Accounts</h1>
          <p className="text-muted-foreground">Analisi del flusso per conto</p>
        </div>

        {/* Account Balances Summary Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Riepilogo Saldi</CardTitle>
            <CardDescription>Saldo iniziale e corrente per ogni conto</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 w-[20%]"></TableHead>
                      {accounts.map(acc => (
                        <TableHead key={acc.id} className="text-center w-auto">{acc.name}</TableHead>
                      ))}
                      <TableHead className="text-center w-[15%] font-semibold">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">Saldo Iniziale</TableCell>
                      {accounts.map(acc => (
                        <TableCell key={acc.id} className="text-center">
                          {formatCurrency(parseFloat(acc.startingBalance))}
                        </TableCell>
                      ))}
                      <TableCell className="text-center font-semibold">
                        {formatCurrency(totalStartingBalance)}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="sticky left-0 bg-card z-10 font-medium">Saldo Corrente</TableCell>
                      {accounts.map(acc => {
                        const isNegative = acc.balance < 0;
                        return (
                          <TableCell key={acc.id} className={`text-center font-semibold ${isNegative ? 'text-rose-600' : 'text-emerald-600'}`}>
                            {formatCurrency(acc.balance)}
                          </TableCell>
                        );
                      })}
                      <TableCell className={`text-center font-bold ${totalCurrentBalance < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatCurrency(totalCurrentBalance)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Flusso per Conto</CardTitle>
                <CardDescription>Riepilogo mensile entrate/uscite nette per ogni conto</CardDescription>
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
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="w-full">
              <div className="w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-card z-10 w-[15%]">Conto</TableHead>
                      {monthsList.map(m => (
                        <TableHead key={m.key} className="text-center w-auto text-xs sm:text-sm p-1 capitalize">{m.label}</TableHead>
                      ))}
                      <TableHead className="text-center w-[10%] font-semibold p-1">Totale</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(accountMonthlyData).map(([accountName, months]) => {
                      const total = Object.values(months).reduce((sum, val) => sum + val, 0);
                      return (
                        <TableRow key={accountName}>
                          <TableCell className="sticky left-0 bg-card z-10 font-medium">{accountName}</TableCell>
                          {monthsList.map(m => {
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
                      {monthsList.map(m => {
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
