import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface WebhookData {
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
}

export function useWebhookMutations() {
    const queryClient = useQueryClient();

    const invalidateWebhooks = () => {
        queryClient.invalidateQueries({ queryKey: ["/api/webhooks"] });
    };

    const createWebhook = useMutation({
        mutationFn: async (data: WebhookData) => {
            const res = await apiRequest("POST", "/api/webhooks", data);
            return res.json();
        },
        onSuccess: invalidateWebhooks,
    });

    const updateWebhook = useMutation({
        mutationFn: async ({ id, ...data }: Partial<WebhookData> & { id: number }) => {
            const res = await apiRequest("PUT", `/api/webhooks/${id}`, data);
            return res.json();
        },
        onSuccess: invalidateWebhooks,
    });

    const deleteWebhook = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("DELETE", `/api/webhooks/${id}`);
            return res.json();
        },
        onSuccess: invalidateWebhooks,
    });

    const testWebhook = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("POST", `/api/webhooks/${id}/test`);
            return res.json();
        },
    });

    return {
        createWebhook,
        updateWebhook,
        deleteWebhook,
        testWebhook,
        isCreating: createWebhook.isPending,
        isUpdating: updateWebhook.isPending,
        isDeleting: deleteWebhook.isPending,
        isTesting: testWebhook.isPending,
    };
}
