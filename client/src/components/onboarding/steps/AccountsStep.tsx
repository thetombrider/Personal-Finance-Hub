import { Landmark, CreditCard, PiggyBank, TrendingUp, Wallet } from "lucide-react";

export function AccountsStep() {
    const accountTypes = [
        { icon: Landmark, name: "Checking", description: "Daily spending accounts" },
        { icon: PiggyBank, name: "Savings", description: "Money set aside for goals" },
        { icon: CreditCard, name: "Credit", description: "Credit cards with limits" },
        { icon: TrendingUp, name: "Investment", description: "Brokerage and retirement" },
        { icon: Wallet, name: "Cash", description: "Physical cash on hand" },
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Landmark className="h-5 w-5 text-primary" />
                    Accounts: Your Financial Containers
                </h2>
                <p className="text-muted-foreground">
                    Accounts are where your money lives. Each account has a starting balance and tracks all money flowing in and out.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {accountTypes.map((type) => (
                    <div
                        key={type.name}
                        className="flex items-start gap-3 p-3 rounded-xl border bg-card hover:bg-accent/5 transition-colors"
                    >
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                            <type.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{type.name}</p>
                            <p className="text-xs text-muted-foreground leading-snug">{type.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <Landmark className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-blue-600 mb-1">How balances work</p>
                    <p className="text-blue-600/80">
                        Account balance = Starting Balance + Sum of all transactions.
                        FinTrack automatically calculates real-time balances.
                    </p>
                </div>
            </div>
        </div>
    );
}
