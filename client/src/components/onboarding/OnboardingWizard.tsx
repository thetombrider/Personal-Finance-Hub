import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { OnboardingProvider, useOnboarding } from "@/context/OnboardingContext";

// Step components
import { WelcomeStep } from "./steps/WelcomeStep";
import { AccountsStep } from "./steps/AccountsStep";
import { CategoriesStep } from "./steps/CategoriesStep";
import { TransactionsStep } from "./steps/TransactionsStep";
import { BudgetsStep } from "./steps/BudgetsStep";
import { PortfolioStep } from "./steps/PortfolioStep";
import { IntegrationsStep } from "./steps/IntegrationsStep";
import { SetupAccountStep } from "./steps/SetupAccountStep";
import { SetupCategoriesStep } from "./steps/SetupCategoriesStep";
import { CompletionStep } from "./steps/CompletionStep";

interface OnboardingWizardProps {
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
}

function OnboardingContent() {
    const {
        currentStep,
        currentStepIndex,
        totalSteps,
        isFirstStep,
        isLastStep,
        nextStep,
        previousStep,
        skipOnboarding,
        completeOnboarding,
        isSubmitting,
    } = useOnboarding();

    const progress = ((currentStepIndex + 1) / totalSteps) * 100;

    const renderStep = () => {
        switch (currentStep) {
            case "welcome":
                return <WelcomeStep />;
            case "accounts":
                return <AccountsStep />;
            case "categories":
                return <CategoriesStep />;
            case "transactions":
                return <TransactionsStep />;
            case "budgets":
                return <BudgetsStep />;
            case "portfolio":
                return <PortfolioStep />;
            case "integrations":
                return <IntegrationsStep />;
            case "setup-account":
                return <SetupAccountStep />;
            case "setup-categories":
                return <SetupCategoriesStep />;
            case "completion":
                return <CompletionStep />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-col h-full w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Header with Progress */}
            <div className="px-8 pt-6 pb-4 border-b bg-muted/5">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-muted-foreground">
                        Step {currentStepIndex + 1} of {totalSteps}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={skipOnboarding}
                        disabled={isSubmitting}
                        className="h-8 px-3 text-muted-foreground hover:text-foreground"
                    >
                        Skip
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                </div>
                <Progress value={progress} className="h-1.5 w-full bg-muted/50" />
            </div>

            {/* Step content */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden">
                <div className="px-8 py-8 max-w-xl mx-auto">
                    {renderStep()}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between px-8 py-5 border-t bg-muted/5">
                <Button
                    variant="outline"
                    onClick={previousStep}
                    disabled={isFirstStep || isSubmitting}
                    className="w-24"
                >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Back
                </Button>

                {isLastStep ? (
                    <Button
                        onClick={completeOnboarding}
                        disabled={isSubmitting}
                        className="min-w-[140px]"
                    >
                        {isSubmitting ? "Finishing..." : "Get Started"}
                    </Button>
                ) : (
                    <Button
                        onClick={nextStep}
                        disabled={isSubmitting}
                        className="w-24"
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                )}
            </div>
        </div>
    );
}

export function OnboardingWizard({ isOpen = true, onOpenChange }: OnboardingWizardProps) {
    const [internalOpen, setInternalOpen] = useState(true);

    const open = isOpen !== undefined ? isOpen : internalOpen;
    const setOpen = onOpenChange || setInternalOpen;

    const handleClose = () => {
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl h-[600px] p-0 overflow-hidden sm:rounded-xl gap-0 block [&>button]:hidden">
                <div className="h-full w-full">
                    <OnboardingProvider onClose={handleClose}>
                        <OnboardingContent />
                    </OnboardingProvider>
                </div>
            </DialogContent>
        </Dialog>
    );
}
