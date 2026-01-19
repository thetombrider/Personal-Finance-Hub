
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RecurringExpense, RecurringExpenseCheck } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Check } from "lucide-react";
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ReconciliationDetailModal } from "../ReconciliationDetailModal";

interface RecurringTransactionsMonitoringProps {
    transactions: RecurringExpense[];
    title: string;
    description: string;
}

export function RecurringTransactionsMonitoring({ transactions, title, description }: RecurringTransactionsMonitoringProps) {
    const queryClient = useQueryClient();
    const [selectedCheck, setSelectedCheck] = useState<{ check: RecurringExpenseCheck, expense: RecurringExpense } | null>(null);

    // Determine range: last 12 months + current
    const today = new Date();
    const months = Array.from({ length: 12 }).map((_, i) => {
        const d = subMonths(today, 11 - i);
        return {
            date: d,
            month: d.getMonth() + 1,
            year: d.getFullYear(),
            label: format(d, "MMM")
        };
    });

    // Fetch checks for these months
    const checkQueries = months.map(m => useQuery<RecurringExpenseCheck[]>({
        queryKey: ['reconciliation', m.year, m.month],
        queryFn: async () => {
            const res = await fetch(`/api/reconciliation/status?year=${m.year}&month=${m.month}`);
            if (!res.ok) throw new Error('Failed');
            return res.json();
        }
    }));

    const isLoading = checkQueries.some(q => q.isLoading);
    const checksByMonth = months.map((m, i) => checkQueries[i].data || []);

    const runCheckMutation = useMutation({
        mutationFn: async ({ year, month }: { year: number, month: number }) => {
            const res = await fetch('/api/reconciliation/check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, month })
            });
            if (!res.ok) throw new Error("Failed");
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['reconciliation'] });
        }
    });

    const getStatus = (expenseId: number, monthIndex: number) => {
        const checks = checksByMonth[monthIndex];
        return checks.find(c => c.recurringExpenseId === expenseId);
    };

    const handleCellClick = (expense: RecurringExpense, check?: RecurringExpenseCheck) => {
        if (check) {
            setSelectedCheck({ check, expense });
        }
    };

    const activeTransactions = transactions.filter(e => e.active);

    if (isLoading) return <div className="p-4"><Loader2 className="animate-spin" /></div>;

    if (activeTransactions.length === 0) return null;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border p-1 bg-muted/20">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Transaction</TableHead>
                                {months.map(m => (
                                    <TableHead key={`${m.year}-${m.month}`} className="text-center w-[80px] p-1 text-xs">{m.label}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeTransactions.map(transaction => (
                                <TableRow key={transaction.id}>
                                    <TableCell className="font-medium text-sm">{transaction.name}</TableCell>
                                    {months.map((m, i) => {
                                        const check = getStatus(transaction.id, i);
                                        return (
                                            <TableCell
                                                key={`${m.year}-${m.month}`}
                                                className="text-center cursor-pointer hover:bg-muted/50 p-1"
                                                onClick={() => handleCellClick(transaction, check)}
                                            >
                                                <div className="flex justify-center">
                                                    {!check && <span className="text-muted-foreground text-xs">-</span>}
                                                    {check?.status === 'MATCHED' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                    {check?.status === 'MISSING' && <XCircle className="h-4 w-4 text-red-500" />}
                                                    {check?.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-500" />}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                            await Promise.all(months.map(m => runCheckMutation.mutateAsync({ year: m.year, month: m.month })));
                        }}
                        disabled={runCheckMutation.isPending}
                    >
                        {runCheckMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                        Run Check (Last 12 Months)
                    </Button>
                </div>

                <ReconciliationDetailModal
                    open={!!selectedCheck}
                    onOpenChange={(open) => !open && setSelectedCheck(null)}
                    check={selectedCheck?.check || null}
                    expense={selectedCheck?.expense || null}
                />
            </CardContent>
        </Card>
    );
}
