
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Account } from "@/context/FinanceContext";

type DetailModalType = 'total' | 'cash' | 'savings' | 'investments' | null;

interface AccountDetailModalProps {
    detailModal: DetailModalType;
    setDetailModal: (type: DetailModalType) => void;
    accounts: Account[];
    formatCurrency: (amount: number) => string;
    onNavigateToPortfolio: () => void;
}

export function AccountDetailModal({
    detailModal,
    setDetailModal,
    accounts,
    formatCurrency,
    onNavigateToPortfolio
}: AccountDetailModalProps) {

    const isOpen = detailModal !== null;
    const onClose = () => setDetailModal(null);

    const filteredAccounts = (() => {
        if (detailModal === 'cash') {
            return accounts.filter(a => a.type === 'cash' || a.type === 'checking');
        } else if (detailModal === 'savings') {
            return accounts.filter(a => a.type === 'savings');
        } else if (detailModal === 'investments') {
            return accounts.filter(a => a.type === 'investment');
        }
        return accounts;
    })();

    const total = filteredAccounts.reduce((sum, acc) => sum + Number(acc.balance), 0);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl w-[95%] md:w-full max-h-[85vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {detailModal === 'total' && 'Tutti i Conti'}
                        {detailModal === 'cash' && 'Conti Cash & Checking'}
                        {detailModal === 'savings' && 'Conti Risparmio'}
                        {detailModal === 'investments' && 'Conti Investimento'}
                    </DialogTitle>
                </DialogHeader>
                <div className="mt-4 flex-1 overflow-y-auto">
                    {filteredAccounts.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">Nessun conto disponibile</p>
                    ) : (
                        <>
                            <div className={detailModal === 'total' ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pr-2" : "space-y-3"}>
                                {filteredAccounts.map(account => (
                                    <div
                                        key={account.id}
                                        className={detailModal === 'total'
                                            ? "flex flex-col p-3 bg-muted/50 rounded-lg"
                                            : "flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                                        }
                                        data-testid={`modal-account-${account.id}`}
                                    >
                                        {detailModal === 'total' ? (
                                            <>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm truncate">{account.name}</span>
                                                    <span className="text-xs text-muted-foreground capitalize">{account.type}</span>
                                                </div>
                                                <span className="text-lg font-bold font-heading mt-1">
                                                    {formatCurrency(Number(account.balance))}
                                                </span>
                                            </>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: account.color || '#6366f1' }}
                                                    />
                                                    <div>
                                                        <p className="font-medium">{account.name}</p>
                                                        <p className="text-xs text-muted-foreground capitalize">{account.type}</p>
                                                    </div>
                                                </div>
                                                <span className={`font-bold ${Number(account.balance) >= 0 ? 'text-foreground' : 'text-rose-600'}`}>
                                                    {formatCurrency(Number(account.balance))}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {detailModal === 'investments' && (
                                <Button
                                    className="w-full mt-4"
                                    onClick={() => {
                                        onClose();
                                        onNavigateToPortfolio();
                                    }}
                                    data-testid="button-go-to-portfolio"
                                >
                                    Dettagli Portfolio
                                </Button>
                            )}
                        </>
                    )}
                </div>
                <DialogFooter className="mt-4 sm:justify-end">
                    <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
                        Chiudi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
