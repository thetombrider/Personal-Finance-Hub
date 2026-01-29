import { useQuery } from "@tanstack/react-query";

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

interface MissingRecurringResponse {
    count: number;
    missing: MissingRecurringTransaction[];
}

export function useMissingRecurringTransactions(enabled: boolean = true) {
    return useQuery<MissingRecurringResponse>({
        queryKey: ["/api/reconciliation/missing"],
        queryFn: async () => {
            const res = await fetch("/api/reconciliation/missing");
            if (!res.ok) throw new Error("Failed to fetch missing recurring transactions");
            return res.json();
        },
        enabled,
    });
}
