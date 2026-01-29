import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface BudgetCellUpdate {
    categoryId: number;
    month: number;
    year: number;
    planned: number;
}

export function useBudgetMutations() {
    const queryClient = useQueryClient();

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
            queryClient.invalidateQueries({ queryKey: ["budget", variables.year] });
        },
    });

    const deleteRecurringExpense = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/budget/recurring/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["budget"] });
        },
    });

    const deletePlannedExpense = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/budget/planned/${id}`);
        },
        onSuccess: (_, variables) => {
            // We might not have access to year here easily if we don't pass it.
            // But we can invalidate all budget queries or strict ones.
            // Budget.tsx passes currentYear to invalidate.
            // We'll trust react-query invalidation.
            queryClient.invalidateQueries({ queryKey: ["budget"] });
        },
    });

    /*
    // Backend endpoints not yet implemented
    const copyBudgetFromYear = useMutation({
      mutationFn: async ({ fromYear, toYear }: { fromYear: number; toYear: number }) => {
        const res = await apiRequest("POST", "/api/budget/copy", { fromYear, toYear });
        return res.json();
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: ["budget", variables.toYear] });
      },
    });
  
    const resetBudgetYear = useMutation({
      mutationFn: async (year: number) => {
        const res = await apiRequest("DELETE", `/api/budget/${year}`);
        return res.json();
      },
      onSuccess: (_, year) => {
        queryClient.invalidateQueries({ queryKey: ["budget", year] });
      },
    });
    */

    return {
        updateBudgetCell,
        deleteRecurringExpense,
        deletePlannedExpense,
        // copyBudgetFromYear,
        // resetBudgetYear,
        isUpdating: updateBudgetCell.isPending,
        isDeletingRecurring: deleteRecurringExpense.isPending,
        isDeletingPlanned: deletePlannedExpense.isPending,
        // isCopying: copyBudgetFromYear.isPending,
        // isResetting: resetBudgetYear.isPending,
    };
}
