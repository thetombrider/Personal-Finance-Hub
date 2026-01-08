
import { storage } from "../storage";
import { RecurringExpense, Transaction, RecurringExpenseCheck } from "@shared/schema";
import { format, addMonths, setDate, parseISO, subDays, addDays, isSameMonth, getYear, getMonth } from "date-fns";

export class ReconciliationService {

    async checkRecurringExpenses(userId: string, year: number, month: number): Promise<void> {
        const recurringExpenses = await storage.getRecurringExpenses(userId);
        const activeExpenses = recurringExpenses.filter(e => e.active);

        // Get all transactions for the month +/- buffer
        // For simplicity, let's just get all transactions and filter in memory, or we could add a date range query
        // Optimisation: Fetch only relevant transactions
        const transactions = await storage.getTransactions(userId);

        for (const expense of activeExpenses) {
            await this.checkExpense(expense, year, month, transactions);
        }
    }

    private async checkExpense(expense: RecurringExpense, year: number, month: number, allTransactions: Transaction[]) {
        // 1. Calculate expected date
        // This is simplified. Real logic might need to handle "last generated" or specific start date offsets.
        // For now, assume dayOfMonth applies to the given month.
        let expectedDate = new Date(year, month - 1, expense.dayOfMonth);

        // If start date is in future, skip
        const startDate = new Date(expense.startDate);
        if (expectedDate < startDate) return;

        // 2. Define match window (e.g. +/- 5 days)
        const minDate = subDays(expectedDate, 5);
        const maxDate = addDays(expectedDate, 5);

        // 3. Find candidates
        const candidates = allTransactions.filter(t => {
            const tDate = new Date(t.date);
            // Date Window
            if (tDate < minDate || tDate > maxDate) return false;

            // Amount Window (Exact or close?)
            // For now, let's say +/- 10% or +/- 5 EUR
            const tAmount = Math.abs(parseFloat(t.amount));
            const expAmount = parseFloat(expense.amount);
            const diff = Math.abs(tAmount - expAmount);

            // Strict amount check for now, can be loosened
            // Increased to 12.0 as per user request to handle fluctuations (e.g. 1.7 vs 1.98)
            const isAmountMatch = diff < 12.0;

            // Description Match
            // If matchPattern is set, use regex/includes. Else use name.
            const pattern = expense.matchPattern || expense.name;
            const tDesc = t.description.toLowerCase();
            const isDescMatch = tDesc.includes(pattern.toLowerCase());

            return isAmountMatch && isDescMatch;
        });

        // 4. Determine status
        let status = "MISSING";
        let matchedTx: Transaction | null = null;

        if (candidates.length > 0) {
            status = "MATCHED";
            // Pick best match? For now, first one.
            matchedTx = candidates[0];
        } else {
            // Double check if we are in the future?
            if (new Date() < expectedDate) {
                status = "PENDING";
            }
        }

        // 5. Upsert check result
        // We need a storage method for this.
        await storage.upsertRecurringExpenseCheck({
            recurringExpenseId: expense.id,
            month,
            year,
            status,
            transactionId: matchedTx ? matchedTx.id : null,
            matchedDate: matchedTx ? matchedTx.date : null,
            matchedAmount: matchedTx ? matchedTx.amount : null
        });
    }
}

export const reconciliationService = new ReconciliationService();
