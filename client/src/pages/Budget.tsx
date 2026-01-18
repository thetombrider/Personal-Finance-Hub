
import Layout from "@/components/Layout";
import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
    type MonthlyBudget,
    type PlannedExpense,
    type RecurringExpense
} from "@shared/schema";
import { SummaryTable } from "@/components/budget/SummaryTable";
import { BaselineTable } from "@/components/budget/BaselineTable";
import { RecurringExpensesTable } from "@/components/budget/RecurringExpensesTable";
import { PlannedExpensesTable } from "@/components/budget/PlannedExpensesTable";
import { AddRecurringExpenseForm } from "@/components/budget/AddRecurringExpenseForm";
import { AddPlannedExpenseForm } from "@/components/budget/AddPlannedExpenseForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFinance } from "@/context/FinanceContext";
import { RecurringExpensesMonitoring } from "@/components/budget/RecurringExpensesMonitoring";

interface YearlyBudgetData {
    categories: any[];
    budgetData: Record<number, Record<number, { baseline: number; planned: number; recurring: number; total: number }>>;
    plannedExpenses: PlannedExpense[];
    recurringExpenses: RecurringExpense[];
}

export default function Budget() {
    const [location, setLocation] = useLocation();
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [viewHalf, setViewHalf] = useState<'first' | 'second'>('first');
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { accounts, categories } = useFinance();

    // Dialog states
    const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
    const [isAddPlannedOpen, setIsAddPlannedOpen] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
    const [editingPlanned, setEditingPlanned] = useState<PlannedExpense | null>(null);

    // Default redirect if just /budget
    if (location === "/budget") {
        setLocation("/budget/overview");
        return null;
    }

    const { data, isLoading } = useQuery<YearlyBudgetData>({
        queryKey: ['budget', currentYear],
        queryFn: async () => {
            const res = await fetch(`/api/budget/${currentYear}`);
            if (!res.ok) throw new Error('Failed to fetch budget');
            return res.json();
        }
    });

    const monthRange: [number, number] = viewHalf === 'first' ? [0, 6] : [6, 12];

    // Mutations
    const updateBaselineMutation = useMutation({
        mutationFn: async ({ categoryId, month, amount }: { categoryId: number, month: number, amount: number }) => {
            const res = await fetch('/api/budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    categoryId,
                    year: currentYear,
                    month,
                    amount: amount.toString()
                })
            });
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Failed to update baseline');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', currentYear] });
            toast({ title: "Budget updated", description: "Baseline budget saved." });
        }
    });

    const deleteRecurringMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/budget/recurring/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete recurring expense');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget'] });
            toast({ title: "Recurring expense deleted" });
        }
    });

    const deletePlannedMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/budget/planned/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete planned expense');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['budget', currentYear] });
            toast({ title: "Planned expense deleted" });
        }
    });

    // Handlers
    const handleUpdateBaseline = async (categoryId: number, month: number, amount: number) => {
        await updateBaselineMutation.mutateAsync({ categoryId, month, amount });
    };

    const handleAddRecurring = () => {
        setEditingRecurring(null);
        setIsAddRecurringOpen(true);
    };

    const handleEditRecurring = (expense: RecurringExpense) => {
        setEditingRecurring(expense);
        setIsAddRecurringOpen(true);
    };

    const handleAddPlanned = () => {
        setEditingPlanned(null);
        setIsAddPlannedOpen(true);
    };

    const handleEditPlanned = (expense: PlannedExpense) => {
        setEditingPlanned(expense);
        setIsAddPlannedOpen(true);
    };

    if (isLoading || !data) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex flex-col gap-8 pb-4 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-heading font-bold text-foreground">Budget Management</h1>
                        <p className="text-muted-foreground">Plan annual expenses by category</p>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Semester Toggle */}
                        <div className="flex items-center bg-card p-1 rounded-lg border shadow-sm">
                            <Button
                                variant={viewHalf === 'first' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="text-xs"
                                onClick={() => setViewHalf('first')}
                            >
                                Jan - Jun
                            </Button>
                            <Button
                                variant={viewHalf === 'second' ? 'secondary' : 'ghost'}
                                size="sm"
                                className="text-xs"
                                onClick={() => setViewHalf('second')}
                            >
                                Jul - Dec
                            </Button>
                        </div>
                        <div className="flex items-center gap-4 bg-card p-2 rounded-lg border shadow-sm">
                            <Button variant="ghost" size="icon" onClick={() => setCurrentYear(currentYear - 1)}>
                                <ChevronLeft size={20} />
                            </Button>
                            <span className="font-semibold text-lg min-w-[100px] text-center">
                                {currentYear}
                            </span>
                            <Button variant="ghost" size="icon" onClick={() => setCurrentYear(currentYear + 1)}>
                                <ChevronRight size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-auto pr-4 space-y-8">
                    {/* Overview */}
                    {location === "/budget/overview" && (
                        <section>
                            <SummaryTable
                                categories={data.categories}
                                budgetData={data.budgetData}
                                monthRange={monthRange}
                            />
                        </section>
                    )}

                    {/* Baseline */}
                    {location === "/budget/baseline" && (
                        <section>
                            <BaselineTable
                                categories={data.categories}
                                budgetData={data.budgetData}
                                onUpdateBaseline={handleUpdateBaseline}
                                monthRange={monthRange}
                            />
                        </section>
                    )}

                    {/* Recurring Expenses */}
                    {location === "/budget/recurring" && (
                        <div className="space-y-8">
                            <section>
                                <RecurringExpensesTable
                                    expenses={data.recurringExpenses}
                                    categories={data.categories}
                                    onAdd={handleAddRecurring}
                                    onEdit={handleEditRecurring}
                                    onDelete={(id) => deleteRecurringMutation.mutate(id)}
                                />
                            </section>

                            <section>
                                <RecurringExpensesMonitoring recurringExpenses={data.recurringExpenses} />
                            </section>
                        </div>
                    )}

                    {/* Planned Expenses */}
                    {location === "/budget/planned" && (
                        <section>
                            <PlannedExpensesTable
                                expenses={data.plannedExpenses}
                                categories={data.categories}
                                onAdd={handleAddPlanned}
                                onEdit={handleEditPlanned}
                                onDelete={(id) => deletePlannedMutation.mutate(id)}
                            />
                        </section>
                    )}
                </div>

                {/* Dialogs */}
                <Dialog open={isAddRecurringOpen} onOpenChange={setIsAddRecurringOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingRecurring ? "Edit Recurring Expense" : "New Recurring Expense"}
                            </DialogTitle>
                            <DialogDescription>
                                Enter details for the recurring expense you want to track.
                            </DialogDescription>
                        </DialogHeader>
                        <AddRecurringExpenseForm
                            onSuccess={() => {
                                setIsAddRecurringOpen(false);
                                queryClient.invalidateQueries({ queryKey: ['budget'] });
                            }}
                            categories={categories}
                            accounts={accounts} // Passed from context
                            initialData={editingRecurring || undefined}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={isAddPlannedOpen} onOpenChange={setIsAddPlannedOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingPlanned ? "Edit Planned Expense" : "New Planned Expense"}
                            </DialogTitle>
                            <DialogDescription>
                                Plan a one-time future expense for your annual budget.
                            </DialogDescription>
                        </DialogHeader>
                        <AddPlannedExpenseForm
                            onSuccess={() => {
                                setIsAddPlannedOpen(false);
                                queryClient.invalidateQueries({ queryKey: ['budget', currentYear] });
                            }}
                            categories={categories}
                            year={currentYear}
                            initialData={editingPlanned || undefined}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
