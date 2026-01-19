
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
    // 1. & 2. Liquidity (Cash + Checking) & Savings
    const allTransactions = await storage.getTransactions(userId);

    // Structure to hold account breakdowns
    const cashAccounts: any[] = [];
    const savingsAccounts: any[] = [];
    const investmentAccounts: any[] = [];
    const creditCardAccounts: any[] = [];

    let cashTotal = 0;   // Checking + Cash
    let savingsTotal = 0; // Savings

    for (const account of accounts) {
        if (account.type === 'checking' || account.type === 'savings' || account.type === 'cash') {
            const currentBalance = computeCurrentBalance(account, allTransactions);

            const accountData = {
                id: account.id,
                name: account.name,
                balance: currentBalance,
                type: account.type
            };

            if (account.type === 'savings') {
                savingsTotal += currentBalance;
                savingsAccounts.push(accountData);
            } else {
                // checking or cash
                cashTotal += currentBalance;
                cashAccounts.push(accountData);
            }
        } else if (account.type === 'investment') {
            // For investment accounts, we start with their cash balance
            const currentBalance = computeCurrentBalance(account, allTransactions);
            investmentAccounts.push({
                id: account.id,
                name: account.name,
                balance: currentBalance, // Will add holding values to this later
                type: account.type
            });
        }
    }

    // 3. Investments (Holdings)
    // Fetch current prices and build map
    const quotesList = await Promise.all(holdingsList.map(h => marketDataService.getQuote(h.ticker)));
    const quotesMap = new Map();
    holdingsList.forEach((h, index) => {
        quotesMap.set(h.ticker, quotesList[index]);
    });

    let totalInvestmentsValue = 0;

    // Track unassigned investment value
    let unassignedInvestmentValue = 0;

    for (const holding of holdingsList) {
        const holdingTrades = allTrades.filter(t => t.holdingId === holding.id);

        // We need to calculate quantity per account for this holding
        // Group trades by account
        const accountQuantities = new Map<number | null, number>();

        for (const t of holdingTrades) {
            const qty = parseFloat(t.quantity.toString());
            const accId = t.accountId || null;
            const currentQty = accountQuantities.get(accId) || 0;

            if (t.type === 'buy') {
                accountQuantities.set(accId, currentQty + qty);
            } else {
                accountQuantities.set(accId, currentQty - qty);
            }
        }

        // Calculate value for each account
        const quote = quotesMap.get(holding.ticker);
        const price = quote?.data.price || parseFloat(holding.currentPrice?.toString() || "0");

        for (const [accId, qty] of Array.from(accountQuantities.entries())) {
            if (qty > 0.0001) {
                const value = qty * price;
                totalInvestmentsValue += value;

                if (accId) {
                    // Find the account in our list and add the value
                    const accountIndex = investmentAccounts.findIndex(a => a.id === accId);
                    if (accountIndex >= 0) {
                        investmentAccounts[accountIndex].balance += value;
                    } else {
                        // Account might be hidden or archived, or just not in the initial investment list if type was changed
                        // For now, if we can't find it in investmentAccounts (e.g. maybe it was a checking account used for trade),
                        // we should validly considering adding it or just tracking as unassigned/other if strict.
                        // Let's see if we can find it in the original accounts list
                        const account = accounts.find(a => a.id === accId);
                        if (account) {
                            // If it wasn't already in the list (e.g. mixed use), let's add it or aggregated it?
                            // Simplest is to treat it as investment source.
                            // But checking if it is already in cash/savings lists?
                            // User asked for breakdown. If I bought stock with Checking, it's an asset of Checking?
                            // Usually "Investments" category implies Investment Accounts.
                            // But strict financial view: Holding is the Asset. 
                            // Let's stick to: If account is in investmentAccounts, update it.
                            // If not, add to unassigned for now to ensure totals match, OR see if we should create an entry.
                            // Let's create an entry if missing but exists.
                            investmentAccounts.push({
                                id: account.id,
                                name: account.name,
                                balance: value, // Just the investment value
                                type: account.type
                            });
                        } else {
                            unassignedInvestmentValue += value;
                        }
                    }
                } else {
                    unassignedInvestmentValue += value;
                }
            }
        }
    }

    // Add unassigned if any
    if (unassignedInvestmentValue > 0.01) {
        investmentAccounts.push({
            id: -1,
            name: "Unassigned / Legacy",
            balance: unassignedInvestmentValue,
            type: "other"
        });
    }

    // Recalculate investment total from accounts to be sure
    const calculatedInvestmentsTotal = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0);


    const totalAssets = cashTotal + savingsTotal + calculatedInvestmentsTotal;

    // Liabilities
    // Credit cards logic
    let totalLiabilities = 0;
    for (const account of accounts) {
        if (account.type === 'credit') {
            const currentBalance = computeCurrentBalance(account, allTransactions);
            // Liability is the magnitude of the debt (absolute value of negative balance)
            if (currentBalance < 0) {
                const liabilityAmount = Math.abs(currentBalance);
                totalLiabilities += liabilityAmount;
                creditCardAccounts.push({
                    id: account.id,
                    name: account.name,
                    balance: liabilityAmount,
                    type: account.type
                });
            }
        }
    }

    // Equity
    const netWorth = totalAssets - totalLiabilities;

    return {
        assets: {
            cash: {
                total: cashTotal,
                accounts: cashAccounts
            },
            savings: {
                total: savingsTotal,
                accounts: savingsAccounts
            },
            investments: {
                total: calculatedInvestmentsTotal,
                accounts: investmentAccounts
            },
            total: totalAssets
        },
        liabilities: {
            creditCards: {
                total: totalLiabilities,
                accounts: creditCardAccounts
            },
            total: totalLiabilities
        },
        equity: {
            netWorth
        }
    };
}
