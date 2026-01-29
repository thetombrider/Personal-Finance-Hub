import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ApproveTransactionData {
    stagingId: number;
    categoryId: number;
    description?: string;
    tags?: number[];
}

export function useStagingMutations() {
    const queryClient = useQueryClient();

    const invalidateStagingQueries = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/transactions/staging"] });
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
    };

    const approveTransaction = useMutation({
        mutationFn: async (data: ApproveTransactionData) => {
            const res = await apiRequest("POST", `/api/transactions/staging/${data.stagingId}/approve`, data);
            return res.json();
        },
        onSuccess: invalidateStagingQueries,
    });

    const dismissTransaction = useMutation({
        mutationFn: async (stagingId: number) => {
            const res = await apiRequest("PUT", `/api/transactions/staging/${stagingId}/dismiss`);
            return res.json();
        },
        onSuccess: invalidateStagingQueries,
    });

    const restoreTransaction = useMutation({
        mutationFn: async (stagingId: number) => {
            const res = await apiRequest("PUT", `/api/transactions/staging/${stagingId}/restore`);
            return res.json();
        },
        onSuccess: invalidateStagingQueries,
    });

    const bulkApprove = useMutation({
        mutationFn: async (transactions: ApproveTransactionData[]) => {
            const res = await apiRequest("POST", "/api/transactions/staging/bulk-approve", { transactions });
            return res.json();
        },
        onSuccess: invalidateStagingQueries,
    });

    const bulkDismiss = useMutation({
        mutationFn: async (stagingIds: number[]) => {
            const res = await apiRequest("PUT", "/api/transactions/staging/bulk-dismiss", { ids: stagingIds });
            return res.json();
        },
        onSuccess: invalidateStagingQueries,
    });

    const bulkDelete = useMutation({
        mutationFn: async (stagingIds: number[]) => {
            const res = await apiRequest("POST", "/api/transactions/staging/bulk-delete", { ids: stagingIds });
            return res.json();
        },
        onSuccess: invalidateStagingQueries,
    });

    return {
        approveTransaction,
        dismissTransaction,
        restoreTransaction,
        bulkApprove,
        bulkDismiss,
        bulkDelete,
        isApproving: approveTransaction.isPending,
        isDismissing: dismissTransaction.isPending,
        isRestoring: restoreTransaction.isPending,
        isBulkDeleting: bulkDelete.isPending,
    };
}
