import { useState } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useOnboarding } from "@/context/OnboardingContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Landmark, PiggyBank, CreditCard, TrendingUp, Wallet, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const accountTypes = [
    { value: "checking", label: "Checking", icon: Landmark },
    { value: "savings", label: "Savings", icon: PiggyBank },
    { value: "credit", label: "Credit Card", icon: CreditCard },
    { value: "investment", label: "Investment", icon: TrendingUp },
    { value: "cash", label: "Cash", icon: Wallet },
];

const defaultColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function SetupAccountStep() {
    const { accounts, addAccount } = useFinance();
    const { nextStep } = useOnboarding();
    const { toast } = useToast();

    const [name, setName] = useState("");
    const [type, setType] = useState("checking");
    const [startingBalance, setStartingBalance] = useState("0");
    const [color, setColor] = useState(defaultColors[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createdAccount, setCreatedAccount] = useState<string | null>(null);

    const handleCreate = async () => {
        if (!name.trim()) {
            toast({ title: "Please enter an account name", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            await addAccount({
                name: name.trim(),
                type: type as any,
                startingBalance: startingBalance || "0",
                currency: "EUR",
                color,
            });
            setCreatedAccount(name);
            toast({ title: "Account created!", description: `${name} has been added to your accounts.` });
        } catch (error) {
            toast({ title: "Error creating account", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const hasExistingAccounts = accounts.length > 0;

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    Create Your First Account
                </h2>
                <p className="text-muted-foreground">
                    Let's set up your first account to start tracking. You can add more accounts later in Settings.
                </p>
            </div>

            {createdAccount ? (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-8 text-center animate-in fade-in zoom-in-95 duration-300">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-700">Account Created!</h3>
                    <p className="text-green-600/90 mt-2 font-medium">"{createdAccount}" is ready.</p>
                    <p className="text-sm text-muted-foreground mt-4">
                        Click Next to continue setup.
                    </p>
                </div>
            ) : hasExistingAccounts ? (
                <div className="bg-muted/50 border rounded-xl p-6 text-center">
                    <p className="text-muted-foreground font-medium">
                        You already have {accounts.length} account{accounts.length > 1 ? "s" : ""} set up.
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                        Click Next to continue, or create another account below.
                    </p>
                </div>
            ) : null}

            {!createdAccount && (
                <div className="space-y-4 border rounded-xl p-5 bg-card/50 shadow-sm">
                    <div className="space-y-2">
                        <Label htmlFor="account-name">Account Name</Label>
                        <Input
                            id="account-name"
                            placeholder="e.g. Main Checking, Savings Account"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-background"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Account Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="bg-background">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {accountTypes.map((t) => (
                                        <SelectItem key={t.value} value={t.value}>
                                            <div className="flex items-center gap-2">
                                                <t.icon className="h-4 w-4 text-muted-foreground" />
                                                {t.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="starting-balance">Starting Balance</Label>
                            <Input
                                id="starting-balance"
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={startingBalance}
                                onChange={(e) => setStartingBalance(e.target.value)}
                                className="bg-background"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Color</Label>
                        <div className="flex gap-2">
                            {defaultColors.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    className={`h-8 w-8 rounded-full transition-all border-2 border-transparent ${color === c ? "scale-110 !border-background ring-2 ring-offset-2 ring-primary shadow-sm" : "hover:scale-105 hover:shadow-sm"
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <Button
                        onClick={handleCreate}
                        disabled={isSubmitting || !name.trim()}
                        className="w-full mt-2"
                        size="lg"
                    >
                        {isSubmitting ? "Creating..." : "Create Account"}
                    </Button>
                </div>
            )}
            {(hasExistingAccounts || createdAccount) && (
                <p className="text-sm text-center text-muted-foreground">
                    You can manage all your accounts in <strong>Settings → Account Management</strong>
                </p>
            )}
        </div>
    );
}
