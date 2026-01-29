import { useQuery } from "@tanstack/react-query";
import type { Category, PlannedExpense, RecurringExpense } from "@shared/schema";

interface YearlyBudgetData {
    categories: Category[];
    budgetData: Record<number, Record<number, any>>;
    plannedExpenses: PlannedExpense[];
    recurringExpenses: RecurringExpense[];
}

export function useBudgetData(year: number) {
    return useQuery<YearlyBudgetData>({
        queryKey: ['budget', year],
        queryFn: async () => {
            const res = await fetch(`/api/budget/${year}`);
            if (!res.ok) throw new Error('Failed to fetch budget');
            return res.json();
        },
        enabled: !!year,
    });
}
