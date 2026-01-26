import { useOnboarding } from "@/context/OnboardingContext";
import { Button } from "@/components/ui/button";
import {
    CheckCircle2,
    LayoutDashboard,
    Receipt,
    Calculator,
    TrendingUp,
    Settings,
    PartyPopper
} from "lucide-react";
import { Link } from "wouter";

export function CompletionStep() {
    const { completeOnboarding, isSubmitting } = useOnboarding();

    const quickLinks = [
        { icon: LayoutDashboard, label: "Dashboard", href: "/", description: "View your financial overview" },
        { icon: Receipt, label: "Add Transaction", href: "/transactions", description: "Record income or expense" },
        { icon: Calculator, label: "Set Budgets", href: "/budget", description: "Plan your monthly spending" },
        { icon: TrendingUp, label: "Portfolio", href: "/portfolio", description: "Track investments" },
        { icon: Settings, label: "Settings", href: "/settings", description: "Customize your experience" },
    ];

    return (
        <div className="space-y-6 text-center">
            <div className="flex justify-center">
                <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                    <PartyPopper className="h-10 w-10 text-green-500" />
                </div>
            </div>

            <div className="space-y-2">
                <h2 className="text-2xl font-bold">You're All Set!</h2>
                <p className="text-muted-foreground max-w-md mx-auto">
                    You've completed the FinTrack tour. You're now ready to take control of your finances!
                </p>
            </div>

            <div className="bg-card border rounded-xl p-5 text-left max-w-md mx-auto shadow-sm">
                <p className="text-sm font-semibold mb-3 px-1 text-muted-foreground uppercase tracking-wide">Quick Actions</p>
                <div className="space-y-1">
                    {quickLinks.map((link) => (
                        <div
                            key={link.href}
                            className="group flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                            onClick={() => window.location.href = link.href}
                        >
                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                                <link.icon className="h-4 w-4 text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-medium text-foreground">{link.label}</p>
                                <p className="text-xs text-muted-foreground">{link.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="pt-2">
                <Button
                    size="lg"
                    onClick={completeOnboarding}
                    disabled={isSubmitting}
                    className="gap-2"
                >
                    <CheckCircle2 className="h-4 w-4" />
                    {isSubmitting ? "Starting..." : "Start Using FinTrack"}
                </Button>
            </div>

            <p className="text-xs text-muted-foreground">
                You can revisit this tour anytime from Settings
            </p>
        </div>
    );
}
