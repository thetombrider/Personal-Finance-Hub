import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function usePendingStagingCount() {
    return useQuery({
        queryKey: ["/api/transactions/staging", "count"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/transactions/staging?status=pending");
            const data = await res.json();
            return Array.isArray(data) ? data.length : 0;
        },
    });
}
