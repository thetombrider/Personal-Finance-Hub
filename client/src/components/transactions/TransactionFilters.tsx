import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Search, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Account, Category } from "@/context/FinanceContext";

interface TransactionFiltersProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    dateFrom: Date | undefined;
    setDateFrom: (date: Date | undefined) => void;
    dateTo: Date | undefined;
    setDateTo: (date: Date | undefined) => void;
    filterAccountId: string;
    setFilterAccountId: (id: string) => void;
    filterCategoryId: string;
    setFilterCategoryId: (id: string) => void;
    filterStatus: string;
    setFilterStatus: (status: string) => void;
    hasActiveFilters: boolean;
    clearFilters: () => void;
    accounts: Account[];
    categories: Category[];
    resultCount: number;
    totalCount: number;
}

export function TransactionFilters({
    searchQuery, setSearchQuery,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    filterAccountId, setFilterAccountId,
    filterCategoryId, setFilterCategoryId,
    filterStatus, setFilterStatus,
    hasActiveFilters, clearFilters,
    accounts, categories,
    resultCount, totalCount
}: TransactionFiltersProps) {
    return (
        <Card className="p-4">
            <div className="flex flex-wrap gap-4 items-end">
                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="search" className="text-sm font-medium mb-1.5 block">Search</Label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            id="search"
                            placeholder="Search description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                            data-testid="input-search"
                        />
                    </div>
                </div>

                {/* Date From */}
                <div className="w-[160px]">
                    <Label className="text-sm font-medium mb-1.5 block">From</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateFrom && "text-muted-foreground"
                                )}
                                data-testid="button-date-from"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Select"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={dateFrom}
                                onSelect={setDateFrom}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Date To */}
                <div className="w-[160px]">
                    <Label className="text-sm font-medium mb-1.5 block">To</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !dateTo && "text-muted-foreground"
                                )}
                                data-testid="button-date-to"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateTo ? format(dateTo, "dd/MM/yyyy") : "Select"}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={dateTo}
                                onSelect={setDateTo}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                {/* Account Filter */}
                <div className="w-[180px]">
                    <Label className="text-sm font-medium mb-1.5 block">Account</Label>
                    <Select value={filterAccountId} onValueChange={setFilterAccountId}>
                        <SelectTrigger data-testid="select-filter-account">
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Category Filter */}
                <div className="w-[180px]">
                    <Label className="text-sm font-medium mb-1.5 block">Category</Label>
                    <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
                        <SelectTrigger data-testid="select-filter-category">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Status Filter */}
                <div className="w-[180px]">
                    <Label className="text-sm font-medium mb-1.5 block">Status</Label>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger data-testid="select-filter-status">
                            <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="bank">Bank Reconciled</SelectItem>
                            <SelectItem value="recurring">Recurring Expenses</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Clear Filters */}
                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1" data-testid="button-clear-filters">
                        <X size={14} />
                        Clear Filters
                    </Button>
                )}
            </div>

            {hasActiveFilters && (
                <div className="mt-3 text-sm text-muted-foreground">
                    {resultCount} transactions found of {totalCount} total
                </div>
            )}
        </Card>
    );
}
