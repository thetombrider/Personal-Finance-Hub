
import { IStorage } from "../../storage";
import { MarketDataService } from "../marketData";
import { Account, Transaction } from "@shared/schema";

export function computeCurrentBalance(account: Account, allTransactions: Transaction[]): number {
    const accountTx = allTransactions.filter(t => t.accountId === account.id);
    const txSum = accountTx.reduce((sum, t) => {
        const val = parseFloat(t.amount.toString());
        return sum + (t.type === 'income' ? val : -val);
    }, 0);
    return parseFloat(account.startingBalance.toString()) + txSum;
}

export async function calculateAccountBalances(accounts: Account[], transactions: Transaction[]) {
    const allTransactions = transactions || [];

    let assets = 0;
    let liabilities = 0;

    for (const account of accounts) {
        const currentBalance = computeCurrentBalance(account, allTransactions);

        if (account.type === 'credit') {
            if (currentBalance < 0) {
                // Liability is the magnitude of the debt (absolute value of negative balance)
                liabilities += Math.abs(currentBalance);
            } else {
                assets += currentBalance;
            }
        } else {
            assets += currentBalance;
        }
    }

    return { assets, liabilities };
}

export async function getBalanceSheet(storage: IStorage, marketDataService: MarketDataService, userId: string) {
    const [accounts, holdingsList, allTrades] = await Promise.all([
        storage.getAccounts(userId),
        storage.getHoldings(userId),
        storage.getTrades(userId)
    ]);

    // Assets
    // 1. Liquidità (Cash) & Savings
    // We separate 'checking' + 'cash' from 'savings'
    const allTransactions = await storage.getTransactions(userId);
    let cashTotal = 0;   // Checking + Cash
    let savingsTotal = 0; // Savings

    for (const account of accounts) {
        if (account.type === 'checking' || account.type === 'savings' || account.type === 'cash') {
            const currentBalance = computeCurrentBalance(account, allTransactions);

            if (account.type === 'savings') {
                savingsTotal += currentBalance;
            } else {
                // checking or cash
                cashTotal += currentBalance;
            }
        }
    }

    // 2. Investments (Holdings)
    // Fetch current prices and build map
    const quotesList = await Promise.all(holdingsList.map(h => marketDataService.getQuote(h.ticker)));
    const quotesMap = new Map();
    holdingsList.forEach((h, index) => {
        quotesMap.set(h.ticker, quotesList[index]);
    });

    let investmentsValue = 0;
    for (const holding of holdingsList) {
        const holdingTrades = allTrades.filter(t => t.holdingId === holding.id);
        let quantity = 0;
        for (const t of holdingTrades) {
            const qty = parseFloat(t.quantity.toString());
            if (t.type === 'buy') quantity += qty;
            else quantity -= qty;
        }

        if (quantity > 0.0001) {
            const quote = quotesMap.get(holding.ticker);
            const price = quote?.data.price || parseFloat(holding.currentPrice?.toString() || "0");
            investmentsValue += quantity * price;
        }
    }

    const totalAssets = cashTotal + savingsTotal + investmentsValue;

    // Liabilities
    // Credit cards logic
    let totalLiabilities = 0;
    for (const account of accounts) {
        if (account.type === 'credit') {
            const currentBalance = computeCurrentBalance(account, allTransactions);
            // Liability is the magnitude of the debt (absolute value of negative balance)
            if (currentBalance < 0) {
                totalLiabilities += Math.abs(currentBalance);
            }
        }
    }

    // Equity
    const netWorth = totalAssets - totalLiabilities;

    return {
        assets: {
            cash: cashTotal,
            savings: savingsTotal,
            investments: investmentsValue,
            total: totalAssets
        },
        liabilities: {
            creditCards: totalLiabilities,
            total: totalLiabilities
        },
        equity: {
            netWorth
        }
    };
}
