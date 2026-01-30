/**
 * Type definitions for CSV imports and bank data
 */

// Generic CSV row - keys are column headers, values are cell contents  
export interface CsvRow {
    [key: string]: string | number;
}

// CSV file data with metadata
export interface CsvFileData {
    name: string;
    headers: string[];
    data: CsvRow[];
}

// Reference CSV data for comparison
export interface ReferenceCsvData {
    headers: string[];
    data: CsvRow[];
}

// Bank account data from GoCardless/open banking
export interface BankAccountData {
    id: string;
    iban?: string;
    name: string;
    currency: string;
    balance?: number;
}

// Parsed transaction from import
export interface ParsedTransaction {
    date: string;
    amount: string;
    description: string;
    accountId: number;
    categoryId: number;
    type: "income" | "expense";
    _hasValidAccount: boolean;
    _hasValidCategory: boolean;
}

// Trade row data from CSV import
export interface ParsedTrade {
    ticker: string;
    name: string;
    type: "buy" | "sell";
    date: string;
    quantity: string;
    pricePerUnit: string;
    totalAmount: string;
    fees: string;
    accountId: number | null;
    _isValid: boolean;
}
