
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";

interface WealthDistributionChartProps {
    data: any[];
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function WealthDistributionChart({ data, privacyMode, formatCurrency }: WealthDistributionChartProps) {
    const displayCurrency = (amount: number) => {
        if (privacyMode) return "•••••";
        return formatCurrency(amount);
    };

    return (
        <Card className="md:col-span-1">
            <CardHeader>
                <CardTitle>Patrimonio per Tipo</CardTitle>
                <CardDescription>Distribuzione del patrimonio</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[250px] w-full">
                    {data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <XAxis
                                    type="number"
                                    stroke="#888888"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => privacyMode ? "•••" : `€${(value / 1000).toFixed(0)}k`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={10}
                                    tickLine={false}
                                    axisLine={false}
                                    width={70}
                                />
                                <Tooltip
                                    formatter={(value: any, name: string) => {
                                        const numValue = Number(value) || 0;
                                        if (name === 'loss') return [displayCurrency(numValue), 'Perdita Latente'];
                                        if (name === 'gain') return [displayCurrency(numValue), 'Guadagno Latente'];
                                        return [displayCurrency(numValue), 'Valore Base'];
                                    }}
                                    contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                    itemStyle={{ color: 'var(--color-foreground)' }}
                                />
                                <Bar dataKey="base" stackId="a" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-base-${index}`} fill={entry.name === 'Investimenti' ? '#3b82f6' : COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                                <Bar dataKey="gain" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} />
                                <Bar dataKey="loss" stackId="a" fill="#ef4444" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            No accounts available
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
