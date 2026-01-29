import { useCallback } from "react";
import { useFinance } from "@/context/FinanceContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { findTransferCategory } from "@/lib/categoryUtils";
import type { Category } from "@shared/schema";

interface TransferFormValues {
    amount: number;
    description: string;
    fromAccountId: number;
    toAccountId: number;
    date: Date;
}

interface UseTransferSubmitOptions {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export function useTransferSubmit(options: UseTransferSubmitOptions = {}) {
    const { categories, addCategory, addTransfer } = useFinance();
    const { toast } = useToast();

    const findOrCreateTransferCategory = useCallback(async (): Promise<number | null> => {
        // Look for existing transfer category
        // Look for existing transfer category
        const transferCategory = findTransferCategory(categories);

        if (transferCategory) {
            return transferCategory.id;
        }

        // Create if not found
        try {
            const newCategory = await addCategory({
                name: "Transfers",
                type: "transfer",
                color: "#94a3b8",
                icon: "ArrowLeftRight",
            });
            return newCategory.id;
        } catch (error) {
            console.error("Failed to create transfer category:", error);
            return null;
        }
    }, [categories, addCategory]);

    const submitTransfer = useCallback(
        async (data: TransferFormValues) => {
            try {
                const transferCategoryId = await findOrCreateTransferCategory();

                if (!transferCategoryId) {
                    const error = new Error("Failed to get or create transfer category");
                    toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive",
                    });
                    options.onError?.(error);
                    return false;
                }

                await addTransfer({
                    amount: data.amount.toString(),
                    description: data.description,
                    fromAccountId: data.fromAccountId,
                    toAccountId: data.toAccountId,
                    categoryId: transferCategoryId,
                    date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
                });

                toast({
                    title: "Transfer created",
                    description: `Transferred ${data.amount} successfully`,
                });

                options.onSuccess?.();
                return true;
            } catch (error) {
                const err = error instanceof Error ? error : new Error("Transfer failed");
                toast({
                    title: "Error",
                    description: err.message,
                    variant: "destructive",
                });
                options.onError?.(err);
                return false;
            }
        },
        [findOrCreateTransferCategory, addTransfer, toast, options]
    );

    return { submitTransfer };
}
