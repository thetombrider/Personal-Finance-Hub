
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface BudgetComparisonChartProps {
    data: any[];
    privacyMode: boolean;
    type: 'income' | 'expense';
}

export function BudgetComparisonChart({ data, privacyMode, type }: BudgetComparisonChartProps) {
    const isIncome = type === 'income';
    const title = isIncome ? "Budget vs Actual Income" : "Budget vs Actual Expenses";
    const description = isIncome
        ? "Monthly comparison of budgeted vs actual income"
        : "Monthly comparison of budgeted vs actual spending";

    const actualColor = isIncome ? "#10b981" : "#ef4444";
    const actualLabel = isIncome ? "Actual Income" : "Actual Expenses";
    const gradientId = isIncome ? "colorActualIncome" : "colorActualExpense";

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={`colorBudget${type}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={actualColor} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={actualColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => privacyMode ? "•••" : `€${value.toFixed(0)}`} />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    const formattedValue = privacyMode ? "•••••" : `€${value.toFixed(2)}`;
                                    const label = name === 'budget' ? 'Budget' : actualLabel;
                                    return [formattedValue, label];
                                }}
                                contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '0px', border: '1px solid var(--color-border)' }}
                                itemStyle={{ color: 'var(--color-foreground)' }}
                            />
                            <Area type="linear" dataKey="budget" stroke="#3b82f6" fillOpacity={1} fill={`url(#colorBudget${type})`} strokeWidth={2} name="budget" />
                            <Area type="linear" dataKey="actual" stroke={actualColor} fillOpacity={1} fill={`url(#${gradientId})`} strokeWidth={2} name="actual" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
