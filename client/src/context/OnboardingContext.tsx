import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type OnboardingStep =
    | "welcome"
    | "accounts"
    | "categories"
    | "transactions"
    | "budgets"
    | "portfolio"
    | "integrations"
    | "setup-account"
    | "setup-categories"
    | "completion";

const STEPS: OnboardingStep[] = [
    "welcome",
    "accounts",
    "categories",
    "transactions",
    "budgets",
    "portfolio",
    "integrations",
    "setup-account",
    "setup-categories",
    "completion",
];

interface OnboardingContextType {
    currentStep: OnboardingStep;
    currentStepIndex: number;
    totalSteps: number;
    isFirstStep: boolean;
    isLastStep: boolean;
    nextStep: () => void;
    previousStep: () => void;
    goToStep: (step: OnboardingStep) => void;
    skipOnboarding: () => Promise<void>;
    completeOnboarding: () => Promise<void>;
    isSubmitting: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

interface OnboardingProviderProps {
    children: ReactNode;
    onClose: () => void;
}

export function OnboardingProvider({ children, onClose }: OnboardingProviderProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const queryClient = useQueryClient();

    const updateUserMutation = useMutation({
        mutationFn: async (data: { onboardingCompleted?: boolean; onboardingSkipped?: boolean }) => {
            const res = await apiRequest("PUT", "/api/user", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        },
    });

    const nextStep = useCallback(() => {
        if (currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        }
    }, [currentStepIndex]);

    const previousStep = useCallback(() => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    }, [currentStepIndex]);

    const goToStep = useCallback((step: OnboardingStep) => {
        const index = STEPS.indexOf(step);
        if (index !== -1) {
            setCurrentStepIndex(index);
        }
    }, []);

    const skipOnboarding = useCallback(async () => {
        await updateUserMutation.mutateAsync({ onboardingSkipped: true });
        onClose();
    }, [updateUserMutation, onClose]);

    const completeOnboarding = useCallback(async () => {
        await updateUserMutation.mutateAsync({ onboardingCompleted: true });
        onClose();
    }, [updateUserMutation, onClose]);

    const value: OnboardingContextType = {
        currentStep: STEPS[currentStepIndex],
        currentStepIndex,
        totalSteps: STEPS.length,
        isFirstStep: currentStepIndex === 0,
        isLastStep: currentStepIndex === STEPS.length - 1,
        nextStep,
        previousStep,
        goToStep,
        skipOnboarding,
        completeOnboarding,
        isSubmitting: updateUserMutation.isPending,
    };

    return (
        <OnboardingContext.Provider value={value}>
            {children}
        </OnboardingContext.Provider>
    );
}

export function useOnboarding() {
    const context = useContext(OnboardingContext);
    if (!context) {
        throw new Error("useOnboarding must be used within OnboardingProvider");
    }
    return context;
}
