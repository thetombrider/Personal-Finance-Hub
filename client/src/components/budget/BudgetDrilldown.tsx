
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { PlannedExpense, RecurringExpense } from "@shared/schema";
import { formatForDisplay } from "@/lib/dateFormatters";
import { ArrowDown, ArrowUp, CalendarDays, ExternalLink } from "lucide-react";

interface BudgetDrilldownProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    data: {
        baseline: number;
        planned: PlannedExpense[];
        recurring: RecurringExpense[];
        total: number;
    };
}

export function BudgetDrilldown({ isOpen, onClose, title, data }: BudgetDrilldownProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-[800px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        Breakdown of the budget value for this month
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-auto py-4 space-y-6">
                    {/* Baseline Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="bg-primary/10 p-1 rounded">
                                <ExternalLink size={14} />
                            </span>
                            Baseline Budget
                        </h3>
                        <div className="bg-card border rounded-md p-3 flex justify-between items-center">
                            <span className="text-sm">Monthly Baseline</span>
                            <span className="font-mono font-medium">{formatCurrency(data.baseline)}</span>
                        </div>
                    </div>

                    {/* Recurring Expenses Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="bg-blue-500/10 p-1 rounded text-blue-600">
                                <CalendarDays size={14} />
                            </span>
                            Recurring Items ({data.recurring.length})
                        </h3>
                        {data.recurring.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="h-8">Description</TableHead>
                                            <TableHead className="h-8 text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.recurring.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="py-2">{item.name}</TableCell>
                                                <TableCell className="text-right py-2 font-mono">
                                                    {formatCurrency(Number(item.amount))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic px-2">No recurring items for this month</div>
                        )}
                    </div>

                    {/* Planned Expenses Section */}
                    <div className="space-y-2">
                        <h3 className="font-semibold flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="bg-orange-500/10 p-1 rounded text-orange-600">
                                <ArrowUp size={14} />
                            </span>
                            Planned Extra Items ({data.planned.length})
                        </h3>
                        {data.planned.length > 0 ? (
                            <div className="border rounded-md overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                                            <TableHead className="h-8">Date</TableHead>
                                            <TableHead className="h-8">Description</TableHead>
                                            <TableHead className="h-8 text-right">Amount</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.planned.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="py-2 text-muted-foreground text-xs">
                                                    {formatForDisplay(new Date(item.date))}
                                                </TableCell>
                                                <TableCell className="py-2">{item.name}</TableCell>
                                                <TableCell className="text-right py-2 font-mono">
                                                    {formatCurrency(Number(item.amount))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground italic px-2">No planned extra items for this month</div>
                        )}
                    </div>
                </div>

                <div className="border-t pt-4 mt-2 flex justify-between items-center bg-muted/20 -mx-6 px-6 py-4 -mb-4">
                    <span className="font-semibold text-lg">Total Budget</span>
                    <span className="font-bold text-xl">{formatCurrency(data.total)}</span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
