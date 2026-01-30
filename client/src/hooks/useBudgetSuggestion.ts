import { useFinance } from "@/context/FinanceContext";
import { useMemo } from "react";
import { subMonths, startOfMonth, endOfMonth, isAfter, isBefore } from "date-fns";

interface UseBudgetSuggestionResult {
    suggestion: number | null;
    isLoading: boolean;
    hasData: boolean;
}

export function useBudgetSuggestion(categoryId: number): UseBudgetSuggestionResult {
    const { transactions, isLoading } = useFinance();

    // Calculate average of last 3 completed months
    const suggestion = useMemo(() => {
        if (isLoading || !transactions.length) return null;

        const now = new Date();
        // Get the end of the previous month
        const endOfLastMonth = endOfMonth(subMonths(now, 1));
        // Get the start of 3 months ago (from the previous month)
        // 1 month ago = Sep, 2 = Aug, 3 = Jul.
        const startOfPeriod = startOfMonth(subMonths(now, 3));

        const relevantTransactions = transactions.filter(t => {
            if (t.categoryId !== categoryId) return false;
            const d = new Date(t.date);
            return isAfter(d, startOfPeriod) && isBefore(d, endOfLastMonth);
        });

        // If no transactions found in period, no suggestion
        if (relevantTransactions.length === 0) return 0;

        const total = relevantTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);

        // Average over 3 months
        const average = total / 3;

        // Ceil to nearest integer
        return Math.ceil(average);

    }, [transactions, categoryId, isLoading]);

    const hasData = suggestion !== null && suggestion > 0;

    return { suggestion, isLoading, hasData };
}
