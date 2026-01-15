import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

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

    const months = [
        { value: 0, label: "Full Year" },
        ...Array.from({ length: 12 }, (_, i) => ({
            value: i + 1,
            label: format(new Date(year, i), "MMMM").charAt(0).toUpperCase() + format(new Date(year, i), "MMMM").slice(1)
        }))
    ];
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

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
                                <IncomeStatementRow key={item.category.id} item={item} />
                            ))}
                            <SummaryRow label="Total Income" summary={data.summary.income} isIncome />

                            {/* Expenses Section */}
                            <div className="p-4 bg-red-50/30 font-semibold text-red-700 mt-4 border-t">Expenses</div>
                            {data.items.filter(i => !i.isIncome).map((item) => (
                                <IncomeStatementRow key={item.category.id} item={item} />
                            ))}
                            <SummaryRow label="Total Expenses" summary={data.summary.expenses} />

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
        </div>
    );
}

function IncomeStatementRow({ item }: { item: IncomeStatementItem }) {
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
            <div className="col-span-2 text-right font-medium">
                {formatCurrency(item.actual)}
            </div>
            <div className="col-span-2 text-right text-muted-foreground">
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

function SummaryRow({ label, summary, isIncome = false }: { label: string, summary: IncomeStatementSummary, isIncome?: boolean }) {
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
            <div className="col-span-2 text-right">
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
