
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
import { Edit2, Trash2, Plus, RefreshCw } from "lucide-react";
import { type Category, type RecurringExpense } from "@shared/schema";
import { format } from "date-fns";

interface RecurringTransactionsTableProps {
    transactions: RecurringExpense[];
    categories: Category[];
    onAdd: () => void;
    onEdit: (expense: RecurringExpense) => void;
    onDelete: (id: number) => void;
    title: string;
    emptyMessage: string;
}

export function RecurringTransactionsTable({
    transactions,
    categories,
    onAdd,
    onEdit,
    onDelete,
    title,
    emptyMessage,
}: RecurringTransactionsTableProps) {

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
                    <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p>{emptyMessage}</p>
                </div>
            ) : (
                <div className="rounded-md border w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead className="text-right">Amount</TableHead>
                                <TableHead>Frequency</TableHead>
                                <TableHead>Start Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.map((transaction) => (
                                <TableRow key={transaction.id}>
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
                                        {transaction.isVariableAmount && (
                                            <Badge variant="outline" className="ml-2 text-xs">~</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                        {transaction.interval === 'monthly' ? 'Monthly' :
                                            transaction.interval === 'weekly' ? 'Weekly' :
                                                transaction.interval === 'quarterly' ? 'Quarterly' :
                                                    transaction.interval === 'yearly' ? 'Yearly' : transaction.interval}
                                    </TableCell>
                                    <TableCell>{format(new Date(transaction.startDate), "dd/MM/yyyy")}</TableCell>
                                    <TableCell>
                                        <Badge variant={transaction.active ? "default" : "outline"}>
                                            {transaction.active ? "Active" : "Inactive"}
                                        </Badge>
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
