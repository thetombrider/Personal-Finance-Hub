
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RecurringExpense, RecurringExpenseCheck } from "@shared/schema";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

interface ReconciliationDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    check: RecurringExpenseCheck | null;
    expense: RecurringExpense | null;
    transactionType: 'income' | 'expense';
}

export function ReconciliationDetailModal({ open, onOpenChange, check, expense, transactionType }: ReconciliationDetailModalProps) {
    if (!check || !expense) return null;

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "MATCHED": return <CheckCircle2 className="h-12 w-12 text-green-500 mb-2" />;
            case "MISSING": return <XCircle className="h-12 w-12 text-red-500 mb-2" />;
            case "PENDING": return <Clock className="h-12 w-12 text-yellow-500 mb-2" />;
            default: return null;
        }
    };

    const typeLabel = transactionType === 'income' ? 'Income' : 'Expense';
    const typeLabelLower = transactionType === 'income' ? 'income' : 'expense';

    const statusText = {
        MATCHED: `${typeLabel} Matched`,
        MISSING: `${typeLabel} Missing`,
        PENDING: "Upcoming"
    }[check.status] || check.status;

    const statusDescription = {
        MATCHED: `We found a matching transaction for this recurring ${typeLabelLower}.`,
        MISSING: `We could not find a transaction matching this ${typeLabelLower} within the expected window.`,
        PENDING: `This ${typeLabelLower} is expected later this month.`
    }[check.status];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex flex-col items-center justify-center p-4">
                        {getStatusIcon(check.status)}
                        <DialogTitle className="text-xl">{statusText}</DialogTitle>
                        <DialogDescription className="text-center">{statusDescription}</DialogDescription>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="font-semibold">Recurring {typeLabel}</div>
                        <div className="text-right">{expense.name}</div>

                        <div className="font-semibold">Expected Date</div>
                        <div className="text-right">
                            {format(new Date(check.year, check.month - 1, expense.dayOfMonth), "PPP")}
                        </div>

                        <div className="font-semibold">Expected Amount</div>
                        <div className="text-right">{expense.amount} {expense.id}</div>

                        <div className="col-span-2 border-t my-2" />

                        {check.status === "MATCHED" && (
                            <>
                                <div className="font-semibold">Matched Transaction Date</div>
                                <div className="text-right">{check.matchedDate ? format(new Date(check.matchedDate), "PPP") : "-"}</div>

                                <div className="font-semibold">Matched Amount</div>
                                <div className="text-right">{check.matchedAmount}</div>
                            </>
                        )}
                        {check.status === "MISSING" && (
                            <>
                                <div className="col-span-2 text-muted-foreground text-xs">
                                    Checked dates between {format(new Date(check.year, check.month - 1, expense.dayOfMonth - 5), "dd MMM")} and {format(new Date(check.year, check.month - 1, expense.dayOfMonth + 5), "dd MMM")}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
