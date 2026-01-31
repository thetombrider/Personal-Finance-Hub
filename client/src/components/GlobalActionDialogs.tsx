import { useEffect } from "react";
import { useGlobalActions } from "@/context/GlobalActionsContext";
import { useFinance } from "@/context/FinanceContext";
import { usePortfolioStats } from "@/hooks/usePortfolioStats";
import { useTransferSubmit } from "@/hooks/useTransferSubmit";
import { format } from "date-fns";

// Dialog Components
import { TransactionForm, TransactionFormValues } from "@/components/transactions/TransactionForm";
import { TransferForm } from "@/components/transactions/TransferForm";
import { AddTradeModal } from "@/components/portfolio/AddTradeModal";
import { ImportedTransactions } from "@/components/ImportedTransactions";
import { MissingRecurringTransactionsModal } from "@/components/dashboard/MissingRecurringTransactionsModal";

export function GlobalActionDialogs() {
    const {
        isTransactionOpen, closeTransactionModal, openTransactionModal,
        isTransferOpen, closeTransferModal, openTransferModal,
        isTradeOpen, closeTradeModal, openTradeModal,
        isStagingOpen, closeStagingModal, openStagingModal,
        isRecurringOpen, closeRecurringModal, openRecurringModal
    } = useGlobalActions();

    const { accounts, transactions, categories, addTransaction } = useFinance();
    const { holdings } = usePortfolioStats();

    const investmentAccounts = accounts.filter(a => a.type === "investment");

    // Hotkeys Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if input, textarea, or contenteditable is focused
            if (
                e.target instanceof HTMLInputElement ||
                e.target instanceof HTMLTextAreaElement ||
                (e.target as HTMLElement).isContentEditable
            ) {
                return;
            }

            // Ignore if any modal is already open (simple check for dialog presentation)
            // Ideally we check specific states, but for now let's check our own states
            if (isTransactionOpen || isTransferOpen || isTradeOpen || isStagingOpen || isRecurringOpen) {
                if (e.key === "Escape") {
                    // Close all
                    closeTransactionModal();
                    closeTransferModal();
                    closeTradeModal();
                    closeStagingModal();
                    closeRecurringModal();
                }
                return;
            }

            // Global Hotkeys
            switch (e.key.toLowerCase()) {
                case "t":
                    e.preventDefault();
                    openTransactionModal();
                    break;
                case "x": // Xfer -> Transfer
                    e.preventDefault();
                    openTransferModal();
                    break;
                case "i": // Investment
                    e.preventDefault();
                    openTradeModal();
                    break;
                case "s": // Sync / Staging
                    e.preventDefault();
                    openStagingModal();
                    break;
                case "r": // Recurring
                    e.preventDefault();
                    openRecurringModal();
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [
        isTransactionOpen, isTransferOpen, isTradeOpen, isStagingOpen, isRecurringOpen,
        openTransactionModal, openTransferModal, openTradeModal, openStagingModal, openRecurringModal,
        closeTransactionModal, closeTransferModal, closeTradeModal, closeStagingModal, closeRecurringModal
    ]);

    // Handlers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onTransactionSubmit = async (data: TransactionFormValues | any) => {
        const formattedData = {
            ...data,
            amount: data.amount.toString(),
            date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
        };
        await addTransaction(formattedData);
        closeTransactionModal();
    };

    const { submitTransfer } = useTransferSubmit({
        onSuccess: () => closeTransferModal(),
    });

    return (
        <>
            <TransactionForm
                isOpen={isTransactionOpen}
                onOpenChange={(open) => !open && closeTransactionModal()}
                onSubmit={onTransactionSubmit}
                initialData={null}
                accounts={accounts}
                categories={categories}
            />

            <TransferForm
                isOpen={isTransferOpen}
                onOpenChange={(open) => !open && closeTransferModal()}
                onSubmit={async (data) => { await submitTransfer(data); }}
                accounts={accounts}
            />

            <AddTradeModal
                isOpen={isTradeOpen}
                onOpenChange={(open) => !open && closeTradeModal()}
                accounts={investmentAccounts}
                holdings={holdings}
            />

            {/* Sync / Staging Modal */}
            <ImportedTransactions
                isOpen={isStagingOpen}
                onOpenChange={(open) => !open && closeStagingModal()}
                accountId={null}
            />

            {/* Missing Recurring Modal */}
            <MissingRecurringTransactionsModal
                isOpen={isRecurringOpen}
                onOpenChange={(open) => !open && closeRecurringModal()}
            />
        </>
    );
}
