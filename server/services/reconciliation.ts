
import { storage } from "../storage";
import { RecurringExpense, Transaction, RecurringExpenseCheck } from "@shared/schema";
import { format, addMonths, setDate, parseISO, subDays, addDays, isSameMonth, getYear, getMonth } from "date-fns";

export class ReconciliationService {

    async checkRecurringExpenses(userId: string, year: number, month: number): Promise<void> {
        console.log(`Starting reconciliation for user ${userId} for ${month}/${year}`);
        try {
            const recurringExpenses = await storage.getRecurringExpenses(userId);
            const activeExpenses = recurringExpenses.filter(e => e.active);

            // Optimization: Fetch only relevant transactions for the month +/- buffer
            // We'll broaden the range to catch transactions slightly outside the month boundaries
            // JS months are 0-indexed for Date constructor
            const startDate = new Date(year, month - 1, 1);
            const endDate = new Date(year, month, 0); // Last day of the month

            // Use a buffer of 10 days for fetching
            const fetchStart = subDays(startDate, 10);
            const fetchEnd = addDays(endDate, 10);

            // Fetch all transactions and filter in memory for now as getTransactions doesn't support date range yet
            // If performance becomes an issue, we should add getTransactionsByDateRange to storage
            const allTransactions = await storage.getTransactions(userId);

            const relevantTransactions = allTransactions.filter(t => {
                const d = new Date(t.date);
                return d >= fetchStart && d <= fetchEnd;
            });

            console.log(`Processing ${activeExpenses.length} active recurring expenses against ${relevantTransactions.length} transactions`);

            for (const expense of activeExpenses) {
                await this.checkExpense(expense, year, month, relevantTransactions);
            }
        } catch (error) {
            console.error("Error in checkRecurringExpenses:", error);
            throw error;
        }
    }

    private async checkExpense(expense: RecurringExpense, year: number, month: number, transactions: Transaction[]) {
        try {
            // 1. Calculate expected date with safe handling for short months
            // If dayOfMonth is 31 but month is Feb (28/29 days), use last day of month
            const daysInMonth = new Date(year, month, 0).getDate();
            const safeDay = Math.min(expense.dayOfMonth, daysInMonth);
            const expectedDate = new Date(year, month - 1, safeDay);

            // If start date is in future, skip
            const startDate = new Date(expense.startDate);
            // Ignore time portion for comparison
            startDate.setHours(0, 0, 0, 0);
            const checkDate = new Date(expectedDate);
            checkDate.setHours(0, 0, 0, 0);

            if (checkDate < startDate) {
                return;
            }

            // 2. Define match window (e.g. +/- 5 days)
            const minDate = subDays(expectedDate, 5);
            const maxDate = addDays(expectedDate, 5);

            // 3. Find candidates
            const candidates = transactions.filter(t => {
                const tDate = new Date(t.date);
                // Date Window
                if (tDate < minDate || tDate > maxDate) return false;

                // Amount Window
                const tAmount = Math.abs(parseFloat(t.amount));
                const expAmount = parseFloat(expense.amount);
                const diff = Math.abs(tAmount - expAmount);

                // Tolerance: 12.0 units or 5% whichever is larger? Stuck to user pref 12.0 for now.
                const isAmountMatch = diff < 12.0;

                // Description Match
                // Logic: 
                // 1. If matchPattern exists, check if transaction description contains it (case insensitive)
                // 2. Fallback: Check if transaction description contains the Expense Name
                // 3. Fallback: Token-based match? (e.g. "Spotify" in "Spotify Ab")

                const tDesc = t.description.toLowerCase();
                const cleanName = expense.name.toLowerCase().trim();
                const cleanPattern = expense.matchPattern?.toLowerCase().trim();

                let isDescMatch = false;

                if (cleanPattern) {
                    isDescMatch = tDesc.includes(cleanPattern);
                } else {
                    // Exact name substring match
                    if (tDesc.includes(cleanName)) isDescMatch = true;

                    // Fuzzy fallback: If name has multiple words, check if at least one significant word is present?
                    // Maybe too aggressive. Let's stick to name containment for now but improve tokenization if needed.
                    // For "Spotify Premium", "SPOTIFY" in desc should match.
                    else {
                        const nameTokens = cleanName.split(' ').filter(w => w.length > 3);
                        if (nameTokens.length > 0 && nameTokens.some(token => tDesc.includes(token))) {
                            isDescMatch = true;
                        }
                    }
                }

                return isAmountMatch && isDescMatch;
            });

            // 4. Determine status
            let status = "MISSING";
            let matchedTx: Transaction | null = null;

            // Prioritize closest date match if multiple candidates
            if (candidates.length > 0) {
                status = "MATCHED";
                candidates.sort((a, b) => {
                    const da = Math.abs(new Date(a.date).getTime() - expectedDate.getTime());
                    const db = Math.abs(new Date(b.date).getTime() - expectedDate.getTime());
                    return da - db;
                });
                matchedTx = candidates[0];
            } else {
                // If we are checking the future/current unpassed date?
                const today = new Date();
                if (today < expectedDate) {
                    status = "PENDING";
                }
            }

            // 5. Upsert check result
            await storage.upsertRecurringExpenseCheck({
                recurringExpenseId: expense.id,
                month,
                year,
                status,
                transactionId: matchedTx ? matchedTx.id : null,
                matchedDate: matchedTx ? matchedTx.date : null,
                matchedAmount: matchedTx ? matchedTx.amount : null
            });

        } catch (error) {
            console.error(`Failed to check expense ${expense.id} (${expense.name}):`, error);
            // Continue processing other expenses instead of failing the whole batch
        }
    }
}

export const reconciliationService = new ReconciliationService();
