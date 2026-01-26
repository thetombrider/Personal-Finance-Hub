import { TrendingUp, Briefcase, ArrowUpDown, DollarSign, ArrowRight, Receipt } from "lucide-react";

export function PortfolioStep() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Portfolio: Investment Tracking
                </h2>
                <p className="text-muted-foreground">
                    Track your investment holdings, trades, and performance with real-time market data.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col items-center text-center p-5 rounded-xl border bg-card">
                    <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center mb-3">
                        <Briefcase className="h-6 w-6 text-blue-500" />
                    </div>
                    <p className="font-semibold text-foreground">Holdings</p>
                    <p className="text-sm text-muted-foreground mt-1 text-balance">
                        Actual stocks & ETFs you own. Prices update automatically via Yahoo Finance.
                    </p>
                </div>

                <div className="flex flex-col items-center text-center p-5 rounded-xl border bg-card">
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center mb-3">
                        <ArrowUpDown className="h-6 w-6 text-purple-500" />
                    </div>
                    <p className="font-semibold text-foreground">Trades</p>
                    <p className="text-sm text-muted-foreground mt-1 text-balance">
                        Your buy/sell history. Essential for calculating performance and cost basis.
                    </p>
                </div>
            </div>

            {/* Important behavior callout */}
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <Receipt className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-blue-600 mb-1">Trades Create Transactions</p>
                    <p className="text-blue-600/80">
                        Adding a trade automatically creates a transaction in your account.
                        This keeps your cash balance in sync with your investments.
                    </p>
                </div>
            </div>

            {/* Visual diagram */}
            <div className="bg-muted/30 border rounded-xl p-4">
                <div className="flex items-center justify-center gap-3">
                    <div className="flex flex-col items-center gap-1 p-2 px-3 bg-background rounded-lg border text-center shadow-sm">
                        <ArrowUpDown className="h-4 w-4 text-purple-500" />
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Add Trade</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    <div className="flex flex-col items-center gap-1 p-2 px-3 bg-primary/5 border border-primary/20 rounded-lg text-center shadow-sm">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-medium uppercase tracking-wider text-primary">Auto Transaction</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    <div className="flex flex-col items-center gap-1 p-2 px-3 bg-background rounded-lg border text-center shadow-sm">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Balance Updated</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
