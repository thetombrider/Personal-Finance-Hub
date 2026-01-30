import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { TransactionDrilldown } from "./TransactionDrilldown";
import { useBudgetData } from "@/hooks/queries";
import { useBudgetMutations } from "@/hooks/mutations";
import { BudgetDrilldown } from "@/components/budget/BudgetDrilldown";
import { PlannedExpense, RecurringExpense } from "@shared/schema";

export interface IncomeStatementItem {
    category: {
        id: number;
        name: string;
        type: 'income' | 'expense';
        color: string;
    };
    actual: number;
    budget: number;
    difference: number;
    isIncome: boolean;
}

export interface IncomeStatementSummary {
    actual: number;
    budget: number;
}

export interface IncomeStatementResponse {
    items: IncomeStatementItem[];
    summary: {
        income: IncomeStatementSummary;
        expenses: IncomeStatementSummary;
        netResult: IncomeStatementSummary;
    };
}

export function IncomeStatement() {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth() + 1);

    const { data, isLoading, error } = useQuery<IncomeStatementResponse>({
        queryKey: ["reports", "income-statement", year, month],
        queryFn: async () => {
            const res = await fetch(`/api/reports/income-statement/${year}/${month}`);
            if (!res.ok) throw new Error("Failed to fetch income statement");
            return res.json();
        }
    });

    // Fetch budget data for drilldown
    const { data: budgetData } = useBudgetData(year);
    const { updateBudgetCell } = useBudgetMutations();

    const [budgetDrilldownConfig, setBudgetDrilldownConfig] = useState<{
        open: boolean;
        title: string;
        categoryId?: number;
        month?: number;
        data: {
            baseline: number;
            planned: PlannedExpense[];
            recurring: RecurringExpense[];
            total: number;
        };
    }>({
        open: false,
        title: "",
        data: { baseline: 0, planned: [], recurring: [], total: 0 }
    });

    const handleDrilldownUpdateBaseline = async (amount: number) => {
        if (!budgetDrilldownConfig.categoryId || !budgetDrilldownConfig.month) return;

        // Month is 1-based in local state here (0=Full Year, 1=Jan)
        // If month is 0, we shouldn't be here (edit button shouldn't show)

        await updateBudgetCell.mutateAsync({
            categoryId: budgetDrilldownConfig.categoryId,
            month: budgetDrilldownConfig.month,
            year: year,
            planned: amount
        });

        // Update local state for immediate feedback
        const newTotal = amount
            + budgetDrilldownConfig.data.planned.reduce((sum, item) => sum + Number(item.amount), 0)
            + budgetDrilldownConfig.data.recurring.reduce((sum, item) => sum + Number(item.amount), 0);

        setBudgetDrilldownConfig(prev => ({
            ...prev,
            data: {
                ...prev.data,
                baseline: amount,
                total: newTotal
            }
        }));
    };

    const handleBudgetDrilldown = (categoryId: number, categoryName: string) => {
        if (!budgetData) return;

        let baseline = 0;
        let total = 0;
        let planned: PlannedExpense[] = [];
        let recurring: RecurringExpense[] = [];

        if (month !== 0) {
            // Specific month (1-12)
            const cell = budgetData.budgetData[categoryId]?.[month];
            if (cell) {
                baseline = cell.baseline;
                total = cell.total;
            }

            // Filter planned
            planned = budgetData.plannedExpenses.filter(e => {
                const d = new Date(e.date);
                return e.categoryId === categoryId && d.getMonth() === (month - 1) && d.getFullYear() === year;
            });

            // Filter recurring
            const monthStart = new Date(year, month - 1, 1);
            const monthEnd = new Date(year, month, 0, 23, 59, 59);

            recurring = budgetData.recurringExpenses.filter(e => {
                if (e.categoryId !== categoryId) return false;
                const start = new Date(e.startDate);
                const end = e.endDate ? new Date(e.endDate) : null;

                if (start > monthEnd) return false;
                // If end date is set, it must be on or after month start
                if (end && end < monthStart) return false;

                // If yearly, only include if matches month
                if (e.interval === 'yearly' && start.getMonth() !== (month - 1)) return false;

                return true;
            });
        } else {
            // Full Year
            // Sum baseline and total over all 12 months
            for (let m = 1; m <= 12; m++) {
                const cell = budgetData.budgetData[categoryId]?.[m];
                if (cell) {
                    baseline += cell.baseline;
                    total += cell.total;
                }
            }

            // All planned for year
            planned = budgetData.plannedExpenses.filter(e =>
                e.categoryId === categoryId && new Date(e.date).getFullYear() === year
            );

            // Recurring active in year
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31, 23, 59, 59);

            recurring = budgetData.recurringExpenses.filter(e => {
                if (e.categoryId !== categoryId) return false;
                const start = new Date(e.startDate);
                const end = e.endDate ? new Date(e.endDate) : null;

                if (start > yearEnd) return false;
                if (end && end < yearStart) return false;
                return true;
            });
        }

        setBudgetDrilldownConfig({
            open: true,
            title: `${categoryName} - ${month === 0 ? year : format(new Date(year, month - 1), 'MMMM yyyy')} Budget`,
            categoryId,
            month, // 0 for full year, 1-12 for specific month
            data: { baseline, planned, recurring, total }
        });
    };

    const months = [
        { value: 0, label: "Full Year" },
        ...Array.from({ length: 12 }, (_, i) => ({
            value: i + 1,
            label: format(new Date(year, i), "MMMM").charAt(0).toUpperCase() + format(new Date(year, i), "MMMM").slice(1)
        }))
    ];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    const [drilldownConfig, setDrilldownConfig] = useState<{
        title: string;
        filters: {
            categoryId?: string;
            type?: string;
            dateFrom: Date;
            dateTo: Date;
        }
    } | null>(null);

    const handleDrilldown = (categoryName: string, categoryId: number | undefined, type: 'income' | 'expense' | undefined) => {
        let dateFrom: Date;
        let dateTo: Date;

        if (month === 0) {
            dateFrom = new Date(year, 0, 1);
            dateTo = new Date(year, 11, 31, 23, 59, 59);
        } else {
            // month is 1-indexed in state, but 0-indexed in Date constructor
            dateFrom = new Date(year, month - 1, 1);
            dateTo = new Date(year, month, 0, 23, 59, 59);
        }

        setDrilldownConfig({
            title: `${categoryName} - ${month === 0 ? year : format(dateFrom, 'MMMM yyyy')}`,
            filters: {
                categoryId: categoryId?.toString(),
                type,
                dateFrom,
                dateTo
            }
        });
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">Error loading report.</div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle>{month === 0 ? "Annual Income Statement" : "Monthly Income Statement"}</CardTitle>
                        <CardDescription>
                            {month === 0
                                ? "Comparison between actual and budget for the selected year"
                                : "Comparison between actual and budget for the selected month"}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m) => (
                                    <SelectItem key={m.value} value={m.value.toString()}>
                                        {m.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                            <SelectTrigger className="w-[100px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <div className="grid grid-cols-12 gap-4 p-4 border-b bg-muted/50 font-medium text-sm">
                            <div className="col-span-4">Category</div>
                            <div className="col-span-2 text-right">Actual</div>
                            <div className="col-span-2 text-right">Budget</div>
                            <div className="col-span-2 text-right">Difference</div>
                            <div className="col-span-2 text-right">Status</div>
                        </div>

                        <div className="divide-y">
                            {/* Income Section */}
                            <div className="p-4 bg-green-50/30 font-semibold text-green-700">Income</div>
                            {data.items.filter(i => i.isIncome).map((item) => (
                                <IncomeStatementRow
                                    key={item.category.id}
                                    item={item}
                                    onDrilldown={() => handleDrilldown(item.category.name, item.category.id, undefined)}
                                    onBudgetDrilldown={month !== 0 ? () => handleBudgetDrilldown(item.category.id, item.category.name) : undefined}
                                />
                            ))}
                            <SummaryRow
                                label="Total Income"
                                summary={data.summary.income}
                                isIncome
                            />

                            {/* Expenses Section */}
                            <div className="p-4 bg-red-50/30 font-semibold text-red-700 mt-4 border-t">Expenses</div>
                            {data.items.filter(i => !i.isIncome).map((item) => (
                                <IncomeStatementRow
                                    key={item.category.id}
                                    item={item}
                                    onDrilldown={() => handleDrilldown(item.category.name, item.category.id, undefined)}
                                    onBudgetDrilldown={month !== 0 ? () => handleBudgetDrilldown(item.category.id, item.category.name) : undefined}
                                />
                            ))}
                            <SummaryRow
                                label="Total Expenses"
                                summary={data.summary.expenses}
                            />

                            {/* Net Result */}
                            <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-bold border-t mt-4">
                                <div className="col-span-4">Net Result</div>
                                <div className={cn("col-span-2 text-right", data.summary.netResult.actual >= 0 ? "text-green-600" : "text-red-600")}>
                                    {formatCurrency(data.summary.netResult.actual)}
                                </div>
                                <div className="col-span-2 text-right text-muted-foreground">
                                    {formatCurrency(data.summary.netResult.budget)}
                                </div>
                                <div className={cn("col-span-2 text-right",
                                    (data.summary.netResult.actual - data.summary.netResult.budget) >= 0 ? "text-green-600" : "text-red-600"
                                )}>
                                    {formatCurrency(data.summary.netResult.actual - data.summary.netResult.budget)}
                                </div>
                                <div className="col-span-2"></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {drilldownConfig && (
                <TransactionDrilldown
                    isOpen={!!drilldownConfig}
                    onClose={() => setDrilldownConfig(null)}
                    title={drilldownConfig.title}
                    initialFilters={drilldownConfig.filters}
                />
            )}

            <BudgetDrilldown
                isOpen={budgetDrilldownConfig.open}
                onClose={() => setBudgetDrilldownConfig(prev => ({ ...prev, open: false }))}
                title={budgetDrilldownConfig.title}
                data={budgetDrilldownConfig.data}
                onUpdateBaseline={budgetDrilldownConfig.month !== 0 ? handleDrilldownUpdateBaseline : undefined}
            />
        </div>
    );
}

function IncomeStatementRow({ item, onDrilldown, onBudgetDrilldown }: { item: IncomeStatementItem, onDrilldown: () => void, onBudgetDrilldown?: () => void }) {
    const diff = item.difference;
    // Backend now returns Difference = Actual - Budget for ALL items.
    // Income: Actual > Budget (Positive Diff) => GOOD (Green)
    // Expense: Actual < Budget (Negative Diff) => GOOD (Green)
    //          Actual > Budget (Positive Diff) => BAD (Red)

    // Simplification:
    // Income: Diff > 0 ? Green : Red
    // Expense: Diff < 0 ? Green : Red

    const isGood = item.isIncome ? diff >= 0 : diff <= 0;

    return (
        <div className="grid grid-cols-12 gap-4 p-4 text-sm hover:bg-muted/30 transition-colors items-center">
            <div className="col-span-4 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.category.color }} />
                <span>{item.category.name}</span>
            </div>
            <div
                className="col-span-2 text-right font-medium cursor-pointer hover:underline hover:text-primary transition-colors"
                onClick={onDrilldown}
                title="View transactions"
            >
                {formatCurrency(item.actual)}
            </div>
            <div
                className={cn("col-span-2 text-right text-muted-foreground", onBudgetDrilldown ? "cursor-pointer hover:underline hover:text-primary transition-colors" : "")}
                onClick={onBudgetDrilldown}
                title={onBudgetDrilldown ? "View budget details" : undefined}
            >
                {formatCurrency(item.budget)}
            </div>
            <div className={cn("col-span-2 text-right font-medium", isGood ? "text-green-600" : "text-red-600")}>
                {diff > 0 ? "+" : ""}{formatCurrency(diff)}
            </div>
            <div className="col-span-2 flex justify-end">
                {isGood ? <TrendingUp className="text-green-500 h-4 w-4" /> : <TrendingDown className="text-red-500 h-4 w-4" />}
            </div>
        </div>
    );
}

function SummaryRow({ label, summary, isIncome = false, onDrilldown }: { label: string, summary: IncomeStatementSummary, isIncome?: boolean, onDrilldown?: () => void }) {
    // Backend returns summary: actual, budget. 
    // We calculate diff here as Actual - Budget for consistency with backend items.
    const diff = summary.actual - summary.budget;

    // Logic for Summary Row:
    // Income: Diff > 0 (Earned more than budget) => Green
    // Expense: Diff < 0 (Spent less than budget) => Green (Saved)

    const isGood = isIncome ? diff >= 0 : diff <= 0;

    return (
        <div className="grid grid-cols-12 gap-4 p-4 font-semibold bg-muted/20 border-t">
            <div className="col-span-4">{label}</div>
            <div
                className={cn("col-span-2 text-right", onDrilldown ? "cursor-pointer hover:underline hover:text-primary transition-colors" : "")}
                onClick={onDrilldown}
                title={onDrilldown ? "View transactions" : undefined}
            >
                {formatCurrency(summary.actual)}
            </div>
            <div className="col-span-2 text-right text-muted-foreground">
                {formatCurrency(summary.budget)}
            </div>
            <div className={cn("col-span-2 text-right", isGood ? "text-green-600" : "text-red-600")}>
                {diff > 0 ? "+" : ""}{formatCurrency(diff)}
            </div>
            <div className="col-span-2"></div>
        </div>
    )
}
