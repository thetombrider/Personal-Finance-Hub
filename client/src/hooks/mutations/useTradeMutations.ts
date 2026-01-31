import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Trade, Holding } from "@shared/schema";
import { useInvalidation } from "@/lib/queryInvalidation";

type CreateTradeData = Omit<Trade, "id" | "userId" | "createdAt" | "transactionId">;

type CreateHoldingData = Omit<Holding, "id" | "userId" | "createdAt" | "currentPrice" | "lastPriceUpdate" | "sector" | "externalId">;

export function useTradeMutations() {
    const { invalidatePortfolio } = useInvalidation();

    const createTrade = useMutation({
        mutationFn: async (data: CreateTradeData) => {
            const res = await apiRequest("POST", "/api/trades", data);
            return res.json();
        },
        onSuccess: invalidatePortfolio,
    });

    const createHolding = useMutation({
        mutationFn: async (data: CreateHoldingData) => {
            // Use fetch directly to handle 409 (Conflict) which returns the existing holding
            const res = await fetch("/api/holdings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
                credentials: "include",
            });

            if (res.status === 409) {
                const json = await res.json();
                return json.holding;
            }

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`${res.status}: ${text}`);
            }

            return res.json();
        },
        onSuccess: invalidatePortfolio,
    });

    const updateHolding = useMutation({
        mutationFn: async ({ id, ...data }: Partial<Holding> & { id: number }) => {
            const res = await apiRequest("PATCH", `/api/holdings/${id}`, data);
            return res.json();
        },
        onSuccess: invalidatePortfolio,
    });

    const updateTrade = useMutation({
        mutationFn: async ({ id, ...data }: Partial<Trade> & { id: number }) => {
            const res = await apiRequest("PUT", `/api/trades/${id}`, data);
            return res.json();
        },
        onSuccess: invalidatePortfolio,
    });

    const deleteTrade = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/trades/${id}`);
            // res.status is 204, so no JSON content
            return;
        },
        onSuccess: invalidatePortfolio,
    });


    return {
        createTrade,
        updateTrade,
        deleteTrade,
        createHolding,
        updateHolding,
        isCreating: createTrade.isPending,
        isUpdating: updateTrade.isPending,
        isDeleting: deleteTrade.isPending,
        isCreatingHolding: createHolding.isPending,
        isUpdatingHolding: updateHolding.isPending,
    };
}
