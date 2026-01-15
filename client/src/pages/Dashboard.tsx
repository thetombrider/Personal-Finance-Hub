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

export default function Dashboard() {
  const { accounts, transactions, categories, formatCurrency } = useFinance();
  const [, setLocation] = useLocation();
  const [timeRange, setTimeRange] = useState("12"); // months
  const [selectedAccount, setSelectedAccount] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [categoryTrendId, setCategoryTrendId] = useState<string>("");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [detailModal, setDetailModal] = useState<'total' | 'cash' | 'savings' | 'investments' | null>(null);

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
    },
    enabled: timeRange === "12" // Only fetch previous year if viewing 12 months
  });

  const { data: nextYearBudget } = useQuery({
    queryKey: ['budget', currentYear + 1],
    queryFn: async () => {
      const res = await fetch(`/api/budget/${currentYear + 1}`);
      if (!res.ok) throw new Error('Failed to fetch budget');
      return res.json();
    }
  });

  const { portfolioSummary, trades } = usePortfolioStats();

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
    timeRange,
    selectedAccount,
    selectedCategory,
    categoryTrendId,
    currentYearBudget,
    previousYearBudget,
    nextYearBudget,
    currentYear
  });

  return (
    <Layout>
      <div className="space-y-8">
        <DashboardHeader
          accounts={accounts}
          categories={categories}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          privacyMode={privacyMode}
          setPrivacyMode={setPrivacyMode}
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

        <div className="grid gap-6 md:grid-cols-7">
          <CashFlowChart
            data={charts.chartData}
            privacyMode={privacyMode}
            formatCurrency={formatCurrency}
          />
          <div className="md:col-span-3 space-y-6">
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

        <CategoryTrendChart
          data={charts.categoryTrendData}
          categoryTrendId={categoryTrendId}
          setCategoryTrendId={setCategoryTrendId}
          categories={categories}
          selectedCategoryForTrend={charts.selectedCategoryForTrend}
          privacyMode={privacyMode}
          formatCurrency={formatCurrency}
        />

        <AccountDetailModal
          detailModal={detailModal}
          setDetailModal={setDetailModal}
          accounts={accounts}
          formatCurrency={formatCurrency}
          onNavigateToPortfolio={() => setLocation('/portfolio')}
        />
      </div>
    </Layout>
  );
}
