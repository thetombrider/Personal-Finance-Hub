import { useState, useMemo } from 'react';
import { Transaction, Account, Category } from '@/context/FinanceContext';
import { RecurringExpenseCheck } from '@shared/schema';

export type SortField = 'date' | 'description' | 'category' | 'account' | 'amount';
export type SortDirection = 'asc' | 'desc';

interface UseTransactionsDataProps {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    checks?: RecurringExpenseCheck[];
}

export function useTransactionsData({ transactions, accounts, categories, checks }: UseTransactionsDataProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterAccountId, setFilterAccountId] = useState<string>('all');
    const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
    const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const matchedTransactions = useMemo(() => {
        const map = new Map<number, RecurringExpenseCheck>();
        if (checks) {
            checks.forEach(check => {
                if (check.transactionId) {
                    map.set(check.transactionId, check);
                }
            });
        }
        return map;
    }, [checks]);

    const getAccountName = (id: number) => accounts.find(a => a.id === id)?.name || "Unknown";
    const getCategoryName = (id: number) => categories.find(c => c.id === id)?.name || "Unknown";

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Search filter
            if (searchQuery && !t.description.toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }

            // Account filter
            if (filterAccountId !== 'all' && t.accountId !== parseInt(filterAccountId)) {
                return false;
            }

            // Category filter
            if (filterCategoryId !== 'all' && t.categoryId !== parseInt(filterCategoryId)) {
                return false;
            }

            // Status filter
            if (filterStatus === 'bank' && !t.externalId) {
                return false;
            }
            if (filterStatus === 'recurring' && !matchedTransactions.has(t.id)) {
                return false;
            }

            // Date range filter
            const transactionDate = new Date(t.date);
            if (dateFrom) {
                const startOfDay = new Date(dateFrom);
                startOfDay.setHours(0, 0, 0, 0);
                if (transactionDate < startOfDay) {
                    return false;
                }
            }
            if (dateTo) {
                const endOfDay = new Date(dateTo);
                endOfDay.setHours(23, 59, 59, 999);
                if (transactionDate > endOfDay) {
                    return false;
                }
            }

            return true;
        });
    }, [transactions, searchQuery, filterAccountId, filterCategoryId, filterStatus, dateFrom, dateTo, matchedTransactions]);

    const sortedTransactions = useMemo(() => {
        const sorted = [...filteredTransactions].sort((a, b) => {
            let comparison = 0;

            switch (sortField) {
                case 'date':
                    comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                    break;
                case 'description':
                    comparison = a.description.localeCompare(b.description);
                    break;
                case 'category':
                    comparison = getCategoryName(a.categoryId).localeCompare(getCategoryName(b.categoryId));
                    break;
                case 'account':
                    comparison = getAccountName(a.accountId).localeCompare(getAccountName(b.accountId));
                    break;
                case 'amount':
                    const amountA = a.type === 'income' ? parseFloat(a.amount) : -parseFloat(a.amount);
                    const amountB = b.type === 'income' ? parseFloat(b.amount) : -parseFloat(b.amount);
                    comparison = amountA - amountB;
                    break;
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });

        return sorted;
    }, [filteredTransactions, sortField, sortDirection, accounts, categories]);

    const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);

    const paginatedTransactions = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedTransactions.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedTransactions, currentPage, itemsPerPage]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setSearchQuery('');
        setFilterAccountId('all');
        setFilterCategoryId('all');
        setFilterStatus('all');
        setDateFrom(undefined);
        setDateTo(undefined);
        setCurrentPage(1);
    };

    const hasActiveFilters = searchQuery || filterAccountId !== 'all' || filterCategoryId !== 'all' || filterStatus !== 'all' || dateFrom || dateTo;

    return {
        filteredTransactions,
        sortedTransactions,
        paginatedTransactions,
        matchedTransactions,
        filterState: {
            searchQuery, setSearchQuery,
            filterAccountId, setFilterAccountId,
            filterCategoryId, setFilterCategoryId,
            filterStatus, setFilterStatus,
            dateFrom, setDateFrom,
            dateTo, setDateTo,
            hasActiveFilters,
            clearFilters,
        },
        sortState: {
            sortField,
            sortDirection,
            handleSort,
        },
        paginationState: {
            currentPage,
            setCurrentPage,
            totalPages,
            itemsPerPage
        }
    };
}
