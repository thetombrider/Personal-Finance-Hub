import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---

interface IncomeStatementItem {
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

interface IncomeStatementSummary {
    actual: number;
    budget: number;
}

interface IncomeStatementResponse {
    items: IncomeStatementItem[];
    summary: {
        income: IncomeStatementSummary;
        expenses: IncomeStatementSummary;
        netResult: IncomeStatementSummary;
    };
}

interface BalanceSheetResponse {
    assets: {
        cash: number;
        investments: number;
        total: number;
    };
    liabilities: {
        creditCards: number;
        total: number;
    };
    equity: {
        netWorth: number;
    };
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("it-IT", {
        style: "currency",
        currency: "EUR",
    }).format(amount);
};

import Layout from "@/components/Layout";

export default function Reports() {
    const [activeTab, setActiveTab] = useState("income-statement");

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                    <p className="text-muted-foreground mt-2">
                        Analisi finanziaria dettagliata e stato patrimoniale.
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList>
                        <TabsTrigger value="income-statement">Conto Economico</TabsTrigger>
                        <TabsTrigger value="balance-sheet">Stato Patrimoniale</TabsTrigger>
                    </TabsList>

                    <TabsContent value="income-statement" className="space-y-6">
                        <IncomeStatementView />
                    </TabsContent>

                    <TabsContent value="balance-sheet" className="space-y-6">
                        <BalanceSheetView />
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}

function IncomeStatementView() {
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

    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">Errore nel caricamento del report.</div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <div className="space-y-1">
                        <CardTitle>Conto Economico Mensile</CardTitle>
                        <CardDescription>Confronto tra reale e budget per il mese selezionato</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map((m) => (
                                    <SelectItem key={m} value={m.toString()}>
                                        {format(new Date(year, m - 1), "MMMM", { locale: it })}
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
                            <div className="col-span-4">Categoria</div>
                            <div className="col-span-2 text-right">Reale</div>
                            <div className="col-span-2 text-right">Budget</div>
                            <div className="col-span-2 text-right">Differenza</div>
                            <div className="col-span-2 text-right">Stato</div>
                        </div>

                        <div className="divide-y">
                            {/* Income Section */}
                            <div className="p-4 bg-green-50/30 font-semibold text-green-700">Entrate</div>
                            {data.items.filter(i => i.isIncome).map((item) => (
                                <IncomeStatementRow key={item.category.id} item={item} />
                            ))}
                            <SummaryRow label="Totale Entrate" summary={data.summary.income} isIncome />

                            {/* Expenses Section */}
                            <div className="p-4 bg-red-50/30 font-semibold text-red-700 mt-4 border-t">Uscite</div>
                            {data.items.filter(i => !i.isIncome).map((item) => (
                                <IncomeStatementRow key={item.category.id} item={item} />
                            ))}
                            <SummaryRow label="Totale Uscite" summary={data.summary.expenses} />

                            {/* Net Result */}
                            <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-bold border-t mt-4">
                                <div className="col-span-4">Risultato Netto</div>
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
    // Backend now returns Positive difference = Good for both Income (Actual > Budget) and Expense (Budget > Actual)
    const isGood = diff >= 0;

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
    // We calculate diff here.
    // For Income: Actual - Budget
    // For Expense: Budget - Actual (since spending less is good, we want positive numbers for 'savings')

    // Wait, the backend returns summary totals. Does it summarize differences? No. 
    // It returns actual and budget totals.
    // So we need to compute difference HERE locally for the summary row.

    let diff: number;
    if (isIncome) {
        // Income: Actual - Budget
        diff = summary.actual - summary.budget;
    } else {
        // Expense: Budget - Actual (Positive means saved money)
        diff = summary.budget - summary.actual;
    }

    const isGood = diff >= 0;

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

function BalanceSheetView() {
    const { data, isLoading, error } = useQuery<BalanceSheetResponse>({
        queryKey: ["reports", "balance-sheet"],
        queryFn: async () => {
            const res = await fetch("/api/reports/balance-sheet");
            if (!res.ok) throw new Error("Failed to fetch balance sheet");
            return res.json();
        }
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    }

    if (error) {
        return <div className="text-red-500 p-4 border border-red-200 rounded-md bg-red-50">Errore nel caricamento dello stato patrimoniale.</div>;
    }

    if (!data) return null;

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Stato Patrimoniale</CardTitle>
                    <CardDescription>Situazione attuale Assets vs Liabilities</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Assets side */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold text-green-700">Attività (Assets)</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                    <span className="font-medium">Liquidità (Cash)</span>
                                    <span>{formatCurrency(data.assets.cash)}</span>
                                </div>
                                <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                    <span className="font-medium">Investimenti</span>
                                    <span>{formatCurrency(data.assets.investments)}</span>
                                </div>
                                <Separator />
                                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg font-bold text-lg text-green-800">
                                    <span>Totale Attività</span>
                                    <span>{formatCurrency(data.assets.total)}</span>
                                </div>
                            </div>
                        </div>

                        {/* Liabilities & Equity side */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-lg font-semibold text-red-700">Passività & Patrimonio Netto</h3>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Passività (Liabilities)</h4>
                                    <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                                        <span className="font-medium">Carte di Credito</span>
                                        <span>{formatCurrency(data.liabilities.creditCards)}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg font-bold text-red-800">
                                        <span>Totale Passività</span>
                                        <span>{formatCurrency(data.liabilities.total)}</span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4">
                                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Patrimonio Netto (Equity)</h4>
                                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg font-bold text-blue-800 text-lg">
                                        <span>Patrimonio Netto</span>
                                        <span>{formatCurrency(data.equity.netWorth)}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground text-center pt-1">
                                        (Attività - Passività)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
