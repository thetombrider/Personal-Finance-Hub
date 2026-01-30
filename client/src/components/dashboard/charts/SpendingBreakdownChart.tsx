
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { CategoryDataPoint } from "@/types/charts";

interface SpendingBreakdownChartProps {
    data: CategoryDataPoint[];
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function SpendingBreakdownChart({ data, privacyMode, formatCurrency }: SpendingBreakdownChartProps) {
    const displayCurrency = (amount: number) => {
        if (privacyMode) return "•••••";
        return formatCurrency(amount);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Where your money goes</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full flex flex-col items-center justify-center">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => displayCurrency(value)}
                                    contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '0px', border: '1px solid var(--color-border)' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="text-muted-foreground text-sm">No expense data available</div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-4 w-full">
                        {data.slice(0, 4).map((entry, index) => (
                            <div key={index} className="flex items-center gap-2 text-xs">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                <span className="truncate flex-1">{entry.name}</span>
                                <span className="font-medium">{displayCurrency(entry.value as number)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
