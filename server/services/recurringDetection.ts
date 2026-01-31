import { IStorage } from "../storage";
import { Transaction, RecurringExpense } from "@shared/schema";

interface RecurringSuggestion {
    name: string;
    amount: number;
    interval: 'monthly' | 'weekly' | 'yearly';
    confidence: number;
    occurrences: number;
    lastDate: string;
    firstDate: string;
    description: string;
    categoryId: number;
    accountId: number;
}

export class RecurringDetectionService {
    private storage: IStorage;

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    async getSuggestions(userId: string): Promise<RecurringSuggestion[]> {
        // 1. Fetch data
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1); // Last 12 months

        const [transactions, existingRecurring] = await Promise.all([
            this.storage.getTransactionsByDateRange(userId, startDate, endDate),
            this.storage.getRecurringExpenses(userId)
        ]);

        // 2. Group transactions by similar description
        const groups = this.groupTransactions(transactions);

        // 3. Analyze groups for patterns
        const suggestions: RecurringSuggestion[] = [];

        for (const [key, group] of Object.entries(groups)) {
            // Skip groups with too few transactions
            if (group.length < 3) continue;

            const pattern = this.analyzePattern(group);
            if (pattern) {
                suggestions.push(pattern);
            }
        }

        // 4. Filter out duplicates or already tracked expenses
        return this.filterExisting(suggestions, existingRecurring);
    }

    private groupTransactions(transactions: Transaction[]): Record<string, Transaction[]> {
        const groups: Record<string, Transaction[]> = {};

        // Simple normalization: lowercase, remove numbers/dates usually found in bank descriptions
        // e.g., "SPOTIFY 123456" -> "spotify"
        // This is a basic heuristic.
        const normalize = (desc: string) => {
            return desc.toLowerCase()
                .replace(/\d+/g, '') // remove numbers
                .replace(/\s+/g, ' ') // collapse spaces
                .trim();
        };

        for (const tx of transactions) {
            // Ignore internal transfers
            if (tx.type === 'transfer') continue;

            const key = normalize(tx.description);
            if (!key) continue;

            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(tx);
        }

        return groups;
    }

    private analyzePattern(transactions: Transaction[]): RecurringSuggestion | null {
        // Sort by date desc
        const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Check amount consistency
        // If 80% of transactions have the same amount (within small margin), we take it.
        const amounts = sorted.map(t => Number(t.amount));
        const modeAmount = this.getMode(amounts);

        if (!modeAmount) return null; // Variance too high for now

        // Check interval
        // Calculate days between consecutive transactions
        const intervals: number[] = [];
        for (let i = 0; i < sorted.length - 1; i++) {
            const d1 = new Date(sorted[i].date);
            const d2 = new Date(sorted[i + 1].date);
            const diffTime = Math.abs(d1.getTime() - d2.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            intervals.push(diffDays);
        }

        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

        let interval: 'monthly' | 'weekly' | 'yearly';

        if (avgInterval >= 28 && avgInterval <= 32) {
            interval = 'monthly';
        } else if (avgInterval >= 6 && avgInterval <= 8) {
            interval = 'weekly';
        } else if (avgInterval >= 360 && avgInterval <= 370) {
            interval = 'yearly';
        } else {
            return null; // Irregular interval
        }

        // Determine most frequent category and account
        const categoryIds = sorted.map(t => t.categoryId);
        const accountIds = sorted.map(t => t.accountId);
        const modeCategoryId = this.getMode(categoryIds, 0.5); // Lower threshold for category/account
        const modeAccountId = this.getMode(accountIds, 0.5);

        if (!modeCategoryId || !modeAccountId) return null;

        return {
            name: sorted[0].description, // Use most recent description
            description: sorted[0].description,
            amount: modeAmount,
            interval,
            confidence: 0.8, // Placeholder
            occurrences: sorted.length,
            lastDate: sorted[0].date,
            firstDate: sorted[sorted.length - 1].date,
            categoryId: modeCategoryId,
            accountId: modeAccountId
        };
    }

    private getMode(numbers: number[], threshold = 0.7): number | null {
        const counts: Record<number, number> = {};
        for (const n of numbers) {
            counts[n] = (counts[n] || 0) + 1;
        }

        let maxCount = 0;
        let mode = null;
        for (const n in counts) {
            if (counts[n] > maxCount) {
                maxCount = counts[n];
                mode = Number(n);
            }
        }

        // If mode appears in at least threshold% of cases
        if (maxCount / numbers.length >= threshold) {
            return mode;
        }
        return null;
    }

    private filterExisting(suggestions: RecurringSuggestion[], existing: RecurringExpense[]): RecurringSuggestion[] {
        return suggestions.filter(s => {
            // Check if matches any existing recurring expense
            // We check if amount is same AND name is roughly similar
            const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');

            const match = existing.find(e => {
                // Exact amount match AND fuzzy name match
                // or just name match?
                // Providing a loose match to avoid annoyance
                return normalize(e.name).includes(normalize(s.name)) || normalize(s.name).includes(normalize(e.name));
            });

            return !match;
        });
    }
}
