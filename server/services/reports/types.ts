
export interface WeeklyReportData {
    startDate: string;
    endDate: string;
    netWorth: number;
    totalIncome: number;
    totalExpense: number;
    balanceChange: number;
    top5Expenses: Array<{
        description: string;
        amount: number;
        accountName: string;
        categoryName: string;
        date: string;
    }>;
    sortedCategories: Array<[string, number]>;
    portfolioData: Array<{
        ticker: string;
        name: string;
        quantity: number;
        avgCost: number;
        totalInvested: number;
        currentPrice: number;
        currentValue: number;
        gainLoss: number;
        gainLossPercent: number;
    }>;
    portfolioMetrics: {
        totalInvested: number;
        totalValue: number;
        totalGainLoss: number;
        totalGainLossPercent: number;
    };
    creditCardData: {
        transactions: Array<{
            date: string;
            description: string;
            accountName: string;
            categoryName: string;
            amount: number;
        }>;
        total: number;
        showAccountName: boolean;
    };
}
