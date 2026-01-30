
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { type Category } from "@shared/schema";

interface SummaryTableProps {
    categories: Category[];
    budgetData: Record<number, Record<number, { total: number }>>;
    monthRange: [number, number]; // [start, end] indices (0-11)
    onDrilldown?: (categoryId: number, month: number) => void;
}

export function SummaryTable({ categories, budgetData, monthRange, onDrilldown }: SummaryTableProps) {
    const allMonths = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];

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

    return (
        <div className="rounded-md border w-full">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[15%] font-bold">Category</TableHead>
                        {visibleMonths.map((month) => (
                            <TableHead key={month} className="text-right w-auto md:w-[10%] p-2">
                                {month}
                            </TableHead>
                        ))}
                        <TableHead className="text-right font-bold w-[15%] p-2">Yearly Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {/* INCOME SECTION */}
                    <TableRow className="bg-muted/30">
                        <TableCell colSpan={visibleMonths.length + 2} className="font-bold py-2">Income</TableCell>
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
                            {visibleMonths.map((_, index) => {
                                // data is 1-indexed, so we add startMonthIndex (0-based) + index + 1
                                const monthDataIndex = startMonthIndex + index + 1;
                                const amount = budgetData[category.id]?.[monthDataIndex]?.total || 0;
                                return (
                                    <TableCell
                                        key={index}
                                        className={`text-right text-muted-foreground p-2 ${onDrilldown ? "cursor-pointer hover:bg-muted font-medium hover:text-primary hover:underline transition-colors" : ""}`}
                                        onClick={() => onDrilldown?.(category.id, monthDataIndex - 1)} // Passing 0-based month index
                                    >
                                        {amount > 0 ? formatCurrency(amount) : "-"}
                                    </TableCell>
                                );
                            })}
                            <TableCell className="text-right font-bold p-2">
                                {formatCurrency(calculateCategoryTotal(category.id))}
                            </TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="bg-green-50/50 font-bold border-t-2 border-green-100">
                        <TableCell className="text-green-700">Total Income</TableCell>
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
                    </TableRow>

                    {/* EXPENSE SECTION */}
                    <TableRow className="bg-muted/30">
                        <TableCell colSpan={visibleMonths.length + 2} className="font-bold py-2 mt-4">Expenses</TableCell>
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
                            {visibleMonths.map((_, index) => {
                                const monthDataIndex = startMonthIndex + index + 1;
                                const amount = budgetData[category.id]?.[monthDataIndex]?.total || 0;
                                return (
                                    <TableCell
                                        key={index}
                                        className={`text-right text-muted-foreground p-2 ${onDrilldown ? "cursor-pointer hover:bg-muted font-medium hover:text-primary hover:underline transition-colors" : ""}`}
                                        onClick={() => onDrilldown?.(category.id, monthDataIndex - 1)} // Passing 0-based month index
                                    >
                                        {amount > 0 ? formatCurrency(amount) : "-"}
                                    </TableCell>
                                );
                            })}
                            <TableCell className="text-right font-bold p-2">
                                {formatCurrency(calculateCategoryTotal(category.id))}
                            </TableCell>
                        </TableRow>
                    ))}
                    <TableRow className="bg-red-50/50 font-bold border-t-2 border-red-100">
                        <TableCell className="text-red-700">Total Expenses</TableCell>
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
                    </TableRow>

                    {/* NET ROW */}
                    <TableRow className="bg-muted/80 font-bold border-t-4 border-double">
                        <TableCell>
                            <div className="flex flex-col">
                                <span>Expected Balance</span>
                                <span className="text-xs font-normal text-muted-foreground">(Net of Investments)</span>
                            </div>
                        </TableCell>
                        {visibleMonths.map((_, index) => {
                            const monthDataIndex = startMonthIndex + index + 1;
                            const income = categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + (budgetData[cat.id]?.[monthDataIndex]?.total || 0), 0);
                            const expense = categories.filter(c => c.type === 'expense' && !c.excludeFromProjections).reduce((sum, cat) => sum + (budgetData[cat.id]?.[monthDataIndex]?.total || 0), 0);
                            const net = income - expense;
                            return (
                                <TableCell key={index} className={`text-right p-2 text-xs sm:text-sm ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(net)}
                                </TableCell>
                            );
                        })}
                        <TableCell className="text-right p-2">
                            {/* Annual Net */}
                            {(() => {
                                const totalIncome = categories.filter(c => c.type === 'income').reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0);
                                const totalExpense = categories.filter(c => c.type === 'expense' && !c.excludeFromProjections).reduce((sum, cat) => sum + calculateCategoryTotal(cat.id), 0);
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
    );
}

