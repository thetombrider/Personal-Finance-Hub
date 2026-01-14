import { useMemo } from "react";
import { startOfMonth, endOfMonth, parseISO } from "date-fns";
import { Account, Transaction } from "@/context/FinanceContext";

interface PortfolioSummary {
    totalCurrentValue: number;
    totalInvested: number;
}

interface UseDashboardStatsProps {
    accounts: Account[];
    transactions: Transaction[];
    portfolioSummary: PortfolioSummary | undefined;
    currentDate?: Date;
}

export function useDashboardStats({ accounts, transactions, portfolioSummary, currentDate = new Date() }: UseDashboardStatsProps) {

    const totalAccountBalance = useMemo(() =>
        accounts.reduce((sum, acc) => sum + Number(acc.balance), 0),
        [accounts]
    );

    const totalBalance = totalAccountBalance + (portfolioSummary?.totalCurrentValue || 0);

    const totalCash = useMemo(() => {
        return accounts
            .filter(acc => acc.type === 'checking' || acc.type === 'cash')
            .reduce((sum, acc) => sum + Number(acc.balance), 0);
    }, [accounts]);

    const totalSavings = useMemo(() => {
        return accounts
            .filter(acc => acc.type === 'savings')
            .reduce((sum, acc) => sum + Number(acc.balance), 0);
    }, [accounts]);

    const totalInvestments = portfolioSummary?.totalCurrentValue || 0;

    const totalCredit = useMemo(() => {
        return accounts
            .filter(acc => acc.type === 'credit')
            .reduce((sum, acc) => sum + Number(acc.balance), 0);
    }, [accounts]);

    // Credit card usage this month
    const creditUsageThisMonth = useMemo(() => {
        const creditAccounts = accounts.filter(acc => acc.type === 'credit');
        if (creditAccounts.length === 0) return null;

        const currentMonthStart = startOfMonth(currentDate);
        const currentMonthEnd = endOfMonth(currentDate);

        let totalSpent = 0;
        let totalLimit = 0;

        creditAccounts.forEach(acc => {
            const spent = transactions
                .filter(t => {
                    const tDate = parseISO(t.date);
                    return t.accountId === acc.id &&
                        t.type === 'expense' &&
                        tDate >= currentMonthStart &&
                        tDate <= currentMonthEnd;
                })
                .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

            totalSpent += spent;
            if (acc.creditLimit) {
                totalLimit += Number(acc.creditLimit);
            }
        });

        return {
            spent: totalSpent,
            limit: totalLimit,
            percentage: totalLimit > 0 ? (totalSpent / totalLimit) * 100 : 0
        };
    }, [accounts, transactions, currentDate]);

    return {
        totalBalance,
        totalCash,
        totalSavings,
        totalInvestments,
        totalCredit,
        creditUsageThisMonth
    };
}
