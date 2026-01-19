
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit2, Trash2, Plus, CalendarClock } from "lucide-react";
import { type Category, type PlannedExpense } from "@shared/schema";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface PlannedTransactionsTableProps {
    transactions: PlannedExpense[];
    categories: Category[];
    onAdd: () => void;
    onEdit: (expense: PlannedExpense) => void;
    onDelete: (id: number) => void;
    title: string;
    emptyMessage: string;
}

export function PlannedTransactionsTable({
    transactions,
    categories,
    onAdd,
    onEdit,
    onDelete,
    title,
    emptyMessage,
}: PlannedTransactionsTableProps) {

    const getCategoryName = (id: number) => {
        return categories.find(c => c.id === id)?.name || "Sconosciuta";
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{title}</CardTitle>
                <Button onClick={onAdd} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                </Button>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <CalendarClock className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>{emptyMessage}</p>
                    </div>
                ) : (
                    <div className="rounded-md border w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Amount</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((transaction) => (
                                    <TableRow key={transaction.id}>
                                        <TableCell className="capitalize">
                                            {format(new Date(transaction.date), "dd MMMM yyyy", { locale: it })}
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
            </CardContent>
        </Card>
    );
}
