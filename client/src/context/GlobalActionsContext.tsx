import { createContext, useContext, useState, ReactNode, useCallback } from "react";

interface GlobalActionsContextType {
    isTransactionOpen: boolean;
    openTransactionModal: () => void;
    closeTransactionModal: () => void;

    isTransferOpen: boolean;
    openTransferModal: () => void;
    closeTransferModal: () => void;

    isTradeOpen: boolean;
    openTradeModal: () => void;
    closeTradeModal: () => void;

    isStagingOpen: boolean;
    openStagingModal: () => void;
    closeStagingModal: () => void;

    isRecurringOpen: boolean;
    openRecurringModal: () => void;
    closeRecurringModal: () => void;
}

const GlobalActionsContext = createContext<GlobalActionsContextType | undefined>(undefined);

export function GlobalActionsProvider({ children }: { children: ReactNode }) {
    const [isTransactionOpen, setIsTransactionOpen] = useState(false);
    const [isTransferOpen, setIsTransferOpen] = useState(false);
    const [isTradeOpen, setIsTradeOpen] = useState(false);
    const [isStagingOpen, setIsStagingOpen] = useState(false);
    const [isRecurringOpen, setIsRecurringOpen] = useState(false);

    const openTransactionModal = useCallback(() => setIsTransactionOpen(true), []);
    const closeTransactionModal = useCallback(() => setIsTransactionOpen(false), []);

    const openTransferModal = useCallback(() => setIsTransferOpen(true), []);
    const closeTransferModal = useCallback(() => setIsTransferOpen(false), []);

    const openTradeModal = useCallback(() => setIsTradeOpen(true), []);
    const closeTradeModal = useCallback(() => setIsTradeOpen(false), []);

    const openStagingModal = useCallback(() => setIsStagingOpen(true), []);
    const closeStagingModal = useCallback(() => setIsStagingOpen(false), []);

    const openRecurringModal = useCallback(() => setIsRecurringOpen(true), []);
    const closeRecurringModal = useCallback(() => setIsRecurringOpen(false), []);

    const value = {
        isTransactionOpen,
        openTransactionModal,
        closeTransactionModal,

        isTransferOpen,
        openTransferModal,
        closeTransferModal,

        isTradeOpen,
        openTradeModal,
        closeTradeModal,

        isStagingOpen,
        openStagingModal,
        closeStagingModal,

        isRecurringOpen,
        openRecurringModal,
        closeRecurringModal,
    };

    return (
        <GlobalActionsContext.Provider value={value}>
            {children}
        </GlobalActionsContext.Provider>
    );
}

export function useGlobalActions() {
    const context = useContext(GlobalActionsContext);
    if (context === undefined) {
        throw new Error("useGlobalActions must be used within a GlobalActionsProvider");
    }
    return context;
}
