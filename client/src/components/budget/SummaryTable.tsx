
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
                <div className="rounded-md border w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%] font-bold">Categoria</TableHead>
                                {months.map((month) => (
                                    <TableHead key={month} className="text-right w-auto md:w-[6.5%] p-1">
                                        {month}
                                    </TableHead>
                                ))}
                                <TableHead className="text-right font-bold w-[7%] p-1">Totale</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* INCOME SECTION */}
                            <TableRow className="bg-muted/30">
                                <TableCell colSpan={14} className="font-bold py-2">ENTRATE</TableCell>
                            </TableRow>
                            {categories.filter(c => c.type === 'income').map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <span className="truncate">{category.name}</span>
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
                            <TableRow className="bg-green-50/50 font-bold border-t-2 border-green-100">
                                <TableCell className="text-green-700">TOTALE ENTRATE</TableCell>
                                {months.map((_, index) => (
                                    <TableCell key={index} className="text-right text-green-700 p-1 text-xs sm:text-sm">
                                        {formatCurrency(categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + (budgetData[cat.id]?.[index + 1]?.total || 0), 0))}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-green-700">
                                    {formatCurrency(categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0))}
                                </TableCell>
                            </TableRow>

                            {/* EXPENSE SECTION */}
                            <TableRow className="bg-muted/30">
                                <TableCell colSpan={14} className="font-bold py-2 mt-4">USCITE</TableCell>
                            </TableRow>
                            {categories.filter(c => c.type === 'expense').map((category) => (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: category.color }}
                                            />
                                            <span className="truncate">{category.name}</span>
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
                            <TableRow className="bg-red-50/50 font-bold border-t-2 border-red-100">
                                <TableCell className="text-red-700">TOTALE USCITE</TableCell>
                                {months.map((_, index) => (
                                    <TableCell key={index} className="text-right text-red-700 p-1 text-xs sm:text-sm">
                                        {formatCurrency(categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + (budgetData[cat.id]?.[index + 1]?.total || 0), 0))}
                                    </TableCell>
                                ))}
                                <TableCell className="text-right text-red-700">
                                    {formatCurrency(categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0))}
                                </TableCell>
                            </TableRow>

                            {/* NET ROW */}
                            <TableRow className="bg-muted/80 font-bold border-t-4 border-double">
                                <TableCell>BILANCIO PREVISTO</TableCell>
                                {months.map((_, index) => {
                                    const income = categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + (budgetData[cat.id]?.[index + 1]?.total || 0), 0);
                                    const expense = categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + (budgetData[cat.id]?.[index + 1]?.total || 0), 0);
                                    const net = income - expense;
                                    return (
                                        <TableCell key={index} className={`text-right p-1 text-xs sm:text-sm ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(net)}
                                        </TableCell>
                                    );
                                })}
                                <TableCell className="text-right">
                                    {/* Annual Net */}
                                    {(() => {
                                        const totalIncome = categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0);
                                        const totalExpense = categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0);
                                        const totalNet = totalIncome - totalExpense;
                                        return (
                                            <span className={totalNet >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {formatCurrency(totalNet)}
                                            </span>
                                        );
                                    })()}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
