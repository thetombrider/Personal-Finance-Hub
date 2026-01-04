
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type Category } from "@shared/schema";

interface SummaryTableProps {
    categories: Category[];
    budgetData: Record<number, Record<number, { total: number }>>;
}

export function SummaryTable({ categories, budgetData }: SummaryTableProps) {
    const months = [
        "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
        "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ];

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const calculateMonthlyTotal = (monthIndex: number) => {
        return categories.reduce((sum, cat) => {
            const monthData = budgetData[cat.id]?.[monthIndex + 1];
            return sum + (monthData?.total || 0);
        }, 0);
    };

    const calculateCategoryTotal = (categoryId: number) => {
        let sum = 0;
        for (let m = 1; m <= 12; m++) {
            sum += budgetData[categoryId]?.[m]?.total || 0;
        }
        return sum;
    };

    const grandTotal = categories.reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0);

    return (
        <Card>
            <CardHeader>
                <CardTitle>Riepilogo Budget Annuale</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px] font-bold">Categoria</TableHead>
                                {months.map((month) => (
                                    <TableHead key={month} className="text-right min-w-[80px]">
                                        {month}
                                    </TableHead>
                                ))}
                                <TableHead className="text-right font-bold min-w-[100px]">Totale</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {categories.map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            {category.name}
                                        </div>
                                    </TableCell>
                                    {months.map((_, index) => {
                                        const amount = budgetData[category.id]?.[index + 1]?.total || 0;
                                        return (
                                            <TableCell key={index} className="text-right text-muted-foreground">
                                                {amount > 0 ? formatCurrency(amount) : "-"}
                                            </TableCell>
                                        );
                                    })}
                                    <TableCell className="text-right font-bold">
                                        {formatCurrency(calculateCategoryTotal(category.id))}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {/* Footer Row for Monthly Totals */}
                            <TableRow className="bg-muted/50 font-bold">
                                <TableCell>TOTALE</TableCell>
                                {months.map((_, index) => (
                                    <TableCell key={index} className="text-right">
                                        {formatCurrency(calculateMonthlyTotal(index))}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-primary">
                                    {formatCurrency(grandTotal)}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
