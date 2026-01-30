
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CashFlowDataPoint } from "@/types/charts";

interface CashFlowChartProps {
    data: CashFlowDataPoint[];
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
}

export function CashFlowChart({ data, privacyMode, formatCurrency }: CashFlowChartProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Cash Flow</CardTitle>
                <CardDescription>Income vs Expenses over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-0">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => privacyMode ? "•••" : `€${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    const formattedValue = privacyMode ? "•••••" : formatCurrency(value);
                                    const label = name === 'income' ? 'Income' : 'Expenses';
                                    return [formattedValue, label];
                                }}
                                contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '0px', border: '1px solid var(--color-border)' }}
                                itemStyle={{ color: 'var(--color-foreground)' }}
                            />
                            <Area type="linear" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} name="income" />
                            <Area type="linear" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} name="expense" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
