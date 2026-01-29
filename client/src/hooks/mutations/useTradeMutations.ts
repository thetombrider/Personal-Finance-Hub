import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Trade, Holding } from "@shared/schema";

type CreateTradeData = Omit<Trade, "id" | "userId" | "createdAt" | "transactionId">;

type CreateHoldingData = Omit<Holding, "id" | "userId" | "createdAt" | "currentPrice" | "lastPriceUpdate" | "sector" | "externalId">;

export function useTradeMutations() {
    const queryClient = useQueryClient();

    const invalidatePortfolioQueries = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] }); // Keep generic key if used elsewhere or remove
        queryClient.invalidateQueries({ queryKey: ["/api/holdings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        queryClient.invalidateQueries({ queryKey: ["holdings"] }); // Legacy key?
        queryClient.invalidateQueries({ queryKey: ["trades"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["portfolio-stats"] });
    };

    const createTrade = useMutation({
        mutationFn: async (data: CreateTradeData) => {
            const res = await apiRequest("POST", "/api/trades", data);
            return res.json();
        },
        onSuccess: invalidatePortfolioQueries,
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
        onSuccess: invalidatePortfolioQueries,
    });

    const updateHolding = useMutation({
        mutationFn: async ({ id, ...data }: Partial<Holding> & { id: number }) => {
            const res = await apiRequest("PATCH", `/api/holdings/${id}`, data);
            return res.json();
        },
        onSuccess: invalidatePortfolioQueries,
    });

    const updateTrade = useMutation({
        mutationFn: async ({ id, ...data }: Partial<Trade> & { id: number }) => {
            const res = await apiRequest("PUT", `/api/trades/${id}`, data);
            return res.json();
        },
        onSuccess: invalidatePortfolioQueries,
    });

    const deleteTrade = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/trades/${id}`);
            // res.status is 204, so no JSON content
            return;
        },
        onSuccess: invalidatePortfolioQueries,
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
