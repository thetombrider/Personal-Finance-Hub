import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import { useMemo, useState } from "react";
import { subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";

interface BudgetSuggestionPopoverProps {
    categoryId: number;
    onApply: (amount: number) => void;
    currentValue: number;
}

export function BudgetSuggestionPopover({ categoryId, onApply, currentValue }: BudgetSuggestionPopoverProps) {
    const { transactions, isLoading, formatCurrency } = useFinance();
    const [isOpen, setIsOpen] = useState(false);

    // Calculate average of last 3 completed months
    // We use current date as anchor.
    // Last 3 months means: previous month, the one before, and the one before that.
    // e.g., if today is Oct 15, we look at Sep, Aug, Jul.
    const suggestion = useMemo(() => {
        if (isLoading || !transactions.length) return null;

        const now = new Date();
        // Get the end of the previous month
        const endOfLastMonth = endOfMonth(subMonths(now, 1));
        // Get the start of 3 months ago (from the previous month)
        // 1 month ago = Sep, 2 = Aug, 3 = Jul.
        // So start of month for (now - 3 months)
        const startOfPeriod = startOfMonth(subMonths(now, 3));

        const relevantTransactions = transactions.filter(t => {
            if (t.categoryId !== categoryId) return false;
            const d = new Date(t.date);
            // We only care about expenses for budget suggestions essentially
            // But maybe income too? The component is generic.
            // Usually budget is about expenses. If type is income, we sum it positive.
            // If type is expense, we sum it negative (usually stored as positive in DB but typed).
            // Let's assume absolute amounts for magnitude.

            return isAfter(d, startOfPeriod) && isBefore(d, endOfLastMonth); // Inclusive check often needed, date-fns is strict
        });

        const total = relevantTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);

        // Average over 3 months
        const average = total / 3;

        // Round to nearest 10 or 50? Let's keep it precise but integer?
        // Let's ceil to nearest integer.
        return Math.ceil(average);

    }, [transactions, categoryId, isLoading]);

    const hasData = suggestion !== null && suggestion > 0;

    if (!hasData) return null;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 hover:bg-primary/20"
                    onClick={(e) => e.stopPropagation()} // Prevent row click if any
                    tabIndex={-1}
                >
                    <Sparkles className="h-3 w-3 text-primary" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-3" align="start">
                <div className="space-y-2">
                    <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">Suggestion</h4>
                    <div className="flex items-center justify-between">
                        <span className="text-sm">3-Month Avg:</span>
                        <span className="font-bold font-mono">{formatCurrency(suggestion)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        Based on transactions from last 3 complete months.
                    </p>
                    <Button
                        size="sm"
                        className="w-full h-8 text-xs mt-2"
                        onClick={() => {
                            onApply(suggestion);
                            setIsOpen(false);
                        }}
                    >
                        Apply Suggestion
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
