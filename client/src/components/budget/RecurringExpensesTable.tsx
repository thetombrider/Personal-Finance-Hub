
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
import { Edit2, Trash2, Plus, RefreshCw } from "lucide-react";
import { type Category, type RecurringExpense } from "@shared/schema";
import { format } from "date-fns";

interface RecurringExpensesTableProps {
    expenses: RecurringExpense[];
    categories: Category[];
    onAdd: () => void;
    onEdit: (expense: RecurringExpense) => void;
    onDelete: (id: number) => void;
}

export function RecurringExpensesTable({
    expenses,
    categories,
    onAdd,
    onEdit,
    onDelete,
}: RecurringExpensesTableProps) {

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
                <CardTitle className="text-lg">Spese Ricorrenti</CardTitle>
                <Button onClick={onAdd} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Aggiungi
                </Button>
            </CardHeader>
            <CardContent>
                {expenses.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <RefreshCw className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p>Nessuna spesa ricorrente impostata.</p>
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Categoria</TableHead>
                                    <TableHead className="text-right">Importo</TableHead>
                                    <TableHead>Frequenza</TableHead>
                                    <TableHead>Inizio</TableHead>
                                    <TableHead>Stato</TableHead>
                                    <TableHead className="text-right">Azioni</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {expenses.map((expense) => (
                                    <TableRow key={expense.id}>
                                        <TableCell className="font-medium">{expense.name}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="secondary"
                                                style={{
                                                    backgroundColor: `${getCategoryColor(expense.categoryId)}20`,
                                                    color: getCategoryColor(expense.categoryId)
                                                }}
                                            >
                                                {getCategoryName(expense.categoryId)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold">
                                            {formatCurrency(parseFloat(expense.amount.toString()))}
                                        </TableCell>
                                        <TableCell className="capitalize">{expense.interval === 'monthly' ? 'Mensile' : expense.interval}</TableCell>
                                        <TableCell>{format(new Date(expense.startDate), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>
                                            <Badge variant={expense.active ? "default" : "outline"}>
                                                {expense.active ? "Attivo" : "Inattivo"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8"
                                                    onClick={() => onEdit(expense)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                    onClick={() => onDelete(expense.id)}
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
