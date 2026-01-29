import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { useMissingRecurringTransactions } from "@/hooks/queries";
import { useLocation } from "wouter";
import { CalendarClock, ArrowRight } from "lucide-react";

interface MissingRecurringTransaction {
    id: number;
    recurringExpenseId: number;
    month: number;
    year: number;
    status: string;
    name: string | null;
    amount: string | null;
    dayOfMonth: number | null;
    accountName: string | null;
}

interface MissingRecurringTransactionsModalProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function MissingRecurringTransactionsModal({ isOpen, onOpenChange }: MissingRecurringTransactionsModalProps) {
    const [, setLocation] = useLocation();

    const { data, isLoading } = useMissingRecurringTransactions(isOpen);

    const getExpectedDate = (year: number, month: number, dayOfMonth: number | null): Date | null => {
        if (!dayOfMonth) return null;
        const date = new Date(year, month - 1, dayOfMonth);
        return date;
    };

    const formatExpectedDate = (year: number, month: number, dayOfMonth: number | null) => {
        const date = getExpectedDate(year, month, dayOfMonth);
        if (!date) return "Unknown";
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const getDaysOverdue = (year: number, month: number, dayOfMonth: number | null) => {
        if (!dayOfMonth) return null;
        const expectedDate = getExpectedDate(year, month, dayOfMonth);
        if (!expectedDate) return null;
        const now = new Date();
        const diffTime = now.getTime() - expectedDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const handleGoToBudget = () => {
        onOpenChange(false);
        setLocation('/budget/recurring');
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5 text-amber-500" />
                        Missing Recurring Transactions
                    </DialogTitle>
                    <DialogDescription>
                        The following recurring transactions have not been detected in the last 3 months.
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : data && data.missing.length > 0 ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-muted/50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Transaction</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium">Expected Date</th>
                                        <th className="px-4 py-3 text-right text-sm font-medium">Amount</th>
                                        <th className="px-4 py-3 text-left text-sm font-medium">Account</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {data.missing.map((item) => {
                                        const daysOverdue = getDaysOverdue(item.year, item.month, item.dayOfMonth);
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/30">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{item.name || 'Unknown'}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.year}/{String(item.month).padStart(2, '0')}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {daysOverdue !== null && (
                                                        <span className="text-xs text-amber-600 dark:text-amber-400">
                                                            {daysOverdue > 0
                                                                ? `${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago`
                                                                : 'Expected today'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm">
                                                    <span>Expected: {item.dayOfMonth ? getExpectedDate(item.year, item.month, item.dayOfMonth)?.toLocaleDateString() : 'N/A'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-sm">
                                                    {item.amount ? `€${parseFloat(item.amount).toFixed(2)}` : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    {item.accountName || 'Unknown'}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                            <Button onClick={handleGoToBudget}>
                                Go to Budget Management
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="py-8 text-center text-muted-foreground">
                        <CalendarClock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No missing recurring transactions found.</p>
                        <p className="text-sm mt-1">All expected transactions are up to date!</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
