
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { Account } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { invalidationHelpers } from "@/lib/queryInvalidation";
import { useQueryClient } from "@tanstack/react-query";
import { showError, showSuccess } from "@/lib/toastHelpers";
import { cn } from "@/lib/utils";

interface SyncAccountsButtonProps {
    accounts: Account[];
    className?: string;
    size?: "default" | "sm" | "lg" | "icon";
}

export function SyncAccountsButton({ accounts, className, size = "icon" }: SyncAccountsButtonProps) {
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncProgress, setSyncProgress] = useState(0);

    const handleSyncAll = async () => {
        const linkedAccounts = accounts.filter(a => a.gocardlessAccountId);
        if (linkedAccounts.length === 0) {
            showError(toast, "No linked accounts", "Link a bank account first.");
            return;
        }

        setIsSyncingAll(true);
        setSyncProgress(0);
        let completed = 0;
        let errors = 0;

        for (const account of linkedAccounts) {
            try {
                await apiRequest("POST", `/api/gocardless/sync/${account.id}`);
            } catch (error) {
                console.error(`Failed to sync account ${account.name}`, error);
                errors++;
            } finally {
                completed++;
                setSyncProgress((completed / linkedAccounts.length) * 100);
            }
        }

        invalidationHelpers.transactions(queryClient);

        setIsSyncingAll(false);
        if (errors > 0) {
            showError(toast, "Sync Complete", `Synced ${linkedAccounts.length} accounts. ${errors} failed.`);
        } else {
            showSuccess(toast, "Sync Complete", `Synced ${linkedAccounts.length} accounts. All successful.`);
        }
    };

    return (
        <Button
            variant="outline"
            size={size}
            className={cn("relative overflow-hidden", className)}
            onClick={handleSyncAll}
            disabled={isSyncingAll}
            title={isSyncingAll ? `Syncing ${Math.round(syncProgress)}%` : "Sync All Accounts"}
        >
            {isSyncingAll && (
                <div
                    className="absolute inset-0 bg-primary/10 transition-all duration-300 ease-in-out"
                    style={{ width: `${syncProgress}%` }}
                />
            )}
            <RefreshCw size={16} className={isSyncingAll ? "animate-spin" : ""} />
        </Button>
    );
}
