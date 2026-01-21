import { useFinance } from "@/context/FinanceContext";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePortfolioStats } from "@/hooks/usePortfolioStats";
import { useDashboardStats } from "@/hooks/dashboard/useDashboardStats";
import { useDashboardCharts } from "@/hooks/dashboard/useDashboardCharts";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { StatsGrid } from "@/components/dashboard/StatsGrid";
import { AccountDetailModal } from "@/components/dashboard/modals/AccountDetailModal";
import { NetWorthEvolutionChart } from "@/components/dashboard/charts/NetWorthEvolutionChart";
import { WealthDistributionChart } from "@/components/dashboard/charts/WealthDistributionChart";
import { CashFlowChart } from "@/components/dashboard/charts/CashFlowChart";
import { SpendingBreakdownChart } from "@/components/dashboard/charts/SpendingBreakdownChart";
import { BudgetComparisonChart } from "@/components/dashboard/charts/BudgetComparisonChart";
import { CategoryTrendChart } from "@/components/dashboard/charts/CategoryTrendChart";
import { NetWorthProjectionChart } from "@/components/dashboard/charts/NetWorthProjectionChart";
import { SankeyChart } from "@/components/dashboard/charts/SankeyChart";
import { TransactionForm, TransactionFormValues } from "@/components/transactions/TransactionForm";
import { TransferForm, TransferFormValues } from "@/components/transactions/TransferForm";
import { AddTradeModal } from "@/components/portfolio/AddTradeModal";
import { ImportedTransactions } from "@/components/ImportedTransactions";
import { MissingRecurringTransactionsModal } from "@/components/dashboard/MissingRecurringTransactionsModal";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

export default function Dashboard() {
  const { accounts, transactions, categories, formatCurrency, addTransaction, addCategory, addTransfer } = useFinance();
  const [, setLocation] = useLocation();
  const [categoryTrendId, setCategoryTrendId] = useState<string>("");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [detailModal, setDetailModal] = useState<'total' | 'cash' | 'savings' | 'investments' | null>(null);

  // Quick Action States
  const [isTransactionOpen, setIsTransactionOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [isReviewStagingOpen, setIsReviewStagingOpen] = useState(false);
  const [isMissingRecurringOpen, setIsMissingRecurringOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const { data: currentYearBudget } = useQuery({
    queryKey: ['budget', currentYear],
    queryFn: async () => {
      const res = await fetch(`/api/budget/${currentYear}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    }
  });

  const { data: previousYearBudget } = useQuery({
    queryKey: ['budget', currentYear - 1],
    queryFn: async () => {
      const res = await fetch(`/api/budget/${currentYear - 1}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    }
  });

  const { data: nextYearBudget } = useQuery({
    queryKey: ['budget', currentYear + 1],
    queryFn: async () => {
      const res = await fetch(`/api/budget/${currentYear + 1}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    }
  });

  const { data: pendingStagingCount = 0 } = useQuery({
    queryKey: ["/api/transactions/staging", "count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/transactions/staging?status=pending");
      const data = await res.json();
      return Array.isArray(data) ? data.length : 0;
    }
  });

  const { data: missingRecurringCount = 0 } = useQuery({
    queryKey: ["/api/reconciliation/missing", "count"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/reconciliation/missing");
      const data = await res.json();
      return data.count || 0;
    }
  });

  const { portfolioSummary, trades, holdings } = usePortfolioStats();

  const investmentAccounts = accounts.filter(a => a.type === "investment");

  const onTransactionSubmit = async (data: TransactionFormValues) => {
    const formattedData = {
      ...data,
      amount: data.amount.toString(),
      date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
    };
    await addTransaction(formattedData);
    setIsTransactionOpen(false);
  };

  const onTransferSubmit = async (data: TransferFormValues) => {
    const transferCategory = categories.find(c => c.name.toLowerCase() === "trasferimenti" || c.name.toLowerCase() === "transfer");
    let transferCategoryId = transferCategory?.id;

    if (!transferCategory) {
      try {
        const newCategory = await addCategory({
          name: "Transfers",
          type: "transfer",
          color: "#94a3b8",
          icon: "ArrowLeftRight",
        });
        transferCategoryId = newCategory.id;
      } catch (error) {
        alert("Failed to create transfer category. Please create it manually in settings.");
        return;
      }
    }

    if (!transferCategoryId) {
      alert("Category 'Transfers' not found. Please create it first in settings.");
      return;
    }

    await addTransfer({
      amount: data.amount.toString(),
      description: data.description,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      categoryId: transferCategoryId,
      date: format(data.date, "yyyy-MM-dd'T'HH:mm:ss"),
    });

    setIsTransferOpen(false);
  };

  // Custom Hooks
  const stats = useDashboardStats({
    accounts,
    transactions,
    portfolioSummary
  });

  const charts = useDashboardCharts({
    transactions,
    accounts,
    categories,
    trades,
    portfolioSummary,
    categoryTrendId,
    currentYearBudget,
    previousYearBudget,
    nextYearBudget,
    currentYear,
    totalBalance: stats.totalBalance
  });

  return (
    <Layout>
      <div className="space-y-8">
        <DashboardHeader
          privacyMode={privacyMode}
          setPrivacyMode={setPrivacyMode}
          onNewTransaction={() => setIsTransactionOpen(true)}
          onNewTransfer={() => setIsTransferOpen(true)}
          onNewTrade={() => setIsAddTradeOpen(true)}
          onReviewStaging={() => setIsReviewStagingOpen(true)}
          pendingStagingCount={pendingStagingCount}
          onReviewRecurring={() => setIsMissingRecurringOpen(true)}
          missingRecurringCount={missingRecurringCount}
        />

        <StatsGrid
          totalBalance={stats.totalBalance}
          totalCash={stats.totalCash}
          totalSavings={stats.totalSavings}
          portfolioSummary={portfolioSummary}
          globalMonthlyStats={charts.globalMonthlyStats}
          totalCredit={stats.totalCredit}
          creditUsageThisMonth={stats.creditUsageThisMonth}
          accountsCount={accounts.length}
          privacyMode={privacyMode}
          formatCurrency={formatCurrency}
          setDetailModal={setDetailModal}
        />

        <div className="grid gap-6 md:grid-cols-2">
          <NetWorthEvolutionChart
            data={charts.netWorthData}
            totalBalance={stats.totalBalance}
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
          <NetWorthProjectionChart
            data={charts.netWorthProjectionData}
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <CashFlowChart
            data={charts.chartData}
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
          <CategoryTrendChart
            data={charts.categoryTrendData}
            categoryTrendId={categoryTrendId}
            setCategoryTrendId={setCategoryTrendId}
            categories={categories}
            selectedCategoryForTrend={charts.selectedCategoryForTrend}
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <BudgetComparisonChart
            data={charts.budgetIncomeComparisonData}
            privacyMode={privacyMode}
            type="income"
          />
          <BudgetComparisonChart
            data={charts.budgetExpenseComparisonData}
            privacyMode={privacyMode}
            type="expense"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <WealthDistributionChart
            data={charts.netWorthByTypeData}
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
          <SpendingBreakdownChart
            data={charts.categoryData}
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="grid gap-6">
          <SankeyChart
            data={charts.sankeyCategoryData}
            title="Category Net Flow"
            description="Income Sources vs Expense Destinations"
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
        </div>

        <AccountDetailModal
          detailModal={detailModal}
          setDetailModal={setDetailModal}
          accounts={accounts}
          formatCurrency={formatCurrency}
          onNavigateToPortfolio={() => setLocation('/portfolio')}
        />

        <TransactionForm
          isOpen={isTransactionOpen}
          onOpenChange={setIsTransactionOpen}
          onSubmit={onTransactionSubmit}
          initialData={null}
          accounts={accounts}
          categories={categories}
          isEditing={false}
        />

        <TransferForm
          isOpen={isTransferOpen}
          onOpenChange={setIsTransferOpen}
          onSubmit={onTransferSubmit}
          accounts={accounts}
        />

        <AddTradeModal
          isOpen={isAddTradeOpen}
          onOpenChange={setIsAddTradeOpen}
          accounts={investmentAccounts}
          holdings={holdings}
        />

        <ImportedTransactions
          isOpen={isReviewStagingOpen}
          onOpenChange={setIsReviewStagingOpen}
          accountId={null} // All accounts
        />

        <MissingRecurringTransactionsModal
          isOpen={isMissingRecurringOpen}
          onOpenChange={setIsMissingRecurringOpen}
        />
      </div>
    </Layout>
  );
}
