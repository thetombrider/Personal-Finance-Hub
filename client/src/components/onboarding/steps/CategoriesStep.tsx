import { Tags, ArrowDown, ArrowUp, ArrowLeftRight } from "lucide-react";

export function CategoriesStep() {
    const categoryTypes = [
        {
            icon: ArrowDown,
            name: "Income",
            description: "Money coming in (salary, freelance, dividends)",
            color: "text-green-500",
            bgColor: "bg-green-500/10"
        },
        {
            icon: ArrowUp,
            name: "Expense",
            description: "Money going out (rent, groceries, utilities)",
            color: "text-red-500",
            bgColor: "bg-red-500/10"
        },
        {
            icon: ArrowLeftRight,
            name: "Transfer",
            description: "Moving money between your accounts",
            color: "text-blue-500",
            bgColor: "bg-blue-500/10"
        },
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Tags className="h-5 w-5 text-primary" />
                    Categories: Organizing Your Money Flow
                </h2>
                <p className="text-muted-foreground">
                    Every transaction needs a category. Categories help you understand where your money comes from and where it goes.
                </p>
            </div>

            <div className="grid gap-3">
                {categoryTypes.map((type) => (
                    <div
                        key={type.name}
                        className={`flex items-start gap-4 p-4 rounded-xl border ${type.bgColor} bg-opacity-50 transition-colors`}
                    >
                        <div className={`h-10 w-10 rounded-full bg-background flex items-center justify-center shrink-0 shadow-sm border border-border/50`}>
                            <type.icon className={`h-5 w-5 ${type.color}`} />
                        </div>
                        <div>
                            <p className={`font-semibold ${type.color}`}>{type.name}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{type.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <ArrowLeftRight className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-amber-600 mb-1">Understanding Transfers</p>
                    <p className="text-amber-600/80">
                        Transfers move money between your accounts (like paying a credit card).
                        They don't affect your net worth, only where the money sits.
                    </p>
                </div>
            </div>
        </div>
    );
}
