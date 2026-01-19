import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Search, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Account, Category } from "@/context/FinanceContext";
import { useState } from "react";

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
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState<'date' | 'account' | 'category' | 'status'>('date');

    return (
        <Card className="p-4">
            <div className="flex gap-3 items-center">
                {/* Search */}
                <div className="flex-1">
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

                {/* Filters Dropdown */}
                <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className={cn(hasActiveFilters && "border-primary")}
                            data-testid="button-filters-toggle"
                        >
                            <Filter className={cn("h-4 w-4", hasActiveFilters && "text-primary")} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[600px] p-0" align="end">
                        <div className="flex h-[320px]">
                            {/* Left: Filter Labels */}
                            <div className="w-[160px] border-r bg-muted/20 p-3 flex flex-col">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-sm">Filters</h4>
                                </div>
                                <div className="space-y-1 text-sm flex-1">
                                    <button
                                        className={cn(
                                            "w-full px-2 py-1.5 text-left font-medium rounded transition-colors",
                                            selectedFilter === 'date'
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                        onClick={() => setSelectedFilter('date')}
                                    >
                                        Date
                                    </button>
                                    <button
                                        className={cn(
                                            "w-full px-2 py-1.5 text-left font-medium rounded transition-colors",
                                            selectedFilter === 'account'
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                        onClick={() => setSelectedFilter('account')}
                                    >
                                        Account
                                    </button>
                                    <button
                                        className={cn(
                                            "w-full px-2 py-1.5 text-left font-medium rounded transition-colors",
                                            selectedFilter === 'category'
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                        onClick={() => setSelectedFilter('category')}
                                    >
                                        Category
                                    </button>
                                    <button
                                        className={cn(
                                            "w-full px-2 py-1.5 text-left font-medium rounded transition-colors",
                                            selectedFilter === 'status'
                                                ? "bg-primary text-primary-foreground"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                        onClick={() => setSelectedFilter('status')}
                                    >
                                        Status
                                    </button>
                                </div>
                                {hasActiveFilters && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={clearFilters}
                                        className="w-full mt-4 h-8 text-xs"
                                        data-testid="button-clear-filters"
                                    >
                                        <X size={12} className="mr-1" />
                                        Clear All
                                    </Button>
                                )}
                            </div>

                            {/* Right: Filter Controls */}
                            <div className="flex-1 p-4">
                                {selectedFilter === 'date' && (
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">From</Label>
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
                                                        {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Select date"}
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

                                        <div>
                                            <Label className="text-sm font-medium mb-2 block">To</Label>
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
                                                        {dateTo ? format(dateTo, "dd/MM/yyyy") : "Select date"}
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
                                    </div>
                                )}

                                {selectedFilter === 'account' && (
                                    <div>
                                        <Label className="text-sm font-medium mb-2 block">Select Account</Label>
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
                                )}

                                {selectedFilter === 'category' && (
                                    <div>
                                        <Label className="text-sm font-medium mb-2 block">Select Category</Label>
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
                                )}

                                {selectedFilter === 'status' && (
                                    <div>
                                        <Label className="text-sm font-medium mb-2 block">Select Status</Label>
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
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {hasActiveFilters && (
                <div className="mt-3 text-sm text-muted-foreground">
                    {resultCount} transactions found of {totalCount} total
                </div>
            )}
        </Card>
    );
}
