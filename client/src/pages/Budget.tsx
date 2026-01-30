
import Layout from "@/components/Layout";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBudgetData } from "@/hooks/queries";
import { useBudgetMutations } from "@/hooks/mutations";

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
import { RecurringTransactionsTable } from "@/components/budget/RecurringTransactionsTable";
import { PlannedTransactionsTable } from "@/components/budget/PlannedTransactionsTable";
import { AddRecurringExpenseForm } from "@/components/budget/AddRecurringExpenseForm";
import { AddPlannedExpenseForm } from "@/components/budget/AddPlannedExpenseForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useFinance } from "@/context/FinanceContext";
import { RecurringTransactionsMonitoring } from "@/components/budget/RecurringTransactionsMonitoring";
import { BudgetDrilldown } from "@/components/budget/BudgetDrilldown";
import { format } from "date-fns";
import type { Category } from "@shared/schema";

interface YearlyBudgetData {
    categories: Category[];
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

    // Track which type we are adding (income or expense)
    const [addRecurringType, setAddRecurringType] = useState<'income' | 'expense'>('expense');
    const [addPlannedType, setAddPlannedType] = useState<'income' | 'expense'>('expense');

    // Drilldown state
    const [drilldownConfig, setDrilldownConfig] = useState<{
        open: boolean;
        title: string;
        data: {
            baseline: number;
            planned: PlannedExpense[];
            recurring: RecurringExpense[];
            total: number;
        };
    }>({
        open: false,
        title: "",
        data: { baseline: 0, planned: [], recurring: [], total: 0 }
    });

    // Default redirect if just /budget


    const { data, isLoading, error } = useBudgetData(currentYear);

    const monthRange: [number, number] = viewHalf === 'first' ? [0, 6] : [6, 12];

    // Mutations
    const { updateBudgetCell, deleteRecurringExpense, deletePlannedExpense } = useBudgetMutations();

    useEffect(() => {
        if (location === "/budget") {
            setLocation("/budget/overview");
        }
    }, [location, setLocation]);

    if (location === "/budget") {
        return null;
    }

    // Handlers
    const handleUpdateBaseline = async (categoryId: number, month: number, amount: number) => {
        await updateBudgetCell.mutateAsync({ categoryId, month, year: currentYear, planned: amount });

    };


    const handleAddRecurring = (type: 'income' | 'expense') => {
        setEditingRecurring(null);
        setAddRecurringType(type);
        setIsAddRecurringOpen(true);
    };

    const handleEditRecurring = (expense: RecurringExpense) => {
        const cat = categories.find(c => c.id === expense.categoryId);
        setAddRecurringType(cat?.type === 'income' ? 'income' : 'expense');
        setEditingRecurring(expense);
        setIsAddRecurringOpen(true);
    };

    const handleAddPlanned = (type: 'income' | 'expense') => {
        setEditingPlanned(null);
        setAddPlannedType(type);
        setIsAddPlannedOpen(true);
    };

    const handleEditPlanned = (expense: PlannedExpense) => {
        const cat = categories.find(c => c.id === expense.categoryId);
        setAddPlannedType(cat?.type === 'income' ? 'income' : 'expense');
        setEditingPlanned(expense);
        setIsAddPlannedOpen(true);
    };

    const getCategoryType = (categoryId: number) => {
        return categories.find(c => c.id === categoryId)?.type || 'expense';
    };

    const handleBudgetDrilldown = (categoryId: number, monthIndex: number) => {
        // monthIndex is 0-11
        if (!data) return;

        const category = categories.find(c => c.id === categoryId);
        if (!category) return;

        const monthDataIndex = monthIndex + 1; // 1-12 based
        const cellData = data.budgetData[categoryId]?.[monthDataIndex];

        if (!cellData) return;

        // Filter planned expenses for this specific month
        const planned = data.plannedExpenses.filter(e => {
            const d = new Date(e.date);
            return e.categoryId === categoryId && d.getMonth() === monthIndex && d.getFullYear() === currentYear;
        });

        // Filter recurring expenses active in this month
        // We need check checks logic?
        // Actually, the server likely aggregates this. 
        // But for drilldown, we just want to show *which* recurring expenses contribute.
        // The server response `recurring` key in `budgetData` is the sum.
        // We'll filter the recurring list by category.
        // Note: Actual recurring attribution is complex due to start/end dates.
        // For simplicity, we show recurring expenses of this category that are active in this month.

        const monthStart = new Date(currentYear, monthIndex, 1);
        const monthEnd = new Date(currentYear, monthIndex + 1, 0);

        const recurring = data.recurringExpenses.filter(e => {
            if (e.categoryId !== categoryId) return false;
            // Check if active
            const start = new Date(e.startDate);
            const end = e.endDate ? new Date(e.endDate) : null;

            // Simple check: active if start <= monthEnd AND (!end || end >= monthStart)
            // And also check interval? For now assume monthly items or items that hit this month.
            // If interval is yearly, we'd need to check the specific month. 
            // BUT, the budget calculation on server does this precise logic.
            // Replicating it 100% here might be tricky without shared logic.
            // However, most relevant is to show the user WHAT recurring expenses exist.
            // 

            if (start > monthEnd) return false;
            if (end && end < monthStart) return false;

            // If yearly, only show if it matches the month
            if (e.interval === 'yearly') {
                // e.startDate determines the month
                // if e.g. 15th Jan, it repeats every Jan.
                if (start.getMonth() !== monthIndex) return false;
            }

            return true;
        });

        const monthName = format(new Date(currentYear, monthIndex, 1), "MMMM");

        setDrilldownConfig({
            open: true,
            title: `${category.name} - ${monthName} ${currentYear}`,
            data: {
                baseline: cellData.baseline,
                planned: planned,
                recurring: recurring,
                total: cellData.total
            }
        });
    };

    if (error) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center h-96 gap-4">
                    <div className="text-destructive font-semibold text-lg">Failed to load budget data</div>
                    <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
                </div>
            </Layout>
        );
    }

    if (isLoading || !data) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
            </Layout>
        );
    }

    // Split data by type
    const plannedIncome = data.plannedExpenses.filter(e => getCategoryType(e.categoryId) === 'income');
    const plannedExpenses = data.plannedExpenses.filter(e => getCategoryType(e.categoryId) === 'expense');

    const recurringIncome = data.recurringExpenses.filter(e => getCategoryType(e.categoryId) === 'income');
    const recurringExpenses = data.recurringExpenses.filter(e => getCategoryType(e.categoryId) === 'expense');

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
                                onDrilldown={handleBudgetDrilldown}
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

                    {/* Recurring Transactions */}
                    {location === "/budget/recurring" && (
                        <div className="space-y-8">
                            <section className="space-y-6">
                                <RecurringTransactionsTable
                                    title="Recurring Income"
                                    emptyMessage="No recurring income set."
                                    transactions={recurringIncome}
                                    categories={data.categories}
                                    onAdd={() => handleAddRecurring('income')}
                                    onEdit={handleEditRecurring}
                                    onDelete={(id) => deleteRecurringExpense.mutate(id)}
                                />
                                <RecurringTransactionsTable
                                    title="Recurring Expenses"
                                    emptyMessage="No recurring expenses set."
                                    transactions={recurringExpenses}
                                    categories={data.categories}
                                    onAdd={() => handleAddRecurring('expense')}
                                    onEdit={handleEditRecurring}
                                    onDelete={(id) => deleteRecurringExpense.mutate(id)}
                                />
                            </section>

                            <section className="space-y-6">
                                <RecurringTransactionsMonitoring
                                    title="Income Monitoring"
                                    description="Verify income history for the last 12 months"
                                    transactions={recurringIncome}
                                />
                                <RecurringTransactionsMonitoring
                                    title="Expenses Monitoring"
                                    description="Verify payment history for the last 12 months"
                                    transactions={recurringExpenses}
                                />
                            </section>
                        </div>
                    )}

                    {/* Planned Transactions */}
                    {location === "/budget/planned" && (
                        <section className="space-y-6">
                            <PlannedTransactionsTable
                                title="Planned Income"
                                emptyMessage="No extra planned income."
                                transactions={plannedIncome}
                                categories={data.categories}
                                onAdd={() => handleAddPlanned('income')}
                                onEdit={handleEditPlanned}
                                onDelete={(id) => deletePlannedExpense.mutate(id)}
                            />
                            <PlannedTransactionsTable
                                title="Planned Expenses"
                                emptyMessage="No extra planned expenses."
                                transactions={plannedExpenses}
                                categories={data.categories}
                                onAdd={() => handleAddPlanned('expense')}
                                onEdit={handleEditPlanned}
                                onDelete={(id) => deletePlannedExpense.mutate(id)}
                            />
                        </section>
                    )}
                </div>

                {/* Dialogs */}
                <Dialog open={isAddRecurringOpen} onOpenChange={setIsAddRecurringOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingRecurring ? "Edit Recurring Transaction" : `New Recurring ${addRecurringType === 'income' ? 'Income' : 'Expense'}`}
                            </DialogTitle>
                            <DialogDescription>
                                Enter details for the recurring transaction you want to track.
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
                            type={addRecurringType}
                        />
                    </DialogContent>
                </Dialog>

                <Dialog open={isAddPlannedOpen} onOpenChange={setIsAddPlannedOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingPlanned ? "Edit Planned Transaction" : `New Planned ${addPlannedType === 'income' ? 'Income' : 'Expense'}`}
                            </DialogTitle>
                            <DialogDescription>
                                Plan a one-time future transaction for your annual budget.
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
                            type={addPlannedType}
                        />
                    </DialogContent>
                </Dialog>

                {/* Drilldown Modal */}
                <BudgetDrilldown
                    isOpen={drilldownConfig.open}
                    onClose={() => setDrilldownConfig(prev => ({ ...prev, open: false }))}
                    title={drilldownConfig.title}
                    data={drilldownConfig.data}
                />
            </div>
        </Layout>
    );
}
