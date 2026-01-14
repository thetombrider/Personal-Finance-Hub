
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface NetWorthEvolutionChartProps {
    data: any[];
    totalBalance: number;
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
}

export function NetWorthEvolutionChart({ data, totalBalance, privacyMode, formatCurrency }: NetWorthEvolutionChartProps) {
    const displayCurrency = (amount: number) => {
        if (privacyMode) return "•••••";
        return formatCurrency(amount);
    };

    return (
        <Card className="md:col-span-2">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Net Worth Evolution</CardTitle>
                        <CardDescription>
                            Your total wealth over time
                            <span className="block text-xs text-muted-foreground mt-1 font-normal">
                                * Historical investment value calculated at Cost Basis (Invested Capital)
                            </span>
                        </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <span className="text-lg font-bold font-heading">{displayCurrency(totalBalance)}</span>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-0">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => privacyMode ? "•••" : formatCurrency(value)}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                formatter={(value: number) => [displayCurrency(value), 'Net Worth']}
                                contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                itemStyle={{ color: 'var(--color-foreground)' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="netWorth"
                                stroke="#6366f1"
                                fillOpacity={1}
                                fill="url(#colorNetWorth)"
                                strokeWidth={2}
                                dot={{ fill: '#6366f1', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, fill: '#6366f1' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
