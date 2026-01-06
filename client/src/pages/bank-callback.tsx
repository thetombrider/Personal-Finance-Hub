import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { type Account } from "@shared/schema";

export default function BankCallbackPage() {
    const [location, setLocation] = useLocation();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [bankAccounts, setBankAccounts] = useState<any[]>([]);
    const [mappings, setMappings] = useState<Record<string, string>>({}); // bankAccountId -> localAccountId (or "new")
    const [processing, setProcessing] = useState(false);

    // Fetch local accounts
    const { data: localAccounts } = useQuery<Account[]>({
        queryKey: ["/api/accounts"],
    });

    useEffect(() => {
        // Extract requisition_id from URL
        // wouter location doesn't give query params directly easily, use window.location
        const params = new URLSearchParams(window.location.search);
        let requisitionId = params.get("requisition_id");

        // Fallback to session storage if not in URL
        if (!requisitionId) {
            requisitionId = sessionStorage.getItem("gocardless_requisition_id");
        }

        if (!requisitionId) {
            toast({
                title: "Error",
                description: "Missing requisition ID.",
                variant: "destructive",
            });
            setLoading(false);
            return;
        }

        completeRequisition(requisitionId);
    }, []);

    const completeRequisition = async (requisitionId: string) => {
        try {
            const res = await apiRequest("POST", "/api/gocardless/requisition/complete", { requisitionId });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to complete requisition");
            }

            const accounts = await res.json();
            // The API now returns enriched account objects { id, name, iban ... }
            setBankAccounts(accounts);

            // Default mappings: "new"
            const newMappings: Record<string, string> = {};
            accounts.forEach((acc: any) => newMappings[acc.id] = "new");
            setMappings(newMappings);

        } catch (error) {
            toast({
                title: "Connection Failed",
                description: "Could not retrieve bank accounts.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setProcessing(true);
        try {
            for (const [bankAckId, localAckId] of Object.entries(mappings)) {
                if (localAckId === "new") {
                    // Find details from state
                    const bankAcc = bankAccounts.find((a: any) => a.id === bankAckId);
                    const name = bankAcc ? bankAcc.name : "New Bank Account";
                    const currency = bankAcc ? bankAcc.currency : "EUR";

                    await apiRequest("POST", "/api/accounts", {
                        name: name,
                        type: "bank",
                        startingBalance: "0",
                        currency: currency,
                        color: "#000000",
                        gocardlessAccountId: bankAckId
                    });
                } else if (localAckId !== "skip") {
                    await apiRequest("POST", "/api/gocardless/accounts/link", {
                        accountId: parseInt(localAckId),
                        gocardlessAccountId: bankAckId
                    });
                }
            }

            toast({
                title: "Success",
                description: "Bank accounts linked successfully.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            setLocation("/accounts");
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to link accounts.",
                variant: "destructive",
            });
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Verifying bank connection...</p>
            </div>
        );
    }

    if (bankAccounts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-muted-foreground">No accounts found or connection failed.</p>
                <Button onClick={() => setLocation("/accounts")}>Back to Accounts</Button>
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
                    {bankAccounts.map((account) => (
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
                                        {localAccounts?.map((local) => (
                                            <SelectItem key={local.id} value={local.id.toString()}>
                                                Link to: {local.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    ))}

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setLocation("/accounts")} disabled={processing}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} disabled={processing}>
                            {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save & Continue
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
