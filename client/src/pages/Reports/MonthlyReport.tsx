import { useState, useMemo, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { format, subMonths, parseISO, startOfMonth, endOfMonth, parse } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight, Landmark, Tag as TagIcon } from "lucide-react";
import { useFinance } from "@/context/FinanceContext";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TransactionDrilldown } from "@/components/reports/TransactionDrilldown";
import { Badge } from "@/components/ui/badge";

type ViewMode = 'accounts' | 'categories' | 'tags';

export default function MonthlyReport() {
    const { accounts, categories, tags, transactions, formatCurrency, isLoading } = useFinance();
    const [viewMode, setViewMode] = useState<ViewMode>('accounts');
    const [reportType, setReportType] = useState<'spending' | 'net_flow'>('spending');
    const [timeRange, setTimeRange] = useState('12');
    const [page, setPage] = useState(0);

    const [drilldownConfig, setDrilldownConfig] = useState<{
        isOpen: boolean;
        title: string;
        filters: any;
    } | null>(null);

    const monthsList = useMemo(() => {
        const months = parseInt(timeRange);
        const list = [];
        for (let i = months - 1; i >= 0; i--) {
            const date = subMonths(new Date(), i);
            list.push({
                date,
                key: format(date, 'yyyy-MM'),
                label: format(date, 'MMM')
            });
        }
        return list;
    }, [timeRange]);

    // Reset page when timeRange or viewMode changes
    useEffect(() => {
        setPage(0);
    }, [timeRange, viewMode]);

    const visibleMonths = useMemo(() => {
        const itemsPerPage = 6;
        const totalMonths = monthsList.length;
        const endIndex = totalMonths - (page * itemsPerPage);
        const startIndex = Math.max(0, endIndex - itemsPerPage);
        return monthsList.slice(startIndex, endIndex);
    }, [monthsList, page]);

    const totalPages = Math.ceil(monthsList.length / 6);
    const canGoBack = page < totalPages - 1;
    const canGoForward = page > 0;

    // Helper to check if transaction is a transfer
    const isTransfer = (t: any) => {
        const category = categories.find(c => c.id === t.categoryId);
        return category?.type === 'transfer';
    };

    const rowData = useMemo(() => {
        const data: Record<string, Record<string, number>> = {};

        if (viewMode === 'accounts') {
            accounts.forEach(acc => {
                data[acc.name] = {};
                monthsList.forEach(m => {
                    data[acc.name][m.key] = 0;
                });
            });

            transactions.forEach(t => {
                const isTransferMatch = isTransfer(t);
                if (reportType === 'spending' && isTransferMatch) return; // Exclude transfers only in spending mode

                const account = accounts.find(a => a.id === t.accountId);
                if (!account) return;

                const tDate = parseISO(t.date);
                const monthKey = format(tDate, 'yyyy-MM');

                if (data[account.name] && data[account.name][monthKey] !== undefined) {
                    const amount = parseFloat(t.amount) || 0;
                    if (t.type === 'income') {
                        data[account.name][monthKey] += amount;
                    } else {
                        data[account.name][monthKey] -= amount;
                    }
                }
            });
        } else if (viewMode === 'categories') {
            const relevantCategories = categories.filter(c => reportType === 'net_flow' || c.type !== 'transfer');

            relevantCategories.forEach(cat => {
                data[cat.name] = {};
                monthsList.forEach(m => {
                    data[cat.name][m.key] = 0;
                });
            });

            transactions.forEach(t => {
                const isTransferMatch = isTransfer(t);
                // In categories view, if we are in spending mode, we exclude transfers.
                // If in net_flow mode, we include them. But where do they go?
                // They go to their respective categories. Since we filtered relevantCategories above to exclude transfers in the row setup,
                // we need to make sure we include transfer categories in the rows if reportType is net_flow.
                if (reportType === 'spending' && isTransferMatch) return;

                const category = categories.find(c => c.id === t.categoryId);
                if (!category) return;

                // If net_flow and is transfer, we need to make sure the row exists or we add it dynamically?
                // The current row setup (lines 96-103) filters categories. We should fix that first.
                // But wait, I can't easily change the row setup inside this loop block without changing the above block.
                // I'll need to update the relevantCategories logic.
                if (!data[category.name]) {
                    // logic to handle if row doesn't exist (e.g. transfer category in net_flow mode but not in initial relevantCategories)
                    // See below for a better approach to fix the row setup.
                    return;
                }

                const tDate = parseISO(t.date);
                const monthKey = format(tDate, 'yyyy-MM');

                if (data[category.name][monthKey] !== undefined) {
                    const amount = parseFloat(t.amount) || 0;
                    if (t.type === 'income') {
                        data[category.name][monthKey] += amount;
                    } else {
                        data[category.name][monthKey] -= amount;
                    }
                }
            });
        } else if (viewMode === 'tags') {
            // Tags View
            tags.forEach(tag => {
                data[tag.name] = {};
                monthsList.forEach(m => {
                    data[tag.name][m.key] = 0;
                });
            });
            // Add "No Tag" bucket
            const noTagName = 'No Tag';
            data[noTagName] = {};
            monthsList.forEach(m => {
                data[noTagName][m.key] = 0;
            });

            transactions.forEach(t => {
                const isTransferMatch = isTransfer(t);
                if (reportType === 'spending' && isTransferMatch) return; // Exclude transfers in spending mode

                const tDate = parseISO(t.date);
                const monthKey = format(tDate, 'yyyy-MM');
                const amount = parseFloat(t.amount) || 0;
                // Adjust for income/expense
                const signedAmount = t.type === 'income' ? amount : -amount;

                if (!t.tags || t.tags.length === 0) {
                    if (data[noTagName][monthKey] !== undefined) {
                        data[noTagName][monthKey] += signedAmount;
                    }
                } else {
                    t.tags.forEach(tag => {
                        if (data[tag.name] && data[tag.name][monthKey] !== undefined) {
                            data[tag.name][monthKey] += signedAmount;
                        }
                    });
                }
            });
        }

        return data;
    }, [transactions, accounts, categories, tags, monthsList, viewMode, reportType]);

    const handleDrilldown = (rowName: string, monthKey: string) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year, month - 1);
        const fromDate = startOfMonth(date);
        const toDate = endOfMonth(date);

        let filters = {};
        let title = `${rowName} - ${format(date, 'MMMM yyyy')}`;

        if (viewMode === 'accounts') {
            const account = accounts.find(a => a.name === rowName);
            if (!account) return;
            filters = { accountId: account.id.toString(), dateFrom: fromDate, dateTo: toDate };
        } else if (viewMode === 'categories') {
            const category = categories.find(c => c.name === rowName);
            if (!category) return;
            filters = { categoryId: category.id.toString(), dateFrom: fromDate, dateTo: toDate };
        } else if (viewMode === 'tags') {
            if (rowName === 'No Tag') {
                filters = { untagged: true, dateFrom: fromDate, dateTo: toDate };
            } else {
                const tag = tags.find(t => t.name === rowName);
                if (!tag) return;
                filters = { tagIds: [tag.id], dateFrom: fromDate, dateTo: toDate };
            }
        }


        // Add excludeTransfers to filters if in spending mode
        if (reportType === 'spending') {
            filters = { ...filters, excludeTransfers: true };
        }

        setDrilldownConfig({
            isOpen: true,
            title,
            filters
        });
    };

    const handleTotalDrilldown = (rowName: string) => {
        if (monthsList.length === 0) return;
        const startDate = monthsList[0].date;
        const endDate = monthsList[monthsList.length - 1].date;
        const fromDate = startOfMonth(startDate);
        const toDate = endOfMonth(endDate);

        let filters = {};

        if (viewMode === 'accounts') {
            const account = accounts.find(a => a.name === rowName);
            if (!account) return;
            filters = { accountId: account.id.toString(), dateFrom: fromDate, dateTo: toDate };
        } else if (viewMode === 'categories') {
            const category = categories.find(c => c.name === rowName);
            if (!category) return;
            filters = { categoryId: category.id.toString(), dateFrom: fromDate, dateTo: toDate };
        } else if (viewMode === 'tags') {
            if (rowName === 'No Tag') {
                filters = { untagged: true, dateFrom: fromDate, dateTo: toDate };
            } else {
                const tag = tags.find(t => t.name === rowName);
                if (!tag) return;
                filters = { tagIds: [tag.id], dateFrom: fromDate, dateTo: toDate };
            }
        }


        // Add excludeTransfers to filters if in spending mode
        if (reportType === 'spending') {
            filters = { ...filters, excludeTransfers: true };
        }

        setDrilldownConfig({
            isOpen: true,
            title: `${rowName} - Total (${timeRange} months)`,
            filters
        });
    }

    const handleMonthlyTotalDrilldown = (monthKey: string) => {
        const [year, month] = monthKey.split('-').map(Number);
        const date = new Date(year, month - 1);
        const fromDate = startOfMonth(date);
        const toDate = endOfMonth(date);

        setDrilldownConfig({
            isOpen: true,
            title: `Total - ${format(date, 'MMMM yyyy')}`,
            filters: {
                dateFrom: fromDate,
                dateTo: toDate,
                excludeTransfers: reportType === 'spending',
            },
        });
    }

    const handleGrandTotalDrilldown = () => {
        if (monthsList.length === 0) return;
        const firstMonth = monthsList[0].date;
        const lastMonth = monthsList[monthsList.length - 1].date;
        const fromDate = startOfMonth(firstMonth);
        const toDate = endOfMonth(lastMonth);

        setDrilldownConfig({
            isOpen: true,
            title: `Grand Total - Period`,
            filters: {
                dateFrom: fromDate,
                dateTo: toDate,
                excludeTransfers: reportType === 'spending',
            },
        });
    }

    const getHeaderLabel = () => {
        switch (viewMode) {
            case 'accounts': return 'Account';
            case 'categories': return 'Category';
            case 'tags': return 'Tag';
            default: return 'Name';
        }
    }


    if (isLoading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-96">
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <h1 className="text-3xl font-heading font-bold text-foreground">Monthly Report</h1>
                        <Select value={viewMode} onValueChange={(v: ViewMode) => setViewMode(v)}>
                            <SelectTrigger className="w-[180px]">
                                <SelectValue placeholder="View Mode" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="accounts">By Account</SelectItem>
                                <SelectItem value="categories">By Category</SelectItem>
                                <SelectItem value="tags">By Tag</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={reportType} onValueChange={(v: 'spending' | 'net_flow') => setReportType(v)}>
                            <SelectTrigger className="w-[240px]">
                                <SelectValue placeholder="Report Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="spending">Spending (No Transfers)</SelectItem>
                                <SelectItem value="net_flow">Net Flow (All)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md mr-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPage(p => p + 1)}
                                disabled={!canGoBack}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <span className="text-sm px-2 font-medium min-w-[80px] text-center">
                                {visibleMonths.length > 0
                                    ? `${visibleMonths[0].label} - ${visibleMonths[visibleMonths.length - 1].label}`
                                    : 'No data'}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={!canGoForward}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>

                        <Select value={timeRange} onValueChange={setTimeRange}>
                            <SelectTrigger className="w-[170px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">Last 6 months</SelectItem>
                                <SelectItem value="12">Last 12 months</SelectItem>
                                <SelectItem value="24">Last 24 months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Card className="flex flex-col max-h-[calc(100vh-14rem)] md:max-h-[calc(100vh-12rem)]">
                    <CardContent className="p-0 overflow-auto">
                        <ScrollArea className="w-full h-full">
                            <div className="w-full">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="sticky left-0 bg-card z-10 w-[20%] min-w-[150px]">
                                                {getHeaderLabel()}
                                            </TableHead>
                                            {visibleMonths.map(m => (
                                                <TableHead key={m.key} className="text-center w-[10%] min-w-[80px] text-xs sm:text-sm p-1 capitalize">{m.label}</TableHead>
                                            ))}
                                            <TableHead className="text-center w-[10%] min-w-[100px] font-semibold p-1">Period Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {Object.entries(rowData).map(([rowName, months]) => {
                                            const total = Object.values(months).reduce((sum, val) => sum + val, 0);
                                            const account = viewMode === 'accounts' ? accounts.find(a => a.name === rowName) : null;
                                            const tag = viewMode === 'tags' ? tags.find(t => t.name === rowName) : null;

                                            // For categories view, remove empty rows
                                            if (viewMode === 'categories' && total === 0) return null;

                                            // For tags view, remove empty rows except "No Tag" if user wants to see it even if empty? 
                                            // Likely better to hide "No Tag" if 0.
                                            if (viewMode === 'tags' && total === 0) return null;


                                            return (
                                                <TableRow key={rowName}>
                                                    <TableCell className="sticky left-0 bg-card z-10 font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {viewMode === 'tags' && rowName !== 'No Tag' && tag && (
                                                                <TagIcon size={14} className="text-muted-foreground mr-1" />
                                                            )}
                                                            {rowName}
                                                            {viewMode === 'accounts' && account?.gocardlessAccountId && (
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <Landmark size={14} className="text-blue-500/70" />
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>Bank Linked</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            )}
                                                            {viewMode === 'tags' && rowName !== 'No Tag' && tag && (
                                                                <div className="h-3 w-3 rounded-full ml-auto" style={{ backgroundColor: tag.color }} />
                                                            )}

                                                        </div>
                                                    </TableCell>
                                                    {visibleMonths.map(m => {
                                                        const val = months[m.key];
                                                        return (
                                                            <TableCell
                                                                key={m.key}
                                                                className={`text-center text-xs sm:text-sm p-1 ${val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : ''} cursor-pointer hover:underline hover:bg-muted/50 transition-colors`}
                                                                onClick={() => handleDrilldown(rowName, m.key)}
                                                                title="View transactions"
                                                            >
                                                                {val !== 0 ? formatCurrency(val) : '-'}
                                                            </TableCell>
                                                        );
                                                    })}
                                                    <TableCell
                                                        className={`text-center font-semibold ${total > 0 ? 'text-emerald-600' : total < 0 ? 'text-rose-600' : ''} cursor-pointer hover:underline hover:bg-muted/50 transition-colors`}
                                                        onClick={() => handleTotalDrilldown(rowName)}
                                                        title="View all transactions for this period"
                                                    >
                                                        {total !== 0 ? formatCurrency(total) : '-'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        <TableRow className="bg-muted/50 font-semibold">
                                            <TableCell className="sticky left-0 bg-muted/50 z-10">Total</TableCell>
                                            {visibleMonths.map(m => {
                                                // For tags, the sum might be weird because one transaction can have multiple tags
                                                // So summing all tag bucket values will double-count transactions with multiple tags.
                                                // However, "Total" usually implies sum of transactions.
                                                // So we should probably calculate the Total row independently of the displayed rows to avoid double counting.
                                                // But wait, the previous code claimed:
                                                // "Period Total" column sums the visible months for that row.
                                                // The "Total" row sums the column.

                                                // IF viewMode === 'tags', we CANNOT simply sum the rows because of potential duplicates.
                                                // We must recalculate the total based on unique transactions for that month.
                                                // Actually, reusing the same TOTAL calculation logic from Accounts/Categories (which relies on `transactions`) is safer.

                                                let monthTotal = 0;
                                                if (viewMode === 'tags') {
                                                    // Sum all unique transactions for this month regardless of tags
                                                    // Actually, if we are in 'tags' view, does the user expect the total of the tags shown?
                                                    // Usually "Report Total" means "Total Income/Expense" for the month.
                                                    // Let's stick to true total from transactions.
                                                    // We can reuse the same logic we used for building the data map, but just summing everything once.
                                                    transactions.forEach(t => {
                                                        const tDate = parseISO(t.date);
                                                        if (format(tDate, 'yyyy-MM') === m.key) {
                                                            if (reportType === 'spending' && isTransfer(t)) return;

                                                            const amount = parseFloat(t.amount) || 0;
                                                            if (t.type === 'income') monthTotal += amount;
                                                            else monthTotal -= amount;
                                                        }
                                                    });
                                                } else {
                                                    monthTotal = Object.values(rowData).reduce((sum, row) => sum + (row[m.key] || 0), 0);
                                                }

                                                return (
                                                    <TableCell key={m.key} className={`text-center ${monthTotal > 0 ? 'text-emerald-600' : monthTotal < 0 ? 'text-rose-600' : ''} cursor-pointer hover:underline`} onClick={() => handleMonthlyTotalDrilldown(m.key)}>
                                                        {monthTotal !== 0 ? formatCurrency(monthTotal) : '-'}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="text-center cursor-pointer hover:underline" onClick={handleGrandTotalDrilldown}>
                                                {/* Grand Total calculation */}
                                                {(() => {
                                                    let grandTotal = 0;
                                                    if (viewMode === 'tags') {
                                                        // Calculate true grand total from transactions within the full time range
                                                        transactions.forEach(t => {
                                                            const tDate = parseISO(t.date);
                                                            // Check if transaction is within the monthsList range
                                                            // Optimization: just check if the monthKey is in the monthsList
                                                            const tMonthKey = format(tDate, 'yyyy-MM');
                                                            if (monthsList.some(m => m.key === tMonthKey)) {
                                                                if (reportType === 'spending' && isTransfer(t)) return;

                                                                const amount = parseFloat(t.amount) || 0;
                                                                if (t.type === 'income') grandTotal += amount;
                                                                else grandTotal -= amount;
                                                            }
                                                        });
                                                    } else {
                                                        grandTotal = Object.values(rowData).reduce((sum, row) =>
                                                            sum + Object.values(row).reduce((s, v) => s + v, 0), 0
                                                        );
                                                    }
                                                    return formatCurrency(grandTotal);
                                                })()}
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <ScrollBar orientation="horizontal" />
                        </ScrollArea>
                    </CardContent>
                </Card>

                {drilldownConfig && (
                    <TransactionDrilldown
                        isOpen={!!drilldownConfig}
                        onClose={() => setDrilldownConfig(null)}
                        title={drilldownConfig.title}
                        initialFilters={drilldownConfig.filters}
                    />
                )}
            </div>
        </Layout>
    );
}
