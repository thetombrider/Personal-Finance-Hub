
import { IStorage } from "../../storage";
import { MarketDataService } from "../marketData";
import { WeeklyReportData } from "./types";
import { calculateAccountBalances } from "./balanceSheet";

export async function getWeeklyReportData(storage: IStorage, marketDataService: MarketDataService, userId: string): Promise<WeeklyReportData> {
    const [transactions, accounts, categories, holdingsList, allTrades] = await Promise.all([
        storage.getTransactions(userId),
        storage.getAccounts(userId),
        storage.getCategories(userId),
        storage.getHoldings(userId),
        storage.getTrades(userId)
    ]);

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekTransactions = transactions.filter(t => {
        const txDate = new Date(t.date);
        return txDate >= oneWeekAgo && txDate <= now;
    });

    const totalIncome = weekTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const totalExpense = weekTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const expensesByCategory: Record<string, number> = {};
    weekTransactions.filter(t => t.type === 'expense').forEach(t => {
        const cat = categories.find(c => c.id === t.categoryId);
        const catName = cat?.name || 'Altro';
        expensesByCategory[catName] = (expensesByCategory[catName] || 0) + parseFloat(t.amount.toString());
    });

    const sortedCategories = Object.entries(expensesByCategory)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    // Calculate actual balance
    const balances = await calculateAccountBalances(accounts, transactions);
    const totalBalance = balances.assets + balances.liabilities;

    // Credit Cards
    const creditCardAccounts = accounts.filter(a => a.type === 'credit');
    const creditCardIds = creditCardAccounts.map(a => a.id);
    const weekCreditCardTransactions = weekTransactions
        .filter(t => creditCardIds.includes(t.accountId) && t.type === 'expense')
        .sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()));

    const totalCreditCardExpenses = weekCreditCardTransactions.reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

    const creditCardData = {
        transactions: weekCreditCardTransactions.map(t => {
            const category = categories.find(c => c.id === t.categoryId);
            const account = accounts.find(a => a.id === t.accountId);
            return {
                date: new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' }),
                description: t.description,
                accountName: account?.name || 'N/A',
                categoryName: category?.name || 'N/A',
                amount: parseFloat(t.amount.toString())
            };
        }),
        total: totalCreditCardExpenses,
        showAccountName: creditCardAccounts.length > 1
    };

    // Top 5 Expenses
    const top5Expenses = weekTransactions
        .filter(t => t.type === 'expense')
        .sort((a, b) => parseFloat(b.amount.toString()) - parseFloat(a.amount.toString()))
        .slice(0, 5)
        .map(t => {
            const account = accounts.find(a => a.id === t.accountId);
            const category = categories.find(c => c.id === t.categoryId);
            return {
                description: t.description,
                amount: parseFloat(t.amount.toString()),
                accountName: account?.name || 'N/A',
                categoryName: category?.name || 'N/A',
                date: new Date(t.date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
            };
        });

    // Portfolio
    const portfolioData: WeeklyReportData['portfolioData'] = [];

    // Fetch prices in parallel
    await Promise.all(holdingsList.map(h => marketDataService.getQuote(h.ticker)));

    for (const holding of holdingsList) {
        const holdingTrades = allTrades.filter(t => t.holdingId === holding.id);
        let totalQuantity = 0;
        let totalCost = 0;

        for (const trade of holdingTrades) {
            const qty = parseFloat(trade.quantity.toString());
            const amount = parseFloat(trade.totalAmount.toString());
            const fees = parseFloat(trade.fees?.toString() || "0");

            if (trade.type === 'buy') {
                totalQuantity += qty;
                totalCost += amount + fees;
            } else {
                totalQuantity -= qty;
                totalCost -= amount - fees;
            }
        }

        if (totalQuantity > 0.0001) {
            const avgCost = totalCost / totalQuantity;
            const quote = await marketDataService.getQuote(holding.ticker);
            const currentPrice = quote?.data.price || avgCost; // Fallback to cost if no price
            const currentValue = totalQuantity * currentPrice;
            const gainLoss = currentValue - totalCost;
            const gainLossPercent = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

            portfolioData.push({
                ticker: holding.ticker,
                name: holding.name,
                quantity: totalQuantity,
                avgCost,
                totalInvested: totalCost,
                currentPrice,
                currentValue,
                gainLoss,
                gainLossPercent
            });
        }
    }

    const portfolioTotalInvested = portfolioData.reduce((sum, p) => sum + p.totalInvested, 0);
    const portfolioTotalValue = portfolioData.reduce((sum, p) => sum + p.currentValue, 0);
    const portfolioTotalGainLoss = portfolioTotalValue - portfolioTotalInvested;
    const portfolioTotalGainLossPercent = portfolioTotalInvested > 0 ? (portfolioTotalGainLoss / portfolioTotalInvested) * 100 : 0;

    return {
        startDate: oneWeekAgo.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' }),
        endDate: now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }),
        totalBalance,
        totalIncome,
        totalExpense,
        balanceChange: totalIncome - totalExpense,
        top5Expenses,
        sortedCategories,
        portfolioData,
        portfolioMetrics: {
            totalInvested: portfolioTotalInvested,
            totalValue: portfolioTotalValue,
            totalGainLoss: portfolioTotalGainLoss,
            totalGainLossPercent: portfolioTotalGainLossPercent
        },
        creditCardData
    };
}
