import { useQuery } from "@tanstack/react-query";

interface BankConnection {
    id: number;
    institutionId: string;
    institutionName: string;
    requisitionId: string;
    status: string;
    createdAt: string;
    linkedAccounts: number[];
}

export function useBankConnections() {
    return useQuery<BankConnection[]>({
        queryKey: ["/api/gocardless/connections"],
        queryFn: async () => {
            const res = await fetch("/api/gocardless/connections");
            if (!res.ok) throw new Error("Failed to fetch bank connections");
            return res.json();
        },
    });
}
