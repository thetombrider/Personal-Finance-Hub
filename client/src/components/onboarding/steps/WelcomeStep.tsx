import { Wallet, ArrowRight, Sparkles } from "lucide-react";
import { useOnboarding } from "@/context/OnboardingContext";
import { Button } from "@/components/ui/button";

export function WelcomeStep() {
    const { nextStep } = useOnboarding();

    return (
        <div className="flex flex-col items-center text-center space-y-8">
            <div className="h-24 w-24 rounded-2xl bg-primary/10 flex items-center justify-center rotate-3 transform transition-transform hover:rotate-6">
                <Wallet className="h-12 w-12 text-primary" />
            </div>

            <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tight">Welcome to FinTrack!</h2>
                <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
                    Your personal finance hub for tracking accounts, transactions, budgets, and investments all in one place.
                </p>
            </div>

            <div className="bg-card border rounded-xl p-5 w-full text-left shadow-sm">
                <div className="flex gap-4">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">In this quick tour you'll set up:</p>
                        <ul className="space-y-2 text-sm text-muted-foreground mt-2">
                            <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                Your first financial account
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                Categories for tracking spending
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
                                Basic budget settings
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
