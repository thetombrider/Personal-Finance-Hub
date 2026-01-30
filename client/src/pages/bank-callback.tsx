import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError } from "@/lib/toastHelpers";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { type Account } from "@shared/schema";
import { Progress } from "@/components/ui/progress";
import { getErrorMessage } from "@/lib/errors";
import type { BankAccountData } from "@/types/imports";

export default function BankCallbackPage() {
    const [, setLocation] = useLocation();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [bankAccounts, setBankAccounts] = useState<BankAccountData[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({}); // bankAccountId -> localAccountId (or "new")
    const [processing, setProcessing] = useState(false);
    const [bankConnectionId, setBankConnectionId] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");

    // Fetch local accounts
    const { data: localAccounts } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    useEffect(() => {
        // Extract requisition_id from URL
        const params = new URLSearchParams(window.location.search);
        let requisitionId = params.get("requisition_id");
        const error = params.get("error");
        const details = params.get("details");

        if (error) {
            let title = "Bank Connection Failed";
            let description = details || error;

            if (error === "InstitutionTimeoutError") {
                title = "Connection Timed Out";
                description = "The bank took too long to respond. This is common with some banks. Please try connecting again.";
            }

            showError(toast, title, description);
            setLoading(false);
            return;
        }

        // Fallback to session storage if not in URL
        if (!requisitionId) {
            requisitionId = sessionStorage.getItem("gocardless_requisition_id");
        }

        if (!requisitionId) {
            showError(toast, "Error", "Missing requisition ID.");
            setLoading(false);
            return;
        }

        completeRequisition(requisitionId);
    }, []);

    const completeRequisition = async (requisitionId: string) => {
        try {
            // Increase timeout to 120s for bank callbacks which can be slow
            const res = await apiRequest("POST", "/api/gocardless/callback", { requisitionId }, { timeout: 120000 });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to complete requisition");
            }

            const data = await res.json();
            // Data is now { accounts: [...], bankConnectionId: 123 }
            const accounts = data.accounts || []; // Fallback if old API format
            const connectionId = data.bankConnectionId;

            setBankAccounts(accounts);
            if (connectionId) setBankConnectionId(connectionId);

            // Default mappings: "new"
            const newMappings: Record<string, string> = {};
            accounts.forEach((acc: BankAccountData) => newMappings[acc.id] = "new");
            setMappings(newMappings);

        } catch (error) {
            showError(toast, "Connection Failed", getErrorMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setProcessing(true);
        setProgress(0);
        setStatusMessage("Initializing...");

        try {
            // 1. Collect all actions to be performed
            const actions: { type: 'link' | 'create', bankId: string, localId: string | 'new', name: string }[] = [];

            for (const [bankAckId, localAckId] of Object.entries(mappings)) {
                if (localAckId === 'skip') continue;

                const bankAcc = bankAccounts.find((a) => a.id === bankAckId);
                const name = bankAcc ? bankAcc.name : "Bank Account";

                actions.push({
                    type: localAckId === 'new' ? 'create' : 'link',
                    bankId: bankAckId,
                    localId: localAckId,
                    name: name
                });
            }

            const totalSteps = actions.length * 2; // Link + Sync for each
            let completedSteps = 0;

            const updateProgress = (msg: string) => {
                completedSteps++;
                setProgress(Math.round((completedSteps / totalSteps) * 100));
                setStatusMessage(msg);
            };

            // 2. Execute actions
            for (const action of actions) {
                let accountId: number;

                // Step A: Link/Create Account
                setStatusMessage(`Linking ${action.name}...`);

                if (action.type === 'create') {
                    const bankAcc = bankAccounts.find((a) => a.id === action.bankId);
                    const currency = bankAcc ? bankAcc.currency : "EUR";

                    const res = await apiRequest("POST", "/api/accounts", {
                        name: action.name,
                        type: "checking",
                        startingBalance: "0",
                        currency: currency,
                        color: "#000000",
                        gocardlessAccountId: action.bankId,
                        bankConnectionId: bankConnectionId
                    });
                    const data = await res.json();
                    accountId = data.id;
                } else {
                    const res = await apiRequest("POST", "/api/gocardless/accounts/link", {
                        accountId: parseInt(action.localId),
                        gocardlessAccountId: action.bankId,
                        bankConnectionId: bankConnectionId
                    });
                    const data = await res.json();
                    accountId = data.id;
                }

                updateProgress(`Linked ${action.name}`);

                // Step B: Sync Transactions
                // Book directly if this is a newly created account (no existing transactions by definition)
                const shouldBookDirectly = action.type === 'create';

                setStatusMessage(`Syncing transactions for ${action.name}...`);
                try {
                    const syncRes = await apiRequest("POST", `/api/gocardless/sync/${accountId}`, {
                        bookDirectly: shouldBookDirectly
                    });
                    const syncData = await syncRes.json();

                    if (syncData.warning === "transaction_access_denied") {
                        showSuccess(toast, "Limited Access", `Connected to ${action.name}, but transaction history could not be retrieved. Balance availability depends on bank support.`);
                    }
                } catch (error) {
                    console.error(`Failed to sync account ${accountId}`, error);
                    // Don't fail the whole process if sync fails
                }
                updateProgress(`Synced ${action.name}`);
            }

            setStatusMessage("All done! Redirecting...");
            setProgress(100);

            await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay to see 100%

            showSuccess(toast, "Success", "Bank accounts linked and synced successfully.");
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            setLocation("/settings/accounts");
        } catch (error) {
            console.error(error);
            showError(toast, "Error", "Failed to link accounts.");
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                <Card className="w-full max-w-lg mx-4 shadow-lg animate-in fade-in zoom-in-50 duration-300">
                    <CardHeader>
                        <CardTitle>Loading Bank Accounts</CardTitle>
                        <CardDescription>
                            Please wait while we fetch your bank account details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!bankAccounts || bankAccounts.length === 0) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
                <Card className="w-full max-w-lg mx-4 shadow-lg animate-in fade-in zoom-in-50 duration-300">
                    <CardHeader>
                        <CardTitle>No Accounts Found</CardTitle>
                        <CardDescription>
                            We couldn't find any accounts from your bank. Please try connecting again.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex justify-end pt-4">
                        <Button onClick={() => setLocation("/settings/accounts")}>Go to Accounts</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            <Card className="w-full max-w-lg mx-4 shadow-lg animate-in fade-in zoom-in-50 duration-300">
                <CardHeader>
                    <CardTitle>Link Accounts</CardTitle>
                    <CardDescription>
                        We found the following accounts from your bank. Choose how to map them to your local accounts.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 max-h-[80vh] overflow-y-auto">
                    {bankAccounts.map((account) => {
                        const selectedInOtherRows = Object.entries(mappings)
                            .filter(([accId, val]) => accId !== account.id && val !== "new" && val !== "skip")
                            .map(([, val]) => val);

                        const availableLocalAccounts = localAccounts?.filter(local =>
                            !selectedInOtherRows.includes(local.id.toString())
                        );

                        return (
                            <div key={account.id} className="flex flex-col gap-2 p-4 border rounded-lg bg-muted/20">
                                <div className="font-medium flex justify-between items-center">
                                    <span>{account.name}</span>
                                    {account.currency && <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">{account.currency}</span>}
                                </div>
                                {account.iban && <div className="text-xs text-muted-foreground font-mono">{account.iban}</div>}

                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-sm text-muted-foreground whitespace-nowrap w-16">Map to:</span>
                                    <Select
                                        value={mappings[account.id] || "new"}
                                        onValueChange={(val) => setMappings({ ...mappings, [account.id]: val })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="new">Create New Account</SelectItem>
                                            <SelectItem value="skip">Do Not Import</SelectItem>
                                            {availableLocalAccounts?.map((local) => (
                                                <SelectItem key={local.id} value={local.id.toString()}>
                                                    Link to: {local.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        );
                    })}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setLocation("/settings/accounts")} disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save & Continue
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Progress Overlay */}
            {processing && (
                <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-background/95 p-8 rounded-xl shadow-2xl flex flex-col items-center gap-6 max-w-sm w-full text-center border">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        <div className="space-y-2 w-full">
                            <h3 className="font-semibold text-lg">{statusMessage}</h3>
                            <Progress value={progress} className="w-full h-2" />
                            <p className="text-muted-foreground text-xs">{progress}% Complete</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
