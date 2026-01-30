
import { storage } from "../storage";
import { logger } from "../lib/logger";
import { RecurringExpense, Transaction, RecurringExpenseCheck } from "@shared/schema";
import { format, addMonths, setDate, parseISO, subDays, addDays, isSameMonth, getYear, getMonth } from "date-fns";

export class ReconciliationService {

    async checkRecurringExpenses(userId: string, year: number, month: number): Promise<void> {
        logger.reconciliation.info(`Starting reconciliation for user ${userId} for ${month}/${year}`);
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

            // Fetch transactions for the specific range
            const relevantTransactions = await storage.getTransactionsByDateRange(userId, fetchStart, fetchEnd);

            logger.reconciliation.info(`Processing ${activeExpenses.length} active recurring expenses against ${relevantTransactions.length} transactions`);

            for (const expense of activeExpenses) {
                await this.checkExpense(expense, year, month, relevantTransactions, userId);
            }
        } catch (error) {
            logger.reconciliation.error("Error in checkRecurringExpenses:", error);
            throw error;
        }
    }

    private async checkExpense(expense: RecurringExpense, year: number, month: number, transactions: Transaction[], userId: string) {
        try {
            // Skip if expense has ended before this month
            if (expense.endDate) {
                const endDate = new Date(expense.endDate);
                const endYear = endDate.getFullYear();
                const endMonth = endDate.getMonth() + 1; // 1-12

                // Skip if this month is after the end date
                if (year > endYear || (year === endYear && month > endMonth)) {
                    return;
                }
            }

            // 1. Calculate expected date based on interval
            const expectedDates = this.calculateExpectedDates(expense, year, month);

            // If no expected dates for this month/year, skip
            if (expectedDates.length === 0) {
                return;
            }

            // For now, process the first expected date (most intervals have only one per month)
            const expectedDate = expectedDates[0];

            // If start date is in future, skip
            const startDate = new Date(expense.startDate);
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

                // Amount matching: skip for variable amounts, otherwise use tolerance
                const isAmountMatch = expense.isVariableAmount || diff < 12.0;

                // Description Match
                // Logic: 
                // 1. If matchPattern exists, check if transaction description contains it (case insensitive)
                // 2. Fallback: Check if transaction description contains the Expense Name
                // 3. Fallback: Token-based match? (e.g. "Spotify" in "Spotify Ab")

                const tDesc = t.description.toLowerCase();
                const cleanName = expense.name.toLowerCase().trim();
                const cleanPattern = expense.matchPattern ? expense.matchPattern.toLowerCase().trim() : undefined;

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

            // 5. Upsert check result with authorization
            await storage.upsertRecurringExpenseCheck({
                recurringExpenseId: expense.id,
                month,
                year,
                status,
                transactionId: matchedTx ? matchedTx.id : null,
                matchedDate: matchedTx ? matchedTx.date : null,
                matchedAmount: matchedTx ? matchedTx.amount : null
            }, userId);

        } catch (error) {
            logger.reconciliation.error(`Failed to check expense ${expense.id} (${expense.name}):`, error);
            // Continue processing other expenses instead of failing the whole batch
        }
    }

    /**
     * Calculate expected dates for a recurring expense in a given month/year
     * based on its interval (monthly, weekly, quarterly, yearly)
     */
    private calculateExpectedDates(expense: RecurringExpense, year: number, month: number): Date[] {
        const interval = expense.interval || 'monthly';
        const startDate = new Date(expense.startDate);
        startDate.setHours(0, 0, 0, 0);

        switch (interval.toLowerCase()) {
            case 'monthly':
                return this.calculateMonthlyDate(expense, year, month);

            case 'weekly':
                return this.calculateWeeklyDates(expense, year, month);

            case 'quarterly':
                return this.calculateQuarterlyDate(expense, year, month);

            case 'yearly':
                return this.calculateYearlyDate(expense, year, month);

            default:
                // Fallback to monthly
                return this.calculateMonthlyDate(expense, year, month);
        }
    }

    private calculateMonthlyDate(expense: RecurringExpense, year: number, month: number): Date[] {
        const daysInMonth = new Date(year, month, 0).getDate();
        const safeDay = Math.min(expense.dayOfMonth, daysInMonth);
        return [new Date(year, month - 1, safeDay)];
    }

    private calculateWeeklyDates(expense: RecurringExpense, year: number, month: number): Date[] {
        const dates: Date[] = [];
        const startDate = new Date(expense.startDate);
        startDate.setHours(0, 0, 0, 0);

        // First day of the target month
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        // Calculate the first occurrence in or after the target month
        let currentDate = new Date(startDate);

        // Fast-forward to the target month if needed
        while (currentDate < monthStart) {
            currentDate.setDate(currentDate.getDate() + 7);
        }

        // Collect all weekly occurrences within the target month
        while (currentDate <= monthEnd) {
            if (currentDate >= monthStart) {
                dates.push(new Date(currentDate));
            }
            currentDate.setDate(currentDate.getDate() + 7);
        }

        return dates;
    }

    private calculateQuarterlyDate(expense: RecurringExpense, year: number, month: number): Date[] {
        const startDate = new Date(expense.startDate);
        const startMonth = startDate.getMonth() + 1; // 1-12

        // Quarterly means every 3 months from start date
        // Check if this month is a quarterly occurrence
        const monthsSinceStart = (year - startDate.getFullYear()) * 12 + (month - startMonth);

        if (monthsSinceStart >= 0 && monthsSinceStart % 3 === 0) {
            const daysInMonth = new Date(year, month, 0).getDate();
            const safeDay = Math.min(expense.dayOfMonth, daysInMonth);
            return [new Date(year, month - 1, safeDay)];
        }

        return [];
    }

    private calculateYearlyDate(expense: RecurringExpense, year: number, month: number): Date[] {
        const startDate = new Date(expense.startDate);
        const startMonth = startDate.getMonth() + 1; // 1-12

        // Yearly means same month and day each year
        if (month === startMonth) {
            const daysInMonth = new Date(year, month, 0).getDate();
            const safeDay = Math.min(expense.dayOfMonth, daysInMonth);
            return [new Date(year, month - 1, safeDay)];
        }

        return [];
    }
}

export const reconciliationService = new ReconciliationService();
