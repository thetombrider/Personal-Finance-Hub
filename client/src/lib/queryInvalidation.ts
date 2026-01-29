import { QueryClient, useQueryClient } from "@tanstack/react-query";

/**
 * Invalidation helpers for consistent cache management
 */
export const invalidationHelpers = {
    /**
     * Invalidate all transaction-related queries
     */
    transactions: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] }); // Legacy key?
        queryClient.invalidateQueries({ queryKey: ["accounts"] }); // Legacy key?
    },

    /**
     * Invalidate all account-related queries
     */
    accounts: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },

    /**
     * Invalidate budget for a specific year
     */
    budget: (queryClient: QueryClient, year?: number) => {
        if (year) {
            queryClient.invalidateQueries({ queryKey: ["budget", year] });
        } else {
            queryClient.invalidateQueries({ queryKey: ["budget"] });
        }
        // Also invalidate dashboard which may show budget summaries
        queryClient.invalidateQueries({ queryKey: ["/api/reports/summary"] });
    },

    /**
     * Invalidate all portfolio-related queries
     */
    portfolio: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/holdings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/portfolio/trades"] });
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },

    /**
     * Invalidate staging transactions
     */
    staging: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
    },

    /**
     * Invalidate category-related queries
     */
    categories: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["categories"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["budget"] });
    },

    /**
     * Invalidate tag-related queries
     */
    tags: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["tags"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },

    /**
     * Invalidate recurring expense/income queries
     */
    recurring: (queryClient: QueryClient) => {
        queryClient.invalidateQueries({ queryKey: ["/api/recurring"] });
        queryClient.invalidateQueries({ queryKey: ["/api/recurring/missing"] });
        queryClient.invalidateQueries({ queryKey: ["budget"] });
    },

    /**
     * Full refresh - use sparingly
     */
    all: (queryClient: QueryClient) => {
        queryClient.invalidateQueries();
    },
};

/**
 * Hook for using invalidation helpers with built-in queryClient
 */
export function useInvalidation() {
    const queryClient = useQueryClient();

    return {
        invalidateTransactions: () => invalidationHelpers.transactions(queryClient),
        invalidateAccounts: () => invalidationHelpers.accounts(queryClient),
        invalidateBudget: (year?: number) => invalidationHelpers.budget(queryClient, year),
        invalidatePortfolio: () => invalidationHelpers.portfolio(queryClient),
        invalidateStaging: () => invalidationHelpers.staging(queryClient),
        invalidateCategories: () => invalidationHelpers.categories(queryClient),
        invalidateTags: () => invalidationHelpers.tags(queryClient),
        invalidateRecurring: () => invalidationHelpers.recurring(queryClient),
        invalidateAll: () => invalidationHelpers.all(queryClient),
    };
}
