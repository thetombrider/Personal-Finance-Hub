
import Layout from "@/components/Layout";
import { useState } from "react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useFinance } from "@/context/FinanceContext";

interface BudgetData {
    category: {
        id: number;
        name: string;
        color: string;
        icon: string | null;
    };
    baseline: number;
    planned: number;
    recurring: number;
    total: number;
    spent: number;
    remaining: number;
    plannedExpenses: any[];
    recurringExpenses: any[];
}

export default function Budget() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { accounts, categories } = useFinance();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;

    const { data: budgetData, isLoading } = useQuery<BudgetData[]>({
        queryKey: ['budget', year, month],
        queryFn: async () => {
            const res = await fetch(`/api/budget/${year}/${month}`);
            if (!res.ok) throw new Error('Failed to fetch budget');
            return res.json();
        }
    });

    const nextMonth = () => {
        setCurrentDate(new Date(year, month, 1)); // month is 0-indexed in Date
    };

    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 2, 1));
    };

    const formatEuro = (amount: number) => {
        return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount);
    };

    // Mutations
    const updateBaselineMutation = useMutation({
        mutationFn: async ({ categoryId, amount }: { categoryId: number, amount: number }) => {
            const res = await fetch('/api/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryId, year, month, amount })
            });
            if (!res.ok) throw new Error('Failed to update baseline');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', year, month] });
            toast({ title: "Budget aggiornato", description: "Il budget baseline è stato salvato." });
        }
    });

    const addPlannedExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/budget/planned', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to add planned expense');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', year, month] });
            toast({ title: "Spesa pianificata aggiunta" });
        }
    });

    const addRecurringExpenseMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch('/api/budget/recurring', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!res.ok) throw new Error('Failed to add recurring expense');
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget'] }); // Invalidate all budget queries as recurring affects multiple months
            toast({ title: "Spesa ricorrente aggiunta" });
        }
    });

    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    const totalBudget = budgetData?.reduce((acc, curr) => acc + curr.total, 0) || 0;
    const totalSpent = budgetData?.reduce((acc, curr) => acc + curr.spent, 0) || 0;
    const totalPlanned = budgetData?.reduce((acc, curr) => acc + curr.planned, 0) || 0;
    const totalRecurring = budgetData?.reduce((acc, curr) => acc + curr.recurring, 0) || 0;

    return (
        <Layout>
            <div className="space-y-8 pb-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-foreground">Gestione Budget</h1>
                        <p className="text-muted-foreground">Pianifica e monitora le tue spese mensili</p>
                    </div>
                    <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
                        <Button variant="ghost" size="icon" onClick={prevMonth}>
                            <ChevronLeft size={20} />
                        </Button>
                        <span className="font-semibold min-w-[150px] text-center capitalize">
                            {format(currentDate, 'MMMM yyyy', { locale: it })}
                        </span>
                        <Button variant="ghost" size="icon" onClick={nextMonth}>
                            <ChevronRight size={20} />
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Budget Totale</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatEuro(totalBudget)}</div>
                            <p className="text-xs text-muted-foreground mt-1">Include baseline, pianificate e ricorrenti</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Speso</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-destructive">{formatEuro(totalSpent)}</div>
                            <Progress value={totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0} className="h-2 mt-2" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Rimanente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className={`text-2xl font-bold ${totalBudget - totalSpent >= 0 ? 'text-primary' : 'text-destructive'}`}>
                                {formatEuro(totalBudget - totalSpent)}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">Extra (Pian. + Ric.)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatEuro(totalPlanned + totalRecurring)}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                {formatEuro(totalPlanned)} Pian. + {formatEuro(totalRecurring)} Ric.
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Category List */}
                <div className="grid gap-6">
                    {budgetData?.map((data) => (
                        <BudgetCategoryCard
                            key={data.category.id}
                            data={data}
                            year={year}
                            month={month}
                            onUpdateBaseline={(amount) => updateBaselineMutation.mutate({ categoryId: data.category.id, amount })}
                            onAddPlanned={(expenseData) => addPlannedExpenseMutation.mutate({ ...expenseData, categoryId: data.category.id })}
                            onAddRecurring={(expenseData) => addRecurringExpenseMutation.mutate({ ...expenseData, categoryId: data.category.id })}
                        />
                    ))}
                    {budgetData?.length === 0 && (
                        <div className="text-center p-8 text-muted-foreground">Nessuna categoria trovata. Crea prima le categorie.</div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

function BudgetCategoryCard({ data, year, month, onUpdateBaseline, onAddPlanned, onAddRecurring }: {
    data: BudgetData,
    year: number,
    month: number,
    onUpdateBaseline: (amount: number) => void,
    onAddPlanned: (data: any) => void,
    onAddRecurring: (data: any) => void
}) {
    const [isBaselineEditing, setIsBaselineEditing] = useState(false);
    const [baselineInput, setBaselineInput] = useState(data.baseline.toString());
    const { accounts } = useFinance();

    // Progress color based on percentage
    const percentage = data.total > 0 ? (data.spent / data.total) * 100 : 0;
    const progressColor = percentage > 100 ? "bg-destructive" : percentage > 85 ? "bg-yellow-500" : "bg-primary";

    const handleBaselineSave = () => {
        onUpdateBaseline(parseFloat(baselineInput));
        setIsBaselineEditing(false);
    };

    return (
        <Card className="overflow-hidden">
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: data.category.color }} />
                        <h3 className="text-lg font-semibold">{data.category.name}</h3>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-muted-foreground">Budget Totale</div>
                        <div className="text-xl font-bold">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(data.total)}</div>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                        <span>Speso: <span className="font-medium text-destructive">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(data.spent)}</span></span>
                        <span>Rimanente: <span className={`font-medium ${data.remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(data.remaining)}</span></span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full transition-all ${progressColor}`} style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="grid md:grid-cols-3 gap-6 pt-4 border-t">
                    {/* Baseline */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Baseline Mensile</span>
                            <Button variant="ghost" size="xs" onClick={() => setIsBaselineEditing(!isBaselineEditing)}>
                                <Edit2 size={12} />
                            </Button>
                        </div>
                        {isBaselineEditing ? (
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    value={baselineInput}
                                    onChange={(e) => setBaselineInput(e.target.value)}
                                    className="h-8"
                                />
                                <Button size="sm" onClick={handleBaselineSave}>OK</Button>
                            </div>
                        ) : (
                            <div className="font-semibold">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(data.baseline)}</div>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">Budget base per {data.category.name}</p>
                    </div>

                    {/* Planned Expenses */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Spese Pianificate</span>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="xs"><Plus size={12} /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Aggiungi Spesa Pianificata</DialogTitle>
                                    </DialogHeader>
                                    <AddPlannedExpenseForm onSubmit={onAddPlanned} year={year} month={month} />
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="font-semibold">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(data.planned)}</div>
                        <div className="mt-2 space-y-1">
                            {data.plannedExpenses.map(p => (
                                <div key={p.id} className="text-xs flex justify-between text-muted-foreground bg-muted/50 p-1 rounded">
                                    <span>{p.name} ({new Date(p.date).getDate()}/{new Date(p.date).getMonth() + 1})</span>
                                    <span>{p.amount}€</span>
                                </div>
                            ))}
                            {data.plannedExpenses.length === 0 && <p className="text-xs text-muted-foreground italic">Nessuna</p>}
                        </div>
                    </div>

                    {/* Recurring Expenses */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">Ricorrenti</span>
                            <Dialog>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" size="xs"><Plus size={12} /></Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Aggiungi Spesa Ricorrente</DialogTitle>
                                    </DialogHeader>
                                    <AddRecurringExpenseForm onSubmit={onAddRecurring} accounts={accounts} />
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="font-semibold">{new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(data.recurring)}</div>
                        <div className="mt-2 space-y-1">
                            {data.recurringExpenses.map(r => (
                                <div key={r.id} className="text-xs flex justify-between text-muted-foreground bg-muted/50 p-1 rounded">
                                    <span>{r.name} (giorno {r.dayOfMonth})</span>
                                    <span>{r.amount}€</span>
                                </div>
                            ))}
                            {data.recurringExpenses.length === 0 && <p className="text-xs text-muted-foreground italic">Nessuna</p>}
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
}

function AddPlannedExpenseForm({ onSubmit, year, month }: { onSubmit: (data: any) => void, year: number, month: number }) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [day, setDay] = useState("1");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const date = new Date(year, month - 1, parseInt(day));
        onSubmit({
            name,
            amount: parseFloat(amount),
            date: format(date, 'yyyy-MM-dd')
        });
        setName("");
        setAmount("");
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Nome Spesa</Label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="es. Viaggio" />
            </div>
            <div className="space-y-2">
                <Label>Importo</Label>
                <Input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
                <Label>Giorno del mese</Label>
                <Input required type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} />
            </div>
            <DialogFooter>
                <Button type="submit">Aggiungi</Button>
            </DialogFooter>
        </form>
    )
}

function AddRecurringExpenseForm({ onSubmit, accounts }: { onSubmit: (data: any) => void, accounts: any[] }) {
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [day, setDay] = useState("1");
    const [accountId, setAccountId] = useState(accounts[0]?.id.toString() || "");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit({
            name,
            amount: parseFloat(amount),
            accountId: parseInt(accountId),
            interval: "monthly",
            dayOfMonth: parseInt(day),
            startDate: new Date().toISOString().split('T')[0]
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label>Nome Spesa Ricorrente</Label>
                <Input required value={name} onChange={e => setName(e.target.value)} placeholder="es. Netflix" />
            </div>
            <div className="space-y-2">
                <Label>Importo Mensile</Label>
                <Input required type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div className="space-y-2">
                <Label>Addebito su Conto</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Seleziona conto" />
                    </SelectTrigger>
                    <SelectContent>
                        {accounts.map(a => (
                            <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Giorno di Addebito</Label>
                <Input required type="number" min="1" max="31" value={day} onChange={e => setDay(e.target.value)} />
            </div>
            <DialogFooter>
                <Button type="submit">Aggiungi</Button>
            </DialogFooter>
        </form>
    )
}
