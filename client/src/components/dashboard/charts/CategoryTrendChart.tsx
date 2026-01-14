
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Category } from "@/context/FinanceContext";

interface CategoryTrendChartProps {
    data: any[];
    categoryTrendId: string;
    setCategoryTrendId: (value: string) => void;
    categories: Category[];
    selectedCategoryForTrend: Category | undefined;
    privacyMode: boolean;
    formatCurrency: (amount: number) => string;
}

export function CategoryTrendChart({
    data,
    categoryTrendId,
    setCategoryTrendId,
    categories,
    selectedCategoryForTrend,
    privacyMode,
    formatCurrency
}: CategoryTrendChartProps) {
    const displayCurrency = (amount: number) => {
        if (privacyMode) return "•••••";
        return formatCurrency(amount);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <CardTitle>Andamento Categoria</CardTitle>
                        <CardDescription>
                            {selectedCategoryForTrend
                                ? `Totale mensile ${selectedCategoryForTrend.type === 'income' ? 'entrate' : 'spese'}: ${selectedCategoryForTrend.name}`
                                : 'Seleziona una categoria per vedere il trend'}
                        </CardDescription>
                    </div>
                    <Select value={categoryTrendId} onValueChange={setCategoryTrendId}>
                        <SelectTrigger className="w-[200px]" data-testid="select-category-trend">
                            <SelectValue placeholder="Seleziona categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            {categories.filter(c => c.name.toLowerCase() !== 'trasferimenti').map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </CardHeader>
            <CardContent className="pl-0">
                <div className="h-[300px] w-full">
                    {categoryTrendId && data.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => privacyMode ? "•••" : `€${value.toFixed(0)}`}
                                />
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        if (name === 'budget') return [displayCurrency(value), 'Budget'];
                                        const label = selectedCategoryForTrend?.name || 'Totale';
                                        return [displayCurrency(value), label];
                                    }}
                                    contentStyle={{ backgroundColor: 'var(--color-card)', borderRadius: '8px', border: '1px solid var(--color-border)' }}
                                    itemStyle={{ color: 'var(--color-foreground)' }}
                                />
                                <Bar
                                    dataKey="total"
                                    radius={[4, 4, 0, 0]}
                                    name="total"
                                    maxBarSize={50}
                                >
                                    {data.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.overBudget ? '#ef4444' : '#8b5cf6'}
                                        />
                                    ))}
                                </Bar>
                                <Line
                                    type="monotone"
                                    dataKey="budget"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    dot={false}
                                    name="budget"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-muted-foreground">
                            {categoryTrendId ? 'Nessun dato disponibile' : 'Seleziona una categoria per vedere l\'andamento'}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
