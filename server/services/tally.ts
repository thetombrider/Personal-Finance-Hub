import { type WebhookProcessor, type WebhookContext, type WebhookResult } from "./webhook-base";
import { type InsertTransaction, type Account, type Category } from "@shared/schema";

/**
 * Tally webhook processor - handles form submissions from Tally.so
 */
export class TallyProcessor implements WebhookProcessor {
    type = "tally";

    // Helper to parse European number format (1.234,56 -> 1234.56)
    private parseEuropeanNumber(value: string | number): number {
        if (value === null || value === undefined) return 0;
        if (typeof value === 'number') return value;

        const stringValue = String(value);
        if (!stringValue) return 0;

        const cleaned = stringValue.replace(/\./g, '').replace(',', '.');
        return parseFloat(cleaned) || 0;
    }

    // Helper to parse date in various formats
    private parseDate(dateStr: string): string {
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

    validatePayload(payload: any): { valid: boolean; error?: string } {
        const fields = payload.data?.fields || [];

        if (fields.length === 0) {
            return { valid: false, error: "No fields found in payload" };
        }

        return { valid: true };
    }

    async processPayload(payload: any, context: WebhookContext): Promise<WebhookResult> {
        const fields = payload.data?.fields || [];

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
        const incomeAmount = incomeAmountField?.value ? this.parseEuropeanNumber(incomeAmountField.value) : 0;
        const expenseAmount = expenseAmountField?.value ? this.parseEuropeanNumber(expenseAmountField.value) : 0;

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
            return {
                success: false,
                error: "Invalid transaction data: missing description or amount",
            };
        }

        // Look up account by name for this user
        const accounts = await context.storage.getAccounts(context.userId);
        const account = accounts.find(a =>
            a.name.toLowerCase() === accountName.toLowerCase()
        );

        if (!account) {
            return {
                success: false,
                error: `Account not found: ${accountName}. Available: ${accounts.map(a => a.name).join(', ')}`,
            };
        }

        // Look up category by name for this user
        const categories = await context.storage.getCategories(context.userId);
        const category = categories.find(c =>
            c.name.toLowerCase() === categoryName.toLowerCase()
        );

        if (!category) {
            return {
                success: false,
                error: `Category not found: ${categoryName}. Available: ${categories.map(c => c.name).join(', ')}`,
            };
        }

        try {
            // Create the transaction
            const transactionData: InsertTransaction = {
                date: this.parseDate(dateValue),
                description,
                amount: amount.toFixed(2),
                type,
                accountId: account.id,
                categoryId: category.id,
            };

            const transaction = await context.storage.createTransaction(transactionData);

            return {
                success: true,
                data: transaction,
            };
        } catch (error: any) {
            const errorMessage = error.message || "Failed to create transaction";
            return {
                success: false,
                error: errorMessage,
            };
        }
    }
}

/**
 * Legacy TallyService for backward compatibility
 * @deprecated Use TallyProcessor with WebhookService instead
 */
export { TallyProcessor as TallyService };
