
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MoveUpRight } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { NetWorthProjectionDataPoint } from "@/types/charts";

interface NetWorthProjectionChartProps {
    data: NetWorthProjectionDataPoint[];
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
}

export function NetWorthProjectionChart({ data, privacyMode, formatCurrency }: NetWorthProjectionChartProps) {
    const displayCurrency = (amount: number) => {
        if (privacyMode) return "•••••";
        return formatCurrency(amount);
    };

    const targetNetWorth = data.length > 0 ? data[data.length - 1].netWorth : 0;

    return (
        <Card className="col-span-1">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Net Worth Projection</CardTitle>
                        <CardDescription>
                            Estimated wealth for the next 12 months
                            <span className="block text-xs text-muted-foreground mt-1 font-normal">
                                * Based on your current budget settings
                            </span>
                        </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Target NW</span>
                        <div className="flex items-center gap-2">
                            <MoveUpRight className="h-4 w-4 text-green-500" />
                            <span className="text-lg font-bold font-heading text-green-600">{displayCurrency(targetNetWorth)}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pl-0">
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => privacyMode ? "•••" : `€${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                formatter={(value: number) => [displayCurrency(value), 'Projected Net Worth']}
                                contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '0px', border: '1px solid var(--color-border)' }}
                                itemStyle={{ color: 'var(--color-foreground)' }}
                            />
                            <Area
                                type="linear"
                                dataKey="netWorth"
                                stroke="#10b981"
                                fillOpacity={1}
                                fill="url(#colorProjection)"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                                activeDot={{ r: 5, fill: '#10b981' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}
