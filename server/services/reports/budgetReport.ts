
import { IStorage } from "../../storage";

export async function getMonthlyBudget(storage: IStorage, userId: string, year: number, month: number) {
    const [categories, monthlyBudgets, plannedExpenses, recurringExpenses] = await Promise.all([
        storage.getCategories(userId),
        storage.getMonthlyBudgets(userId, year, month),
        storage.getPlannedExpenses(userId, year, month),
        storage.getActiveRecurringExpenses(userId)
    ]);

    // Filter recurring expenses to only those valid for this month/year
    const validRecurringExpenses = recurringExpenses.filter(re => {
        const startDate = new Date(re.startDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1; // 1-indexed

        // Check if it hasn't started yet
        if (startYear > year || (startYear === year && startMonth > month)) return false;

        // Check if it has already ended
        if (re.endDate) {
            const endDate = new Date(re.endDate);
            const endYear = endDate.getFullYear();
            const endMonth = endDate.getMonth() + 1;

            if (endYear < year || (endYear === year && endMonth < month)) return false;
        }

        // Check interval-specific logic
        if (re.interval === 'yearly') {
            // Only include if the month matches the start month
            if (startMonth !== month) return false;
        } else if (re.interval === 'quarterly') {
            // Only include every 3 months from start
            const monthsSinceStart = (year - startYear) * 12 + (month - startMonth);
            if (monthsSinceStart < 0 || monthsSinceStart % 3 !== 0) return false;
        }
        // Weekly and monthly apply to all valid months

        return true;
    });

    return categories.map(category => {
        const monthlyBudget = monthlyBudgets.find(b => b.categoryId === category.id);
        const baseline = monthlyBudget ? parseFloat(monthlyBudget.amount.toString()) : 0;

        const categoryPlanned = plannedExpenses.filter(p => p.categoryId === category.id);
        const plannedTotal = categoryPlanned.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

        const categoryRecurring = validRecurringExpenses.filter(r => r.categoryId === category.id);
        // Calculate total based on interval
        const recurringTotal = categoryRecurring.reduce((sum, r) => {
            const amount = parseFloat(r.amount.toString());
            if (r.interval === 'weekly') {
                // Weekly transactions occur ~4-5 times per month
                const daysInMonth = new Date(year, month, 0).getDate();
                const weeksInMonth = Math.ceil(daysInMonth / 7);
                return sum + (amount * weeksInMonth);
            }
            return sum + amount;
        }, 0);

        return {
            category,
            baseline,
            planned: plannedTotal,
            recurring: recurringTotal,
            total: baseline + plannedTotal + recurringTotal,
            plannedExpenses: categoryPlanned,
            recurringExpenses: categoryRecurring
        };
    });
}

// Calculate annual budget totals per category
export async function getYearlyBudgetTotal(storage: IStorage, userId: string, year: number) {
    const [categories, monthlyBudgets, plannedExpenses, recurringExpenses] = await Promise.all([
        storage.getCategories(userId),
        storage.getMonthlyBudgetsByYear(userId, year),
        storage.getPlannedExpensesByYear(userId, year),
        storage.getActiveRecurringExpenses(userId)
    ]);

    return categories.map(category => {
        // 1. Baselines sum
        const categoryBudgets = monthlyBudgets.filter(b => b.categoryId === category.id);
        const baselineTotal = categoryBudgets.reduce((sum, b) => sum + parseFloat(b.amount.toString()), 0);

        // 2. Planned Expenses sum (already filtered by year in DB query)
        const categoryPlanned = plannedExpenses.filter(p => p.categoryId === category.id);
        const plannedTotal = categoryPlanned.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);

        // 3. Recurring Expenses sum
        let recurringTotal = 0;
        const categoryRecurring = recurringExpenses.filter(r => r.categoryId === category.id);

        categoryRecurring.forEach(re => {
            const startDate = new Date(re.startDate);
            const startYear = startDate.getFullYear();
            const startMonth = startDate.getMonth() + 1;

            // Determine effective start month within the year
            let effectiveStartMonth = 1;
            if (startYear === year) {
                effectiveStartMonth = startMonth;
            } else if (startYear > year) {
                return; // Not active this year
            }

            // Determine effective end month within the year
            let effectiveEndMonth = 12;
            if (re.endDate) {
                const endDate = new Date(re.endDate);
                const endYear = endDate.getFullYear();
                const endMonth = endDate.getMonth() + 1;
                if (endYear < year) return; // Already ended
                if (endYear === year) effectiveEndMonth = endMonth;
            }

            const amount = parseFloat(re.amount.toString());

            // Calculate occurrences based on interval
            if (re.interval === 'yearly') {
                // Only once per year, in the start month
                if (effectiveStartMonth <= 12 && effectiveEndMonth >= startMonth) {
                    recurringTotal += amount;
                }
            } else if (re.interval === 'quarterly') {
                // Count how many quarters fall within the active period
                let occurrences = 0;
                for (let m = effectiveStartMonth; m <= effectiveEndMonth; m++) {
                    const monthsSinceStart = (year - startYear) * 12 + (m - startMonth);
                    if (monthsSinceStart >= 0 && monthsSinceStart % 3 === 0) {
                        occurrences++;
                    }
                }
                recurringTotal += amount * occurrences;
            } else if (re.interval === 'weekly') {
                // Sum weeks for all active months
                for (let m = effectiveStartMonth; m <= effectiveEndMonth; m++) {
                    const daysInMonth = new Date(year, m - 1, 0).getDate();
                    const weeksInMonth = Math.ceil(daysInMonth / 7);
                    recurringTotal += amount * weeksInMonth;
                }
            } else {
                // Monthly: multiply by number of active months
                const monthsActive = Math.max(0, effectiveEndMonth - effectiveStartMonth + 1);
                recurringTotal += amount * monthsActive;
            }
        });

        return {
            category,
            baseline: baselineTotal,
            planned: plannedTotal,
            recurring: recurringTotal,
            total: baselineTotal + plannedTotal + recurringTotal,
            plannedExpenses: categoryPlanned, // return all for year
            recurringExpenses: categoryRecurring // return all active
        };
    });
}

export async function getMonthlyIncomeStatement(storage: IStorage, userId: string, year: number, month: number) {
    const isYearly = month === 0;
    // If month 0, range is full year. Month in Date constructor is 0-indexed (0=Jan, 11=Dec).
    // range: Jan 1 to Dec 31
    const startDate = isYearly ? new Date(year, 0, 1) : new Date(year, month - 1, 1);
    const endDate = isYearly ? new Date(year, 11, 31, 23, 59, 59) : new Date(year, month, 0, 23, 59, 59);

    const [categories, budgetData] = await Promise.all([
        storage.getCategories(userId),
        isYearly
            ? getYearlyBudgetTotal(storage, userId, year)
            : getMonthlyBudget(storage, userId, year, month)
    ]);

    // Use optimized date-range fetch
    const monthTransactions = await storage.getTransactionsByDateRange(userId, startDate, endDate);

    const report = categories
        .filter(c => c.name.toLowerCase() !== 'trasferimenti')
        .map(category => {
            const budgetItem = budgetData.find(b => b.category.id === category.id);

            // Calculate actuals
            const categoryTransactions = monthTransactions.filter(t => t.categoryId === category.id);

            // Calculate net amount based on category type
            // If Category is INCOME: Net = Sum(Income Txs) - Sum(Expense Txs)
            // If Category is EXPENSE: Net = Sum(Expense Txs) - Sum(Income Txs)
            const actual = categoryTransactions.reduce((sum, t) => {
                const amount = parseFloat(t.amount.toString());
                if (category.type === 'income') {
                    return sum + (t.type === 'income' ? amount : -amount);
                } else {
                    return sum + (t.type === 'expense' ? amount : -amount);
                }
            }, 0);

            const budget = budgetItem ? budgetItem.total : 0;
            const isIncome = category.type === 'income';

            const difference = actual - budget;

            return {
                category,
                actual,
                budget,
                difference,
                isIncome
            };
        });

    // Calculate totals
    const totalIncome = report
        .filter(r => r.isIncome)
        .reduce((acc, curr) => ({
            actual: acc.actual + curr.actual,
            budget: acc.budget + curr.budget
        }), { actual: 0, budget: 0 });

    const totalExpenses = report
        .filter(r => !r.isIncome)
        .reduce((acc, curr) => ({
            actual: acc.actual + curr.actual,
            budget: acc.budget + curr.budget
        }), { actual: 0, budget: 0 });

    const netResult = {
        actual: totalIncome.actual - totalExpenses.actual,
        budget: totalIncome.budget - totalExpenses.budget
    };

    return {
        items: report,
        summary: {
            income: totalIncome,
            expenses: totalExpenses,
            netResult
        }
    };
}
