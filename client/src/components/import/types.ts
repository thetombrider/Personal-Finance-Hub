export type Step = 'upload' | 'map' | 'preview';
export type ImportMode = 'transactions' | 'trades' | 'accounts' | 'categories';

export interface Mapping {
    // Transactions
    date: string;
    amount: string;
    incomeAmount?: string;
    expenseAmount?: string;
    description: string;
    type?: string;
    account?: string;
    category?: string;

    // Accounts
    accountName: string;
    accountType: string;
    accountBalance?: string;
    accountCurrency?: string;

    // Categories
    categoryName: string;
    categoryType: string;
    categoryBudget?: string;
}

export interface TradeMapping {
    date: string;
    ticker: string;
    name?: string;
    type: string;
    quantity: string;
    pricePerUnit: string;
    totalAmount?: string;
    fees?: string;
    account?: string;
}
