
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { RecurringExpense, RecurringExpenseCheck } from "@shared/schema";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Clock, Check } from "lucide-react";
import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ReconciliationDetailModal } from "../ReconciliationDetailModal";

interface RecurringTransactionsMonitoringProps {
    transactions: RecurringExpense[];
    title: string;
    description: string;
    transactionType: 'income' | 'expense';
}

export function RecurringTransactionsMonitoring({ transactions, title, description, transactionType }: RecurringTransactionsMonitoringProps) {
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
        <div className="space-y-4">
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{description}</p>
                </div>
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
                        {activeTransactions.map(transaction => {
                            // Pre-calculate date boundaries for this transaction
                            const startDate = new Date(transaction.startDate);
                            const endDate = transaction.endDate ? new Date(transaction.endDate) : null;

                            return (
                                <TableRow key={transaction.id}>
                                    <TableCell className="font-medium text-sm">{transaction.name}</TableCell>
                                    {months.map((m, i) => {
                                        // Check if this month is within the valid range
                                        const monthStart = new Date(m.year, m.month - 1, 1);
                                        const monthEnd = new Date(m.year, m.month, 0);

                                        // Check if month is before start date or after end date
                                        const isBeforeStart = monthEnd < startDate;
                                        const isAfterEnd = endDate && monthStart > endDate;
                                        const isOutOfRange = isBeforeStart || isAfterEnd;

                                        const check = getStatus(transaction.id, i);

                                        return (
                                            <TableCell
                                                key={`${m.year}-${m.month}`}
                                                className={`text-center p-1 ${isOutOfRange ? 'bg-muted/30' : 'cursor-pointer hover:bg-muted/50'}`}
                                                onClick={() => !isOutOfRange && handleCellClick(transaction, check)}
                                            >
                                                <div className="flex justify-center">
                                                    {isOutOfRange && <span className="text-muted-foreground/50 text-xs">N/A</span>}
                                                    {!isOutOfRange && !check && <span className="text-muted-foreground text-xs">-</span>}
                                                    {!isOutOfRange && check?.status === 'MATCHED' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                    {!isOutOfRange && check?.status === 'MISSING' && <XCircle className="h-4 w-4 text-red-500" />}
                                                    {!isOutOfRange && check?.status === 'PENDING' && <Clock className="h-4 w-4 text-amber-500" />}
                                                </div>
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>

            <ReconciliationDetailModal
                open={!!selectedCheck}
                onOpenChange={(open) => !open && setSelectedCheck(null)}
                check={selectedCheck?.check || null}
                expense={selectedCheck?.expense || null}
                transactionType={transactionType}
            />
        </div>
    );
}
