import { useFinance, Transaction } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, Calendar as CalendarIcon, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, Search, X, Download, ArrowLeftRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Landmark, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { RecurringExpenseCheck } from "@shared/schema";

const transactionSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  description: z.string().min(2, "Description is required"),
  accountId: z.coerce.number().min(1, "Account is required"),
  categoryId: z.coerce.number().min(1, "Category is required"),
  date: z.date(),
  type: z.enum(["income", "expense"]),
});

const transferSchema = z.object({
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  description: z.string().min(2, "Description is required"),
  fromAccountId: z.coerce.number().min(1, "Source account is required"),
  toAccountId: z.coerce.number().min(1, "Destination account is required"),
  date: z.date(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "Source and destination must be different",
  path: ["toAccountId"],
});

type TransactionFormValues = z.infer<typeof transactionSchema>;
type TransferFormValues = z.infer<typeof transferSchema>;

type SortField = 'date' | 'description' | 'category' | 'account' | 'amount';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;

export default function Transactions() {
  const { transactions, accounts, categories, addTransaction, addTransfer, updateTransaction, deleteTransaction, deleteTransactions, formatCurrency, isLoading } = useFinance();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: checks } = useQuery<RecurringExpenseCheck[]>({
    queryKey: ['reconciliation', 'all'],
    queryFn: async () => {
      const res = await fetch('/api/reconciliation/checks');
      if (!res.ok) throw new Error('Failed to fetch checks');
      return res.json();
    }
  });

  const matchedTransactions = useMemo(() => {
    const map = new Map<number, RecurringExpenseCheck>();
    if (checks) {
      checks.forEach(check => {
        if (check.transactionId) {
          map.set(check.transactionId, check);
        }
      });
    }
    return map;
  }, [checks]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: 0,
      description: "",
      accountId: 0,
      categoryId: 0,
      date: new Date(),
      type: "expense",
    },
  });

  const transferForm = useForm<TransferFormValues>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      amount: 0,
      description: "",
      fromAccountId: 0,
      toAccountId: 0,
      date: new Date(),
    },
  });

  const transferCategory = categories.find(c => c.name.toLowerCase() === "trasferimenti" || c.name.toLowerCase() === "transfer");

  const getAccountName = (id: number) => accounts.find(a => a.id === id)?.name || "Unknown";
  const getCategory = (id: number) => categories.find(c => c.id === id);
  const getCategoryName = (id: number) => getCategory(id)?.name || "Unknown";

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Search filter
      if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Account filter
      if (filterAccountId !== 'all' && t.accountId !== parseInt(filterAccountId)) {
        return false;
      }

      // Category filter
      if (filterCategoryId !== 'all' && t.categoryId !== parseInt(filterCategoryId)) {
        return false;
      }

      // Date range filter
      const transactionDate = new Date(t.date);
      if (dateFrom && transactionDate < dateFrom) {
        return false;
      }
      if (dateTo) {
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (transactionDate > endOfDay) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, searchQuery, filterAccountId, filterCategoryId, dateFrom, dateTo]);

  const sortedTransactions = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
          break;
        case 'description':
          comparison = a.description.localeCompare(b.description);
          break;
        case 'category':
          comparison = getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId));
          break;
        case 'account':
          comparison = getAccountName(a.accountId).localeCompare(getAccountName(b.accountId));
          break;
        case 'amount':
          const amountA = a.type === 'income' ? parseFloat(a.amount) : -parseFloat(a.amount);
          const amountB = b.type === 'income' ? parseFloat(b.amount) : -parseFloat(b.amount);
          comparison = amountA - amountB;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredTransactions, sortField, sortDirection, accounts, categories]);

  const clearFilters = () => {
    setSearchQuery('');
    setFilterAccountId('all');
    setFilterCategoryId('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const hasActiveFilters = searchQuery || filterAccountId !== 'all' || filterCategoryId !== 'all' || dateFrom || dateTo;

  const totalPages = Math.ceil(sortedTransactions.length / ITEMS_PER_PAGE);

  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTransactions.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedTransactions, currentPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown size={14} className="ml-1 text-muted-foreground" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp size={14} className="ml-1" />
      : <ArrowDown size={14} className="ml-1" />;
  };

  const onSubmit = async (data: TransactionFormValues) => {
    const formattedData = {
      ...data,
      amount: data.amount.toString(),
      date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
    };

    if (editingId) {
      await updateTransaction(editingId, formattedData);
    } else {
      await addTransaction(formattedData);
    }
    setIsDialogOpen(false);
    setEditingId(null);
    form.reset();
  };

  const onTransferSubmit = async (data: TransferFormValues) => {
    if (!transferCategory) {
      alert("Categoria 'Trasferimenti' non trovata. Creala prima nelle impostazioni.");
      return;
    }

    await addTransfer({
      amount: data.amount.toString(),
      description: data.description,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      categoryId: transferCategory.id,
      date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
    });

    setIsTransferDialogOpen(false);
    transferForm.reset();
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    form.reset({
      amount: parseFloat(transaction.amount),
      description: transaction.description,
      accountId: transaction.accountId,
      categoryId: transaction.categoryId,
      date: new Date(transaction.date),
      type: transaction.type,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      await deleteTransaction(id);
    }
  };

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const allPageSelected = paginatedTransactions.length > 0 && paginatedTransactions.every(t => selectedIds.has(t.id));
  const somePageSelected = paginatedTransactions.some(t => selectedIds.has(t.id)) && !allPageSelected;

  const toggleAll = () => {
    if (allPageSelected) {
      const newSelected = new Set(selectedIds);
      paginatedTransactions.forEach(t => newSelected.delete(t.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      paginatedTransactions.forEach(t => newSelected.add(t.id));
      setSelectedIds(newSelected);
    }
  };

  const allFilteredSelected = sortedTransactions.length > 0 && sortedTransactions.every(t => selectedIds.has(t.id));

  const toggleAllFiltered = () => {
    if (allFilteredSelected) {
      const newSelected = new Set(selectedIds);
      sortedTransactions.forEach(t => newSelected.delete(t.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      sortedTransactions.forEach(t => newSelected.add(t.id));
      setSelectedIds(newSelected);
    }
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedIds.size} transactions?`)) {
      await deleteTransactions(Array.from(selectedIds));
      setSelectedIds(new Set());
    }
  };

  const handleDownload = () => {
    const transactionsToExport = selectedIds.size > 0
      ? transactions.filter(t => selectedIds.has(t.id))
      : sortedTransactions;

    if (transactionsToExport.length === 0) {
      return;
    }

    const escapeCSV = (value: string) => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    const headers = ['Date', 'Description', 'Account', 'Category', 'Type', 'Amount'];
    const rows = transactionsToExport.map(t => {
      const account = accounts.find(a => a.id === t.accountId);
      const category = categories.find(c => c.id === t.categoryId);
      const signedAmount = t.type === 'income' ? parseFloat(t.amount) : -parseFloat(t.amount);

      return [
        format(new Date(t.date), "yyyy-MM-dd"),
        escapeCSV(t.description),
        escapeCSV(account?.name || 'Unknown'),
        escapeCSV(category?.name || 'Unknown'),
        t.type,
        signedAmount.toFixed(2)
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-foreground">Transactions</h1>
            <p className="text-muted-foreground">Track every penny ({transactions.length} total)</p>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.size > 0 && (
              <Button variant="destructive" className="gap-2" onClick={handleBulkDelete} data-testid="button-bulk-delete">
                <Trash2 size={16} /> Delete ({selectedIds.size})
              </Button>
            )}

            <Button
              variant="outline"
              className="gap-2"
              onClick={handleDownload}
              disabled={selectedIds.size === 0 && sortedTransactions.length === 0}
              data-testid="button-download-transactions"
            >
              <Download size={16} /> Download ({selectedIds.size > 0 ? selectedIds.size : sortedTransactions.length})
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingId(null);
                form.reset({
                  amount: 0,
                  description: "",
                  accountId: 0,
                  categoryId: 0,
                  date: new Date(),
                  type: "expense",
                });
              }
            }}>
              <DialogTrigger asChild>
                <Button className="gap-2" data-testid="button-add-transaction">
                  <Plus size={16} /> Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Transaction" : "Add New Transaction"}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-type">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="expense">Expense</SelectItem>
                                <SelectItem value="income">Income</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.01" {...field} data-testid="input-amount" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Weekly Groceries" {...field} data-testid="input-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="accountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account</FormLabel>
                            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-account">
                                  <SelectValue placeholder="Select account" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {accounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-category">
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {categories.filter(c => c.type === form.watch("type")).map(cat => (
                                  <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-date-picker"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Pick a date</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" data-testid="button-submit-transaction">{editingId ? "Save Changes" : "Add Transaction"}</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Dialog open={isTransferDialogOpen} onOpenChange={(open) => {
              setIsTransferDialogOpen(open);
              if (!open) {
                transferForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2" data-testid="button-add-transfer">
                  <ArrowLeftRight size={16} /> Trasferimento
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nuovo Trasferimento</DialogTitle>
                </DialogHeader>
                <Form {...transferForm}>
                  <form onSubmit={transferForm.handleSubmit(onTransferSubmit)} className="space-y-4">
                    <FormField
                      control={transferForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Importo</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} data-testid="input-transfer-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={transferForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descrizione</FormLabel>
                          <FormControl>
                            <Input placeholder="es. Pagamento carta di credito" {...field} data-testid="input-transfer-description" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={transferForm.control}
                        name="fromAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Da conto</FormLabel>
                            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-from-account">
                                  <SelectValue placeholder="Seleziona conto" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {accounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transferForm.control}
                        name="toAccountId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>A conto</FormLabel>
                            <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value?.toString()}>
                              <FormControl>
                                <SelectTrigger data-testid="select-to-account">
                                  <SelectValue placeholder="Seleziona conto" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="max-h-[200px]">
                                {accounts.map(acc => (
                                  <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={transferForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Data</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant={"outline"}
                                  className={cn(
                                    "w-full pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                  )}
                                  data-testid="button-transfer-date-picker"
                                >
                                  {field.value ? (
                                    format(field.value, "PPP")
                                  ) : (
                                    <span>Seleziona data</span>
                                  )}
                                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date("1900-01-01")
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <DialogFooter>
                      <Button type="submit" data-testid="button-submit-transfer">Crea Trasferimento</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filter Bar */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search" className="text-sm font-medium mb-1.5 block">Cerca</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Cerca nella descrizione..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* Date From */}
            <div className="w-[160px]">
              <Label className="text-sm font-medium mb-1.5 block">Da</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                    data-testid="button-date-from"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Seleziona"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={(date) => { setDateFrom(date); setCurrentPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Date To */}
            <div className="w-[160px]">
              <Label className="text-sm font-medium mb-1.5 block">A</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                    data-testid="button-date-to"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Seleziona"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={(date) => { setDateTo(date); setCurrentPage(1); }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Account Filter */}
            <div className="w-[180px]">
              <Label className="text-sm font-medium mb-1.5 block">Conto</Label>
              <Select value={filterAccountId} onValueChange={(v) => { setFilterAccountId(v); setCurrentPage(1); }}>
                <SelectTrigger data-testid="select-filter-account">
                  <SelectValue placeholder="Tutti i conti" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">Tutti i conti</SelectItem>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="w-[180px]">
              <Label className="text-sm font-medium mb-1.5 block">Categoria</Label>
              <Select value={filterCategoryId} onValueChange={(v) => { setFilterCategoryId(v); setCurrentPage(1); }}>
                <SelectTrigger data-testid="select-filter-category">
                  <SelectValue placeholder="Tutte le categorie" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">Tutte le categorie</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1" data-testid="button-clear-filters">
                <X size={14} />
                Pulisci filtri
              </Button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="mt-3 text-sm text-muted-foreground">
              {filteredTransactions.length} transazioni trovate su {transactions.length} totali
            </div>
          )}
        </Card>

        <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto relative">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow>
                  <TableHead className="w-[120px]">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                        onCheckedChange={toggleAll}
                        aria-label="Select all on page"
                        data-testid="checkbox-select-all"
                      />
                      {sortedTransactions.length > 0 && (hasActiveFilters || sortedTransactions.length > paginatedTransactions.length) && (
                        <Button
                          variant={allFilteredSelected ? "secondary" : "ghost"}
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={toggleAllFiltered}
                          data-testid="button-select-all-filtered"
                        >
                          Tutte ({sortedTransactions.length})
                        </Button>
                      )}
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('date')}
                    data-testid="header-date"
                  >
                    <div className="flex items-center">
                      Date
                      <SortIcon field="date" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('description')}
                    data-testid="header-description"
                  >
                    <div className="flex items-center">
                      Description
                      <SortIcon field="description" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('category')}
                    data-testid="header-category"
                  >
                    <div className="flex items-center">
                      Category
                      <SortIcon field="category" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('account')}
                    data-testid="header-account"
                  >
                    <div className="flex items-center">
                      Account
                      <SortIcon field="account" />
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                    onClick={() => handleSort('amount')}
                    data-testid="header-amount"
                  >
                    <div className="flex items-center justify-end">
                      Amount
                      <SortIcon field="amount" />
                    </div>
                  </TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions yet. Add one to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedTransactions.map((transaction) => {
                    const category = getCategory(transaction.categoryId);
                    const isSelected = selectedIds.has(transaction.id);
                    return (
                      <TableRow key={transaction.id} className={cn("group", isSelected && "bg-muted/50")} data-testid={`row-transaction-${transaction.id}`}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(transaction.id)}
                            aria-label="Select row"
                            data-testid={`checkbox-transaction-${transaction.id}`}
                          />
                        </TableCell>
                        <TableCell data-testid={`text-date-${transaction.id}`}>{format(new Date(transaction.date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="font-medium" data-testid={`text-description-${transaction.id}`}>
                          <div className="flex items-center gap-2">
                            {transaction.description}
                            {transaction.externalId && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Landmark size={14} className="text-blue-500/70" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Transazione riconciliata con la banca</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            {matchedTransactions.has(transaction.id) && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <CheckCircle2 size={14} className="text-green-500/70" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Riconciliata con spesa ricorrente</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category?.color || '#ccc' }} />
                            {category?.name || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell data-testid={`text-account-${transaction.id}`}>{getAccountName(transaction.accountId)}</TableCell>
                        <TableCell className={cn("text-right font-medium", transaction.type === 'income' ? 'text-emerald-600' : 'text-foreground')} data-testid={`text-amount-${transaction.id}`}>
                          {transaction.type === 'income' ? '+' : ''}{formatCurrency(parseFloat(transaction.amount))}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(transaction)} data-testid={`button-edit-${transaction.id}`}>
                              <Edit2 size={14} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(transaction.id)} data-testid={`button-delete-${transaction.id}`}>
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, sortedTransactions.length)} of {sortedTransactions.length} transactions
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft size={16} />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => setCurrentPage(pageNum)}
                        data-testid={`button-page-${pageNum}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
