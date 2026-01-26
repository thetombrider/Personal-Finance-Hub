import { Calculator, CalendarClock, CalendarCheck, AlertCircle } from "lucide-react";

export function BudgetsStep() {
    const features = [
        {
            icon: Calculator,
            title: "Monthly Budgets",
            description: "Set expected spending per category. Compare actual vs planned each month.",
        },
        {
            icon: CalendarClock,
            title: "Recurring Transactions",
            description: "Track expenses that repeat (rent, subscriptions, utilities). Get alerts when they're missing.",
        },
        {
            icon: CalendarCheck,
            title: "Planned Transactions",
            description: "Schedule one-time future expenses (annual insurance, upcoming purchases).",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Calculator className="h-5 w-5 text-primary" />
                    Budgets & Planning
                </h2>
                <p className="text-muted-foreground">
                    Stay in control of your spending with budgets that track your progress and alert you to unexpected changes.
                </p>
            </div>

            <div className="grid gap-3">
                {features.map((feature) => (
                    <div
                        key={feature.title}
                        className="flex items-start gap-4 p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors"
                    >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold">{feature.title}</p>
                            <p className="text-sm text-muted-foreground mt-1 leading-snug">{feature.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-medium text-amber-600 mb-1">Smart Alerts</p>
                    <p className="text-amber-600/80">
                        When a recurring transaction is overdue, you'll see a badge on your dashboard
                        with details about how many days late it is and the expected amount.
                    </p>
                </div>
            </div>
        </div>
    );
}
