
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
    budgetData: Record<number, Record<number, { total: number; actual: number }>>;
    monthRange: [number, number]; // [start, end] indices (0-11)
}

export function SummaryTable({ categories, budgetData, monthRange }: SummaryTableProps) {
    const allMonths = [
        "Gen", "Feb", "Mar", "Apr", "Mag", "Giu",
        "Lug", "Ago", "Set", "Ott", "Nov", "Dic"
    ];

    const isAnnual = monthRange[1] - monthRange[0] === 12;
    const visibleMonths = allMonths.slice(monthRange[0], monthRange[1]);
    const startMonthIndex = monthRange[0]; // 0-based index offset for data access

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("it-IT", {
            style: "currency",
            currency: "EUR",
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const calculateCategoryTotal = (categoryId: number) => {
        let sum = 0;
        for (let m = 1; m <= 12; m++) {
            sum += budgetData[categoryId]?.[m]?.total || 0;
        }
        return sum;
    };

    const calculateCategoryActualTotal = (categoryId: number) => {
        let sum = 0;
        for (let m = 1; m <= 12; m++) {
            sum += budgetData[categoryId]?.[m]?.actual || 0;
        }
        return sum;
    };

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
                                {isAnnual ? (
                                    <>
                                        <TableHead className="text-right font-bold w-[20%]">Budget Anno</TableHead>
                                        <TableHead className="text-right font-bold w-[20%]">Actual Anno</TableHead>
                                        <TableHead className="text-right font-bold w-[20%]">Differenza</TableHead>
                                    </>
                                ) : (
                                    <>
                                        {visibleMonths.map((month) => (
                                            <TableHead key={month} className="text-right w-auto md:w-[10%] p-2">
                                                {month}
                                            </TableHead>
                                        ))}
                                        <TableHead className="text-right font-bold w-[15%] p-2">Totale Anno</TableHead>
                                    </>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {/* INCOME SECTION */}
                            <TableRow className="bg-muted/30">
                                <TableCell colSpan={isAnnual ? 4 : visibleMonths.length + 2} className="font-bold py-2">ENTRATE</TableCell>
                            </TableRow>
                            {categories.filter(c => c.type === 'income').map((category) => {
                                const annualBudget = calculateCategoryTotal(category.id);
                                const annualActual = calculateCategoryActualTotal(category.id);
                                const diff = annualActual - annualBudget;

                                return (
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
                                        {isAnnual ? (
                                            <>
                                                <TableCell className="text-right p-2">{formatCurrency(annualBudget)}</TableCell>
                                                <TableCell className="text-right p-2 text-muted-foreground">{formatCurrency(annualActual)}</TableCell>
                                                <TableCell className={`text-right p-2 font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(diff)}
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                {visibleMonths.map((_, index) => {
                                                    const monthDataIndex = startMonthIndex + index + 1;
                                                    const amount = budgetData[category.id]?.[monthDataIndex]?.total || 0;
                                                    return (
                                                        <TableCell key={index} className="text-right text-muted-foreground p-2">
                                                            {amount > 0 ? formatCurrency(amount) : "-"}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-right font-bold p-2">
                                                    {formatCurrency(annualBudget)}
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                )
                            })}

                            {/* TOTALE ENTRATE */}
                            <TableRow className="bg-green-50/50 font-bold border-t-2 border-green-100">
                                <TableCell className="text-green-700">TOTALE ENTRATE</TableCell>
                                {isAnnual ? (
                                    <>
                                        <TableCell className="text-right text-green-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0))}
                                        </TableCell>
                                        <TableCell className="text-right text-green-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryActualTotal(cat.id), 0))}
                                        </TableCell>
                                        <TableCell className="text-right text-green-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryActualTotal(cat.id) - calculateCategoryTotal(cat.id), 0))}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        {visibleMonths.map((_, index) => {
                                            const monthDataIndex = startMonthIndex + index + 1;
                                            return (
                                                <TableCell key={index} className="text-right text-green-700 p-2 text-xs sm:text-sm">
                                                    {formatCurrency(categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + (budgetData[cat.id]?.[monthDataIndex]?.total || 0), 0))}
                                                </TableCell>
                                            )
                                        })}
                                        <TableCell className="text-right text-green-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0))}
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>

                            {/* EXPENSE SECTION */}
                            <TableRow className="bg-muted/30">
                                <TableCell colSpan={isAnnual ? 4 : visibleMonths.length + 2} className="font-bold py-2 mt-4">USCITE</TableCell>
                            </TableRow>
                            {categories.filter(c => c.type === 'expense').map((category) => {
                                const annualBudget = calculateCategoryTotal(category.id);
                                const annualActual = calculateCategoryActualTotal(category.id);
                                const diff = annualBudget - annualActual; // For expense, saving is positive

                                return (
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
                                        {isAnnual ? (
                                            <>
                                                <TableCell className="text-right p-2">{formatCurrency(annualBudget)}</TableCell>
                                                <TableCell className="text-right p-2 text-muted-foreground">{formatCurrency(annualActual)}</TableCell>
                                                <TableCell className={`text-right p-2 font-bold ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(diff)}
                                                </TableCell>
                                            </>
                                        ) : (
                                            <>
                                                {visibleMonths.map((_, index) => {
                                                    const monthDataIndex = startMonthIndex + index + 1;
                                                    const amount = budgetData[category.id]?.[monthDataIndex]?.total || 0;
                                                    return (
                                                        <TableCell key={index} className="text-right text-muted-foreground p-2">
                                                            {amount > 0 ? formatCurrency(amount) : "-"}
                                                        </TableCell>
                                                    );
                                                })}
                                                <TableCell className="text-right font-bold p-2">
                                                    {formatCurrency(annualBudget)}
                                                </TableCell>
                                            </>
                                        )}
                                    </TableRow>
                                )
                            })}
                            {/* TOTALE USCITE */}
                            <TableRow className="bg-red-50/50 font-bold border-t-2 border-red-100">
                                <TableCell className="text-red-700">TOTALE USCITE</TableCell>
                                {isAnnual ? (
                                    <>
                                        <TableCell className="text-right text-red-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0))}
                                        </TableCell>
                                        <TableCell className="text-right text-red-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryActualTotal(cat.id), 0))}
                                        </TableCell>
                                        <TableCell className="text-right text-red-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id) - calculateCategoryActualTotal(cat.id), 0))}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        {visibleMonths.map((_, index) => {
                                            const monthDataIndex = startMonthIndex + index + 1;
                                            return (
                                                <TableCell key={index} className="text-right text-red-700 p-2 text-xs sm:text-sm">
                                                    {formatCurrency(categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + (budgetData[cat.id]?.[monthDataIndex]?.total || 0), 0))}
                                                </TableCell>
                                            )
                                        })}
                                        <TableCell className="text-right text-red-700 p-2">
                                            {formatCurrency(categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0))}
                                        </TableCell>
                                    </>
                                )}
                            </TableRow>

                            {/* NET ROW */}
                            <TableRow className="bg-muted/80 font-bold border-t-4 border-double">
                                <TableCell>BILANCIO PREVISTO</TableCell>
                                {isAnnual ? (
                                    <>
                                        <TableCell className="text-right p-2">
                                            {formatCurrency(
                                                categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0) -
                                                categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right p-2">
                                            {formatCurrency(
                                                categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryActualTotal(cat.id), 0) -
                                                categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryActualTotal(cat.id), 0)
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right p-2">
                                            {formatCurrency(
                                                (categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryActualTotal(cat.id), 0) -
                                                    categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryActualTotal(cat.id), 0)) -
                                                (categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0) -
                                                    categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0))
                                            )}
                                        </TableCell>
                                    </>
                                ) : (
                                    <>
                                        {visibleMonths.map((_, index) => {
                                            const monthDataIndex = startMonthIndex + index + 1;
                                            const income = categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + (budgetData[cat.id]?.[monthDataIndex]?.total || 0), 0);
                                            const expense = categories.filter(c => c.type === 'expense').reduce((sum, cat) => sum + (budgetData[cat.id]?.[monthDataIndex]?.total || 0), 0);
                                            const net = income - expense;
                                            return (
                                                <TableCell key={index} className={`text-right p-2 text-xs sm:text-sm ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {formatCurrency(net)}
                                                </TableCell>
                                            );
                                        })}
                                        <TableCell className="text-right p-2">
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
                                    </>
                                )}
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
