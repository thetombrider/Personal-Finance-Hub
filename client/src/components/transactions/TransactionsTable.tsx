import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowUp, ArrowDown, ArrowUpDown, Edit2, Trash2, Landmark, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Transaction, Account, Category } from "@/context/FinanceContext";
import { SortField, SortDirection } from "@/hooks/use-transactions-data";
import { RecurringExpenseCheck } from "@shared/schema";
import { TagBadge } from "../common/TagBadge";

interface TransactionsTableProps {
    // Data
    paginatedTransactions: Transaction[];
    sortedTransactions: Transaction[];
    totalTransactions: number;

    // Dependencies
    accounts: Account[];
    categories: Category[];
    matchedTransactions: Map<number, RecurringExpenseCheck>;
    formatCurrency: (amount: number) => string;

    // Selection
    selectedIds: Set<number>;
    toggleSelection: (id: number) => void;
    toggleAll: () => void;
    toggleAllFiltered: () => void;
    allPageSelected: boolean;
    somePageSelected: boolean;
    allFilteredSelected: boolean;
    isFiltered: boolean;

    // Sorting
    sortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;

    // Pagination
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;

    // Actions
    onEdit: (transaction: Transaction) => void;
    onDelete: (id: number) => void;
}

export function TransactionsTable({
    paginatedTransactions,
    sortedTransactions,
    totalTransactions,
    accounts,
    categories,
    matchedTransactions,
    formatCurrency,
    selectedIds,
    toggleSelection,
    toggleAll,
    toggleAllFiltered,
    allPageSelected,
    somePageSelected,
    allFilteredSelected,
    isFiltered,
    sortField,
    sortDirection,
    onSort,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage,
    onEdit,
    onDelete
}: TransactionsTableProps) {

    const getAccountName = (id: number) => accounts.find(a => a.id === id)?.name || "Unknown";
    const getCategory = (id: number) => categories.find(c => c.id === id);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) {
            return <ArrowUpDown size={14} className="ml-1 text-muted-foreground" />;
        }
        return sortDirection === 'asc'
            ? <ArrowUp size={14} className="ml-1" />
            : <ArrowDown size={14} className="ml-1" />;
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden border rounded-lg bg-card">
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
                                    {sortedTransactions.length > 0 && (isFiltered || sortedTransactions.length > paginatedTransactions.length) && (
                                        <Button
                                            variant={allFilteredSelected ? "secondary" : "ghost"}
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={toggleAllFiltered}
                                            data-testid="button-select-all-filtered"
                                        >
                                            All ({sortedTransactions.length})
                                        </Button>
                                    )}
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                onClick={() => onSort('date')}
                                data-testid="header-date"
                            >
                                <div className="flex items-center">
                                    Date
                                    <SortIcon field="date" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                onClick={() => onSort('description')}
                                data-testid="header-description"
                            >
                                <div className="flex items-center">
                                    Description
                                    <SortIcon field="description" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                onClick={() => onSort('category')}
                                data-testid="header-category"
                            >
                                <div className="flex items-center">
                                    Category
                                    <SortIcon field="category" />
                                </div>
                            </TableHead>
                            <TableHead className="w-[150px]">
                                Tags
                            </TableHead>
                            <TableHead
                                className="cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                onClick={() => onSort('account')}
                                data-testid="header-account"
                            >
                                <div className="flex items-center">
                                    Account
                                    <SortIcon field="account" />
                                </div>
                            </TableHead>
                            <TableHead
                                className="text-right cursor-pointer hover:bg-muted/50 transition-colors select-none"
                                onClick={() => onSort('amount')}
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
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
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
                                                                <p>Transaction reconciled with bank</p>
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
                                                                <p>Reconciled with recurring expense</p>
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
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {transaction.tags && transaction.tags.map(tag => (
                                                    <TagBadge key={tag.id} tag={tag} />
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell data-testid={`text-account-${transaction.id}`}>{getAccountName(transaction.accountId)}</TableCell>
                                        <TableCell className={cn("text-right font-medium", transaction.type === 'income' ? 'text-emerald-600' : 'text-foreground')} data-testid={`text-amount-${transaction.id}`}>
                                            {transaction.type === 'income' ? '+' : ''}{formatCurrency(parseFloat(transaction.amount))}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(transaction)} data-testid={`button-edit-${transaction.id}`}>
                                                    <Edit2 size={14} />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(transaction.id)} data-testid={`button-delete-${transaction.id}`}>
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
                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedTransactions.length)} of {sortedTransactions.length} transactions
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
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
                                        onClick={() => onPageChange(pageNum)}
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
                            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            data-testid="button-next-page"
                        >
                            Next
                            <ChevronRight size={16} />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
