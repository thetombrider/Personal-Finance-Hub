
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Plus, CalendarClock, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { type Category, type PlannedExpense } from "@shared/schema";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { useState } from "react";

interface PlannedTransactionsTableProps {
    transactions: PlannedExpense[];
    categories: Category[];
    onAdd: () => void;
    onEdit: (expense: PlannedExpense) => void;
    onDelete: (id: number) => void;
    title: string;
    emptyMessage: string;
}

type SortKey = keyof PlannedExpense | 'category';

export function PlannedTransactionsTable({
    transactions,
    categories,
    onAdd,
    onEdit,
    onDelete,
    title,
    emptyMessage,
}: PlannedTransactionsTableProps) {
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: SortKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTransactions = [...transactions].sort((a, b) => {
        if (!sortConfig) return 0;

        const { key, direction } = sortConfig;

        if (key === 'category') {
            const catA = getCategoryName(a.categoryId).toLowerCase();
            const catB = getCategoryName(b.categoryId).toLowerCase();
            if (catA < catB) return direction === 'asc' ? -1 : 1;
            if (catA > catB) return direction === 'asc' ? 1 : -1;
            return 0;
        }

        const valA = a[key as keyof PlannedExpense];
        const valB = b[key as keyof PlannedExpense];

        if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        }

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    const SortIcon = ({ column }: { column: SortKey }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return sortConfig.direction === 'asc'
            ? <ArrowUp className="ml-2 h-4 w-4" />
            : <ArrowDown className="ml-2 h-4 w-4" />;
    };

    const getCategoryName = (id: number) => {
        return categories.find(c => c.id === id)?.name || "Unknown";
    };

    const getCategoryColor = (id: number) => {
        return categories.find(c => c.id === id)?.color || "#9ca3af";
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{title}</h2>
                <Button onClick={onAdd} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                </Button>
            </div>
            {transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                    <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>{emptyMessage}</p>
                </div>
            ) : (
                <div className="rounded-md border w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead onClick={() => handleSort('date')} className="cursor-pointer hover:bg-muted/50">
                                    <div className="flex items-center">
                                        Date
                                        <SortIcon column="date" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('name')} className="cursor-pointer hover:bg-muted/50">
                                    <div className="flex items-center">
                                        Name
                                        <SortIcon column="name" />
                                    </div>
                                </TableHead>
                                <TableHead onClick={() => handleSort('category')} className="cursor-pointer hover:bg-muted/50">
                                    <div className="flex items-center">
                                        Category
                                        <SortIcon column="category" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right cursor-pointer hover:bg-muted/50" onClick={() => handleSort('amount')}>
                                    <div className="flex items-center justify-end">
                                        Amount
                                        <SortIcon column="amount" />
                                    </div>
                                </TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedTransactions.map((transaction) => (
                                <TableRow key={transaction.id}>
                                    <TableCell className="capitalize">
                                        {format(new Date(transaction.date), "dd MMMM yyyy", { locale: enUS })}
                                    </TableCell>
                                    <TableCell className="font-medium">{transaction.name}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="secondary"
                                            style={{
                                                backgroundColor: `${getCategoryColor(transaction.categoryId)}20`,
                                                color: getCategoryColor(transaction.categoryId)
                                            }}
                                        >
                                            {getCategoryName(transaction.categoryId)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-bold">
                                        {formatCurrency(parseFloat(transaction.amount.toString()))}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => onEdit(transaction)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-destructive hover:text-destructive"
                                                onClick={() => onDelete(transaction.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
