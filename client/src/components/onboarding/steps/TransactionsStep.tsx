import { Receipt, Tag, ArrowRight, Landmark, Tags as TagsIcon } from "lucide-react";

export function TransactionsStep() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Transactions: The Heart of Tracking
                </h2>
                <p className="text-muted-foreground">
                    Transactions record every movement of money. Each transaction connects an account, a category, and an amount.
                </p>
            </div>

            {/* Visual diagram */}
            <div className="bg-muted/30 border rounded-xl p-6">
                <div className="flex items-center justify-center gap-4 sm:gap-6 flex-wrap">
                    <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border shadow-sm w-24">
                        <Landmark className="h-6 w-6 text-blue-500" />
                        <span className="text-xs font-semibold">Account</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    <div className="flex flex-col items-center gap-2 p-4 bg-primary/5 rounded-xl border border-primary/20 shadow-sm w-28">
                        <Receipt className="h-6 w-6 text-primary" />
                        <span className="text-xs font-semibold text-primary">Transaction</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
                    <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border shadow-sm w-24">
                        <TagsIcon className="h-6 w-6 text-green-500" />
                        <span className="text-xs font-semibold">Category</span>
                    </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mt-4 font-medium">
                    Every transaction belongs to an account and a category
                </p>
            </div>

            <div className="border rounded-xl p-4 bg-card/50">
                <div className="flex items-start gap-4">
                    <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Tag className="h-5 w-5 text-indigo-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-indigo-600">Tags for Cross-Category Tracking</p>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                            Tags let you group transactions across different categories. For example,
                            tag all "Vacation" expenses - whether they're flights (Travel), restaurants (Food),
                            or hotels (Accommodation) - to see your total vacation spending.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex gap-3">
                <Landmark className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-green-600 mb-1">Your Net Worth</p>
                    <p className="text-green-600/80">
                        Net Worth = Sum of all account balances. As you add transactions,
                        FinTrack automatically updates your total net worth on the dashboard.
                    </p>
                </div>
            </div>
        </div>
    );
}
