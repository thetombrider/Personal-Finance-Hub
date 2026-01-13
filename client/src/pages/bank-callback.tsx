import { Progress } from "@/components/ui/progress";

// ... existing imports ...

export default function BankCallbackPage() {
    // ... existing state ...
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState("");

    // ... existing useEffect ...

    const handleSave = async () => {
        setProcessing(true);
        setProgress(0);
        setStatusMessage("Initializing...");

        try {
            // 1. Collect all actions to be performed
            const actions: { type: 'link' | 'create', bankId: string, localId: string | 'new', name: string }[] = [];

            for (const [bankAckId, localAckId] of Object.entries(mappings)) {
                if (localAckId === 'skip') continue;

                const bankAcc = bankAccounts.find((a: any) => a.id === bankAckId);
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
                    const bankAcc = bankAccounts.find((a: any) => a.id === action.bankId);
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
                setStatusMessage(`Syncing transactions for ${action.name}...`);
                try {
                    await apiRequest("POST", `/api/gocardless/sync/${accountId}`);
                } catch (e) {
                    console.error(`Failed to sync account ${accountId}`, e);
                    // Don't fail the whole process if sync fails
                }
                updateProgress(`Synced ${action.name}`);
            }

            setStatusMessage("All done! Redirecting...");
            setProgress(100);

            await new Promise(resolve => setTimeout(resolve, 1000)); // Small delay to see 100%

            toast({
                title: "Success",
                description: "Bank accounts linked and synced successfully.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
            navigate("/accounts"); // Changed setLocation to navigate
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "Failed to link accounts.",
                variant: "destructive",
            });
            setProcessing(false);
        }
    };

    // ... loading and empty checks ...
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
                        <Button onClick={() => navigate("/accounts")}>Go to Accounts</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            {/* ... Existing Card ... */}
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
