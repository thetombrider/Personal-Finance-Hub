import crypto from "crypto";
import { type IStorage } from "../storage";
import { type InsertTransaction } from "@shared/schema";

export class TallyService {
    private storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    // Helper to parse European number format (1.234,56 -> 1234.56)
    parseEuropeanNumber(value: string): number {
        if (!value) return 0;
        const cleaned = value.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    // Helper to parse date in various formats
    parseDate(dateStr: string): string {
        if (!dateStr) return new Date().toISOString().split('T')[0];

        // Try DD/MM/YYYY format
        const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (ddmmyyyy) {
            const [, day, month, year] = ddmmyyyy;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        }

        // Try YYYY-MM-DD format
        const yyyymmdd = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (yyyymmdd) {
            return dateStr;
        }

        // Fallback: try to parse as date
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().split('T')[0];
        }

        return new Date().toISOString().split('T')[0];
    }

    verifySignature(payload: any, signature: string, secret: string): boolean {
        if (!signature || !secret) return false;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(JSON.stringify(payload))
            .digest('base64');
        return signature === expectedSignature;
    }

    async processWebhook(payload: any) {
        // Tally sends data directly or wrapped in eventType for webhooks
        const fields = payload.data?.fields || [];

        if (fields.length === 0) {
            throw new Error("No fields found in payload");
        }

        // Helper to get field by label pattern
        const getField = (labelPattern: RegExp): any => {
            return fields.find((f: any) => labelPattern.test(f.label?.toLowerCase() || ''));
        };

        // Helper to get text value from a dropdown field (value is array of IDs)
        const getDropdownText = (field: any): string => {
            if (!field || !field.value || !Array.isArray(field.value) || field.value.length === 0) {
                return '';
            }
            const selectedId = field.value[0];
            const option = field.options?.find((o: any) => o.id === selectedId);
            return option?.text || '';
        };

        // Helper to get simple value (string, number, or first array element)
        const getSimpleValue = (field: any): string => {
            if (!field) return '';
            const val = field.value;
            if (val === null || val === undefined) return '';
            if (typeof val === 'string') return val;
            if (typeof val === 'number') return val.toString();
            if (Array.isArray(val)) return val[0]?.toString() || '';
            return '';
        };

        // Extract fields
        const dateField = getField(/^data$/i);
        const descriptionField = getField(/^(causale|descrizione|description)$/i);
        const categoryField = getField(/^categoria$/i);
        const accountField = getField(/^conto$/i);
        const directionField = getField(/^direzione$/i);
        const incomeAmountField = getField(/^importo\s*entrata$/i);
        const expenseAmountField = getField(/^importo\s*uscita$/i);

        // Get values
        const dateValue = getSimpleValue(dateField);
        const description = getSimpleValue(descriptionField);
        const categoryName = getDropdownText(categoryField);
        const accountName = getDropdownText(accountField);
        const direction = getDropdownText(directionField);

        // Get amounts (Tally sends numbers directly for INPUT_NUMBER)
        const incomeAmount = incomeAmountField?.value ? parseFloat(incomeAmountField.value) || 0 : 0;
        const expenseAmount = expenseAmountField?.value ? parseFloat(expenseAmountField.value) || 0 : 0;

        // Determine amount and type based on direction or which amount field is filled
        let amount = 0;
        let type: 'income' | 'expense' = 'expense';

        if (direction.toLowerCase() === 'entrata' || incomeAmount > 0) {
            amount = incomeAmount > 0 ? incomeAmount : expenseAmount;
            type = 'income';
        } else {
            amount = expenseAmount > 0 ? expenseAmount : incomeAmount;
            type = 'expense';
        }

        if (!description || amount <= 0) {
            throw {
                message: "Invalid transaction data",
                details: { description, amount, direction, incomeAmount, expenseAmount },
                fields: fields.map((f: any) => ({ label: f.label, value: f.value }))
            };
        }

        // Look up account by name
        const accounts = await this.storage.getAccounts();
        const account = accounts.find(a =>
            a.name.toLowerCase() === accountName.toLowerCase()
        );

        if (!account) {
            throw {
                message: "Account not found",
                accountName,
                availableAccounts: accounts.map(a => a.name)
            };
        }

        // Look up category by name
        const categories = await this.storage.getCategories();
        const category = categories.find(c =>
            c.name.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category) {
            throw {
                message: "Category not found",
                categoryName,
                availableCategories: categories.map(c => c.name)
            };
        }

        // Create the transaction
        const transactionData: InsertTransaction = {
            date: this.parseDate(dateValue),
            description,
            amount: amount.toFixed(2),
            type,
            accountId: account.id,
            categoryId: category.id
        };

        return await this.storage.createTransaction(transactionData);
    }
}
