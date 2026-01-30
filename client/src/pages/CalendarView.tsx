import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isSameDay, isAfter, isBefore, startOfWeek, endOfWeek, isSameMonth, getDate } from "date-fns";
import { useFinance, Transaction } from "@/context/FinanceContext";
import { useBudgetData } from "@/hooks/queries";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { PlannedExpense, RecurringExpense } from "@shared/schema";
import { TransactionForm, TransactionFormValues, BulkTransactionFormValues } from "@/components/transactions/TransactionForm";
import { AddRecurringExpenseForm } from "@/components/budget/AddRecurringExpenseForm";
import { AddPlannedExpenseForm } from "@/components/budget/AddPlannedExpenseForm";
import { useQueryClient } from "@tanstack/react-query";

interface CalendarDayData {
    date: Date;
    transactions: Transaction[];
    planned: PlannedExpense[];
    recurring: RecurringExpense[];
    totalIncome: number;
    totalExpense: number;
    isCurrentMonth: boolean;
}

export default function CalendarView() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // Edit modal states
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditTransactionOpen, setIsEditTransactionOpen] = useState(false);
    const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null);
    const [isEditRecurringOpen, setIsEditRecurringOpen] = useState(false);
    const [editingPlanned, setEditingPlanned] = useState<PlannedExpense | null>(null);
    const [isEditPlannedOpen, setIsEditPlannedOpen] = useState(false);

    const { transactions, formatCurrency, categories, accounts, updateTransaction } = useFinance();
    const { data: budgetData } = useBudgetData(currentMonth.getFullYear());
    const queryClient = useQueryClient();

    // Edit handlers
    const handleEditTransaction = (t: Transaction) => {
        setEditingTransaction(t);
        setIsEditTransactionOpen(true);
    };

    const handleEditRecurring = (r: RecurringExpense) => {
        setEditingRecurring(r);
        setIsEditRecurringOpen(true);
    };

    const handleEditPlanned = (p: PlannedExpense) => {
        setEditingPlanned(p);
        setIsEditPlannedOpen(true);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onTransactionEditSubmit = async (data: TransactionFormValues | BulkTransactionFormValues) => {
        if (editingTransaction) {
            const txData = data as TransactionFormValues;
            const formattedData = {
                ...txData,
                amount: txData.amount.toString(),
                date: format(txData.date, "yyyy-MM-dd'T'HH:mm:ss"),
            };
            await updateTransaction(editingTransaction.id, formattedData);
            setIsEditTransactionOpen(false);
            setEditingTransaction(null);
        }
    };

    // Get category type for recurring/planned
    const getCategoryType = (categoryId: number) => {
        return categories.find(c => c.id === categoryId)?.type || 'expense';
    };

    const calendarData = useMemo(() => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return days.map(day => {
            const isCurrentMonth = isSameMonth(day, currentMonth);

            // Filter actual transactions
            const dayTransactions = transactions.filter(t => isSameDay(new Date(t.date), day));

            // Filter planned expenses (only for future dates or if not transaction exists? user request implies showing both or mixture)
            // Usually planned is relevant if no actual transaction matches it, but for simplicity we show all planned for that date.
            // We only show planned/recurring if the day is in the future relative to "today" OR if we want to see what WAS planned.
            // Let's show them always for reference, or maybe filter out if completed? 
            // User request: "also planned / recurring transactions for the future"
            // So we focus on future.

            const isFuture = isAfter(day, new Date()) || isSameDay(day, new Date());

            let dayPlanned: PlannedExpense[] = [];
            let dayRecurring: RecurringExpense[] = [];

            if (budgetData) {
                // Planned
                dayPlanned = budgetData.plannedExpenses.filter(p => isSameDay(new Date(p.date), day));

                // Recurring
                dayRecurring = budgetData.recurringExpenses.filter(r => {
                    const start = new Date(r.startDate);
                    const end = r.endDate ? new Date(r.endDate) : null;

                    // Check valid range
                    if (isBefore(day, start)) return false;
                    if (end && isAfter(day, end)) return false;

                    // Check day match
                    if (r.interval === 'monthly') {
                        return getDate(start) === getDate(day);
                    } else if (r.interval === 'yearly') {
                        return getDate(start) === getDate(day) && start.getMonth() === day.getMonth();
                    } else if (r.interval === 'weekly') {
                        // simple weekly check
                        const diffDays = Math.floor((day.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                        return diffDays % 7 === 0;
                    }
                    return false;
                });
            }

            // Calculate totals
            const txIncome = dayTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + Number(t.amount), 0);
            const txExpense = dayTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + Number(t.amount), 0);

            // Add planned/recurring to totals only if it's in the future? 
            // Or maybe show projected total? 
            // Let's separate actual vs projected totals or just mix them for "Daily Flow".
            // For visual clarity, let's just sum actuals for now in the main view, 
            // and maybe show indicators for planned.
            // Actually, if it's future, we should sum planned/recurring.

            let projectedIncome = 0;
            let projectedExpense = 0;

            if (isFuture) { // simplified logic: if today or future, include planned/recurring
                dayPlanned.forEach(p => {
                    const cat = categories.find(c => c.id === p.categoryId);
                    if (cat?.type === 'income') projectedIncome += Number(p.amount);
                    else projectedExpense += Number(p.amount);
                });
                dayRecurring.forEach(r => {
                    const cat = categories.find(c => c.id === r.categoryId);
                    if (cat?.type === 'income') projectedIncome += Number(r.amount);
                    else projectedExpense += Number(r.amount);
                });
            }

            return {
                date: day,
                transactions: dayTransactions,
                planned: dayPlanned,
                recurring: dayRecurring,
                totalIncome: txIncome + projectedIncome,
                totalExpense: txExpense + projectedExpense,
                isCurrentMonth
            };
        });
    }, [currentMonth, transactions, budgetData, categories]);

    const handleDayClick = (dayData: CalendarDayData) => {
        setSelectedDate(dayData.date);
        setIsSheetOpen(true);
    };

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const selectedDayData = selectedDate ? calendarData.find(d => isSameDay(d.date, selectedDate)) : null;

    return (
        <Layout>
            <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)] gap-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-heading font-bold text-foreground">Calendar</h1>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={goToToday}>Today</Button>
                        <div className="flex items-center gap-2 border rounded-md p-1">
                            <Button variant="ghost" size="icon" onClick={prevMonth}>
                                <ChevronLeft size={20} />
                            </Button>
                            <span className="min-w-[150px] text-center font-medium">
                                {format(currentMonth, "MMMM yyyy")}
                            </span>
                            <Button variant="ghost" size="icon" onClick={nextMonth}>
                                <ChevronRight size={20} />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Calendar Grid */}
                <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card shadow-sm">
                    {/* Weekdays Header */}
                    <div className="grid grid-cols-7 border-b bg-muted/50">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                        {calendarData.map((day, idx) => (
                            <div
                                key={idx}
                                onClick={() => handleDayClick(day)}
                                className={cn(
                                    "min-h-[100px] border-b border-r p-2 transition-colors hover:bg-accent/50 cursor-pointer relative flex flex-col gap-1",
                                    !day.isCurrentMonth && "bg-muted/10 text-muted-foreground",
                                    idx % 7 === 6 && "border-r-0", // Remove right border for last column
                                    isSameDay(day.date, new Date()) && "bg-primary/5 ring-1 ring-primary ring-inset"
                                )}
                            >
                                <div className="flex justify-between items-start">
                                    <span className={cn(
                                        "text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full",
                                        isSameDay(day.date, new Date()) && "bg-primary text-primary-foreground"
                                    )}>
                                        {getDate(day.date)}
                                    </span>
                                    {(day.totalIncome > 0 || day.totalExpense > 0) && (
                                        <div className="text-[10px] font-medium flex flex-col items-end">
                                            {day.totalIncome > 0 && <span className="text-emerald-500">+{Math.round(day.totalIncome)}</span>}
                                            {day.totalExpense > 0 && <span className="text-red-500">-{Math.round(day.totalExpense)}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Items Preview */}
                                <div className="flex-1 flex flex-col gap-1 mt-1 overflow-hidden">
                                    {day.transactions.slice(0, 3).map(t => (
                                        <div key={t.id} className="text-[10px] bg-background border rounded px-1 py-0.5 truncate text-muted-foreground">
                                            {t.description}
                                        </div>
                                    ))}
                                    {/* Show planned/recurring if space permits or if no actual transactions */}
                                    {day.transactions.length < 3 && day.recurring.slice(0, 3 - day.transactions.length).map((r, i) => (
                                        <div key={`r-${i}`} className="text-[10px] bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded px-1 py-0.5 truncate flex items-center gap-1">
                                            <span className="text-[8px]">↻</span> {r.name}
                                        </div>
                                    ))}
                                    {day.transactions.length + day.recurring.length < 3 && day.planned.slice(0, 3 - (day.transactions.length + day.recurring.length)).map((p, i) => (
                                        <div key={`p-${i}`} className="text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900 rounded px-1 py-0.5 truncate flex items-center gap-1">
                                            <span className="text-[8px]">★</span> {p.name || 'Planned'}
                                        </div>
                                    ))}

                                    {(day.transactions.length + day.recurring.length + day.planned.length) > 3 && (
                                        <div className="text-[10px] text-muted-foreground pl-1">
                                            +{(day.transactions.length + day.recurring.length + day.planned.length) - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Details Sheet */}
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetContent className="w-[400px] sm:w-[540px]">
                        <SheetHeader>
                            <SheetTitle>
                                {selectedDate && format(selectedDate, "EEEE, MMMM do, yyyy")}
                            </SheetTitle>
                            <SheetDescription>
                                Daily financial activity and projected items.
                            </SheetDescription>
                        </SheetHeader>

                        <ScrollArea className="h-[calc(100vh-8rem)] mt-6 pr-4">
                            {selectedDayData && (
                                <div className="space-y-6">
                                    {/* Summary Cards */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900">
                                            <div className="text-sm text-muted-foreground">Income</div>
                                            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(selectedDayData.totalIncome)}
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                                            <div className="text-sm text-muted-foreground">Expenses</div>
                                            <div className="text-xl font-bold text-red-600 dark:text-red-400">
                                                {formatCurrency(selectedDayData.totalExpense)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actual Transactions */}
                                    {selectedDayData.transactions.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                                                Actual Transactions
                                                <span className="text-xs font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                                    {selectedDayData.transactions.length}
                                                </span>
                                            </h3>
                                            <div className="space-y-2">
                                                {selectedDayData.transactions.map(t => {
                                                    const category = categories.find(c => c.id === t.categoryId);
                                                    const account = accounts.find(a => a.id === t.accountId);
                                                    return (
                                                        <div key={t.id} onClick={() => handleEditTransaction(t)} className="p-3 rounded-lg border bg-card/50 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium text-sm">{t.description}</span>
                                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                    {category && (
                                                                        <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                                                                            {category.name}
                                                                        </span>
                                                                    )}
                                                                    <span>•</span>
                                                                    <span>{account?.name || 'Unknown Account'}</span>
                                                                </div>
                                                            </div>
                                                            <span className={cn(
                                                                "font-medium tabular-nums",
                                                                t.type === 'income' ? "text-emerald-600" : "text-red-600"
                                                            )}>
                                                                {t.type === 'income' ? '+' : '-'}{formatCurrency(Number(t.amount))}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recurring Items */}
                                    {selectedDayData.recurring.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3 text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                                                Recurring Items
                                                <span className="text-xs font-normal bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">
                                                    {selectedDayData.recurring.length}
                                                </span>
                                            </h3>
                                            <div className="space-y-2">
                                                {selectedDayData.recurring.map(r => {
                                                    const category = categories.find(c => c.id === r.categoryId);
                                                    return (
                                                        <div key={r.id} onClick={() => handleEditRecurring(r)} className="p-3 rounded-lg border border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 flex items-center justify-between cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium text-sm">{r.name}</span>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Via {r.interval} schedule
                                                                </div>
                                                            </div>
                                                            <span className={cn(
                                                                "font-medium tabular-nums",
                                                                category?.type === 'income' ? "text-emerald-600" : "text-red-600"
                                                            )}>
                                                                {category?.type === 'income' ? '+' : '-'}{formatCurrency(Number(r.amount))}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Planned Items */}
                                    {selectedDayData.planned.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold mb-3 text-amber-600 dark:text-amber-400 flex items-center gap-2">
                                                Planned Items
                                                <span className="text-xs font-normal bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">
                                                    {selectedDayData.planned.length}
                                                </span>
                                            </h3>
                                            <div className="space-y-2">
                                                {selectedDayData.planned.map(p => {
                                                    const category = categories.find(c => c.id === p.categoryId);
                                                    return (
                                                        <div key={p.id} onClick={() => handleEditPlanned(p)} className="p-3 rounded-lg border border-amber-100 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20 flex items-center justify-between cursor-pointer hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-medium text-sm">{p.name || category?.name || 'Planned'}</span>
                                                                <div className="text-xs text-muted-foreground">
                                                                    One-time planned
                                                                </div>
                                                            </div>
                                                            <span className={cn(
                                                                "font-medium tabular-nums",
                                                                category?.type === 'income' ? "text-emerald-600" : "text-red-600"
                                                            )}>
                                                                {category?.type === 'income' ? '+' : '-'}{formatCurrency(Number(p.amount))}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {selectedDayData.transactions.length === 0 && selectedDayData.recurring.length === 0 && selectedDayData.planned.length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground">
                                            No activity for this date.
                                        </div>
                                    )}
                                </div>
                            )}
                        </ScrollArea>
                    </SheetContent>
                </Sheet>

                {/* Transaction Edit Modal */}
                <TransactionForm
                    isOpen={isEditTransactionOpen}
                    onOpenChange={setIsEditTransactionOpen}
                    onSubmit={onTransactionEditSubmit}
                    initialData={editingTransaction ? {
                        amount: parseFloat(editingTransaction.amount),
                        description: editingTransaction.description,
                        accountId: editingTransaction.accountId,
                        categoryId: editingTransaction.categoryId,
                        date: new Date(editingTransaction.date),
                        type: editingTransaction.type as "income" | "expense",
                        tagIds: editingTransaction.tags?.map(t => t.id) || [],
                    } : null}
                    accounts={accounts}
                    categories={categories}
                    mode="edit"
                />

                {/* Recurring Edit Modal */}
                <Dialog open={isEditRecurringOpen} onOpenChange={setIsEditRecurringOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Recurring Transaction</DialogTitle>
                            <DialogDescription>
                                Update the recurring transaction details.
                            </DialogDescription>
                        </DialogHeader>
                        <AddRecurringExpenseForm
                            onSuccess={() => {
                                setIsEditRecurringOpen(false);
                                setEditingRecurring(null);
                                queryClient.invalidateQueries({ queryKey: ['budget'] });
                            }}
                            categories={categories}
                            accounts={accounts}
                            initialData={editingRecurring || undefined}
                            type={editingRecurring ? getCategoryType(editingRecurring.categoryId) as 'income' | 'expense' : 'expense'}
                        />
                    </DialogContent>
                </Dialog>

                {/* Planned Edit Modal */}
                <Dialog open={isEditPlannedOpen} onOpenChange={setIsEditPlannedOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Planned Transaction</DialogTitle>
                            <DialogDescription>
                                Update the planned transaction details.
                            </DialogDescription>
                        </DialogHeader>
                        <AddPlannedExpenseForm
                            onSuccess={() => {
                                setIsEditPlannedOpen(false);
                                setEditingPlanned(null);
                                queryClient.invalidateQueries({ queryKey: ['budget', currentMonth.getFullYear()] });
                            }}
                            categories={categories}
                            year={currentMonth.getFullYear()}
                            initialData={editingPlanned || undefined}
                            type={editingPlanned ? getCategoryType(editingPlanned.categoryId) as 'income' | 'expense' : 'expense'}
                        />
                    </DialogContent>
                </Dialog>
            </div>
        </Layout>
    );
}
