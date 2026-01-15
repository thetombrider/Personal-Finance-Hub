import { format, isValid } from "date-fns";
import type { InsertAccount, InsertCategory } from "@shared/schema";
import { Mapping } from "./types";

// Helper to parse European/US numbers
export const parseNumeric = (value: any): number => {
    if (!value) return 0;
    let str = value.toString().trim();
    const isNegative = str.startsWith('-');
    str = str.replace(/[^0-9,.-]/g, '');
    if (!str) return 0;

    if (/,\d{1,2}$/.test(str)) {
        str = str.replace(/\./g, '').replace(',', '.');
    } else if (/\.\d{1,2}$/.test(str) && str.includes(',')) {
        str = str.replace(/,/g, '');
    } else if (str.includes(',') && !str.includes('.')) {
        str = str.replace(',', '.');
    }

    const result = parseFloat(str) || 0;
    return isNegative && result > 0 ? -result : result;
};

export const cleanHeader = (header: string) => header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');

export const parseDate = (value: any) => {
    if (!value) return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");

    // Handle Date objects (from Excel with cellDates: true)
    if (value instanceof Date) {
        if (isValid(value)) return format(value, "yyyy-MM-dd'T'HH:mm:ss");
        return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
    }

    // Clean value: trim and remove surrounding quotes
    const cleanValue = String(value).trim().replace(/^["']+|["']+$/g, '');

    // Handle numeric Excel serial dates as string fallback
    if (/^\d{5}(\.\d+)?$/.test(cleanValue)) {
        const serial = parseFloat(cleanValue);
        const date = new Date((serial - 25569) * 86400 * 1000);
        if (isValid(date)) return format(date, "yyyy-MM-dd'T'HH:mm:ss");
    }

    const parts = cleanValue.split(/[-/.]/);
    if (parts.length === 3) {
        const [first, second, third] = parts;
        if (third && third.length === 4) { // DD/MM/YYYY
            const date = new Date(parseInt(third), parseInt(second) - 1, parseInt(first), 12);
            if (isValid(date)) return format(date, "yyyy-MM-dd'T'HH:mm:ss");
        }
        if (first && first.length === 4) { // YYYY-MM-DD
            const date = new Date(parseInt(first), parseInt(second) - 1, parseInt(third), 12);
            if (isValid(date)) return format(date, "yyyy-MM-dd'T'HH:mm:ss");
        }
    }
    const date = new Date(cleanValue);
    if (isValid(date)) return format(date, "yyyy-MM-dd'T'HH:mm:ss");
    return format(new Date(), "yyyy-MM-dd'T'HH:mm:ss");
};

export const getTransactionFromRow = (
    row: any,
    mapping: Mapping,
    accounts: any[],
    categories: any[],
    useDualAmountColumns: boolean,
    selectedAccount: number | null
) => {
    let amount = 0;
    let type: "income" | "expense" = "expense";

    if (useDualAmountColumns && mapping.incomeAmount && mapping.expenseAmount) {
        const inc = parseNumeric(row[mapping.incomeAmount]);
        const exp = parseNumeric(row[mapping.expenseAmount]);
        if (inc > 0) { amount = inc; type = "income"; }
        else if (exp > 0) { amount = exp; type = "expense"; }
    } else {
        amount = parseNumeric(row[mapping.amount]);
        if (mapping.type && mapping.type !== 'none' && row[mapping.type]) {
            const typeVal = row[mapping.type].toLowerCase();
            if (typeVal.includes('income') || typeVal.includes('credit') || typeVal.includes('entrata')) type = "income";
        } else {
            if (amount < 0) { type = "expense"; amount = Math.abs(amount); }
            else type = "income";
        }
    }

    let accountId: number | null = selectedAccount || null;
    if (mapping.account && mapping.account !== 'none' && row[mapping.account]) {
        const rawVal = row[mapping.account].toString().trim();
        const valLower = rawVal.toLowerCase();

        let matched = accounts.find(a => a.name.toLowerCase() === valLower);
        if (!matched) {
            const numId = parseInt(rawVal);
            if (!isNaN(numId)) matched = accounts.find(a => a.id === numId);
        }

        if (matched) accountId = matched.id;
        else if (selectedAccount) accountId = selectedAccount;
    } else if (!accountId && accounts.length > 0) {
        accountId = accounts[0].id;
    }

    let categoryId = categories.find(c => c.type === type)?.id || categories[0]?.id || 0;
    if (mapping.category && mapping.category !== 'none' && row[mapping.category]) {
        const rawVal = row[mapping.category].toString().trim();
        const valLower = rawVal.toLowerCase();

        let matched = categories.find(c => c.name.toLowerCase() === valLower && c.type === type);
        if (!matched) matched = categories.find(c => c.name.toLowerCase() === valLower);
        if (!matched) {
            const numId = parseInt(rawVal);
            if (!isNaN(numId)) matched = categories.find(c => c.id === numId);
        }

        if (matched) categoryId = matched.id;
    }

    return {
        date: parseDate(row[mapping.date]),
        amount: Math.abs(amount).toString(),
        description: (row[mapping.description] || "Imported Transaction").toString(),
        accountId: accountId || 0,
        categoryId: categoryId || 0,
        type,
        _hasValidAccount: accountId !== null && accountId !== 0,
        _hasValidCategory: categoryId !== null && categoryId !== 0
    };
};

export const getAccountFromRow = (row: any, mapping: Mapping): InsertAccount => {
    const name = row[mapping.accountName]?.toString().trim() || "Unnamed Account";
    let type: "checking" | "savings" | "credit" | "investment" | "cash" = "checking"; const rawType = row[mapping.accountType]?.toLowerCase() || "";
    if (rawType.includes('save') || rawType.includes('risparmio') || rawType.includes('deposito')) type = "savings";
    else if (rawType.includes('credit') || rawType.includes('credito')) type = "credit";
    else if (rawType.includes('invest')) type = "investment";
    else if (rawType.includes('cash') || rawType.includes('contanti')) type = "cash";

    const balance = mapping.accountBalance ? parseNumeric(row[mapping.accountBalance]) : 0;
    const currency = mapping.accountCurrency ? row[mapping.accountCurrency] : "EUR";

    const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

    return {
        name,
        type,
        startingBalance: balance.toString(),
        currency,
        color,
        creditLimit: type === 'credit' ? "0" : null
    };
};

export const getCategoryFromRow = (row: any, mapping: Mapping): InsertCategory => {
    export const getCategoryFromRow = (row: any, mapping: Mapping): InsertCategory => {
        const name = row[mapping.categoryName]?.toString().trim() || "Unnamed Category";
        let type: "income" | "expense" = "expense"; if (rawType.includes('income') || rawType.includes('entrata')) type = "income";

        const color = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

        return {
            name,
            type,
            color,
            icon: null
        };
    };
