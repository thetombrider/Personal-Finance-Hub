import { type WebhookProcessor, type WebhookContext, type WebhookResult } from "./webhook-base";
import { type InsertTransaction } from "@shared/schema";

/**
 * Generic webhook processor - handles standard JSON payloads
 */
export class GenericWebhookProcessor implements WebhookProcessor {
    type = "generic";

    validatePayload(payload: any): { valid: boolean; error?: string } {
        if (!payload || typeof payload !== 'object') {
            return { valid: false, error: "Payload must be a JSON object" };
        }

        const requiredFields = ['amount', 'description', 'account', 'category'];
        const missing = requiredFields.filter(field => !payload[field]);

        if (missing.length > 0) {
            return { valid: false, error: `Missing required fields: ${missing.join(', ')}` };
        }

        if (typeof payload.amount !== 'number' || payload.amount <= 0) {
            return { valid: false, error: "Amount must be a positive number" };
        }

        return { valid: true };
    }

    async processPayload(payload: any, context: WebhookContext): Promise<WebhookResult> {
        const {
            date,
            amount,
            type = 'expense',
            description,
            account: accountName,
            category: categoryName
        } = payload;

        // Clean date
        const transactionDate = date ? new Date(date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

        // Look up account by name (case-insensitive)
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

        // Look up category by name (case-insensitive)
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
                date: transactionDate,
                description,
                amount: amount.toString(), // Convert to string as decimal expects string or number, but best practice is string for precision
                type: type.toLowerCase() === 'income' ? 'income' : 'expense',
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
