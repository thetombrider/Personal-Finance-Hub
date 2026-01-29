import { useQuery } from "@tanstack/react-query";
import { RecurringExpenseCheck } from "@shared/schema";

export function useReconciliationChecks() {
    return useQuery<RecurringExpenseCheck[]>({
        queryKey: ['reconciliation', 'all'],
        queryFn: async () => {
            const res = await fetch('/api/reconciliation/checks');
            if (!res.ok) throw new Error('Failed to fetch checks');
            return res.json();
        }
    });
}
