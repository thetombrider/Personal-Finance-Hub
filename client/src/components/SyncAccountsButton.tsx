
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Account } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidationHelpers } from "@/lib/queryInvalidation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/lib/toastHelpers";
import { cn } from "@/lib/utils";

interface SyncStatus {
    isSyncing: boolean;
    progress: number;
    total: number;
    completed: number;
    currentAccount?: string;
    lastError?: string;
}

interface SyncAccountsButtonProps {
    accounts: Account[];
    className?: string;
    size?: "default" | "sm" | "lg" | "icon";
}

export function SyncAccountsButton({ accounts, className, size = "icon" }: SyncAccountsButtonProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [justFinished, setJustFinished] = useState(false);

    // Poll for sync status
    const { data: status, refetch } = useQuery<SyncStatus>({
        queryKey: ["/api/gocardless/sync/status"],
        refetchInterval: (data) => (data?.state?.data?.isSyncing ? 1000 : false),
        refetchOnWindowFocus: true,
    });

    const isSyncing = status?.isSyncing || false;
    const progress = status?.progress || 0;

    // React to completion
    useEffect(() => {
        if (justFinished && !isSyncing) {
            invalidationHelpers.transactions(queryClient);

            if (status?.lastError) {
                showError(toast, "Sync Completed with Errors", status.lastError);
            } else {
                showSuccess(toast, "Sync Complete", "All accounts synced successfully.");
            }
            setJustFinished(false);
        }

        if (isSyncing) {
            setJustFinished(true);
        }
    }, [isSyncing, justFinished, queryClient, toast, status?.lastError]);

    const handleSyncAll = async () => {
        const linkedAccounts = accounts.filter(a => a.gocardlessAccountId);
        if (linkedAccounts.length === 0) {
            showError(toast, "No linked accounts", "Link a bank account first.");
            return;
        }

        try {
            await apiRequest("POST", "/api/gocardless/sync");
            await refetch();
            showSuccess(toast, "Sync Started", "You can navigate away while we sync your accounts.");
        } catch (error) {
            console.error("Failed to start sync", error);
            showError(toast, "Sync Failed", "Could not start background sync.");
        }
    };

    return (
        <Button
            variant="outline"
            size={size}
            className={cn("relative overflow-hidden", className)}
            onClick={handleSyncAll}
            disabled={isSyncing}
            title={isSyncing ? `Syncing ${status?.currentAccount || ""} (${Math.round(progress)}%)` : "Sync All Accounts"}
        >
            {isSyncing && (
                <div
                    className="absolute inset-0 bg-primary/10 transition-all duration-300 ease-in-out"
                    style={{ width: `${progress}%` }}
                />
            )}
            <RefreshCw size={16} className={isSyncing ? "animate-spin" : ""} />
        </Button>
    );
}
