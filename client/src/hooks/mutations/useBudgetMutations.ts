import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useInvalidation } from "@/lib/queryInvalidation";

interface BudgetCellUpdate {
    categoryId: number;
    month: number;
    year: number;
    planned: number;
}

export function useBudgetMutations() {
    const { invalidateBudget } = useInvalidation();

    const updateBudgetCell = useMutation({
        mutationFn: async (data: BudgetCellUpdate) => {
            const res = await apiRequest("POST", "/api/budget", {
                categoryId: data.categoryId,
                year: data.year,
                month: data.month,
                amount: data.planned.toString()
            });
            return res.json();
        },
        onSuccess: (_, variables) => {
            invalidateBudget(variables.year);
        },
    });

    const deleteRecurringExpense = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/budget/recurring/${id}`);
        },
        onSuccess: () => {
            invalidateBudget();
        },
    });

    const deletePlannedExpense = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/budget/planned/${id}`);
        },
        onSuccess: () => {
            invalidateBudget();
        },
    });

    return {
        updateBudgetCell,
        deleteRecurringExpense,
        deletePlannedExpense,
        isUpdating: updateBudgetCell.isPending,
        isDeletingRecurring: deleteRecurringExpense.isPending,
        isDeletingPlanned: deletePlannedExpense.isPending,
    };
}
