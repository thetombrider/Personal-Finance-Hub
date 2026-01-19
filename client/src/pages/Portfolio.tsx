import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Plus } from "lucide-react";
import * as api from "@/lib/api";
import type { Account } from "@shared/schema";
import { StockDetailModal } from "@/components/portfolio/StockDetailModal";
import { usePortfolioStats, type HoldingWithStats } from "@/hooks/usePortfolioStats";
import { PortfolioSummary } from "@/components/portfolio/PortfolioSummary";
import { HoldingsTable } from "@/components/portfolio/HoldingsTable";
import { TransactionsHistory } from "@/components/portfolio/TransactionsHistory";
import { AddTradeModal } from "@/components/portfolio/AddTradeModal";

export default function Portfolio() {
  const [isAddTradeOpen, setIsAddTradeOpen] = useState(false);
  const [selectedHoldingForDetail, setSelectedHoldingForDetail] = useState<HoldingWithStats | null>(null);

  const { data: accountsData } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.fetchAccounts
  });

  const investmentAccounts = accountsData?.filter((a: Account) => a.type === "investment") || [];

  const {
    holdings,
    trades,
    holdingsWithStats,
    portfolioSummary,
    refreshQuotes,
    isRefreshingQuotes,
    isLoading: isLoadingPortfolio
  } = usePortfolioStats();

  if (isLoadingPortfolio) {
    return (
      <Layout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Investment Portfolio</h1>
            <p className="text-muted-foreground">Track your investments</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refreshQuotes(true)}
              disabled={isRefreshingQuotes}
              data-testid="button-refresh-quotes"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshingQuotes ? "animate-spin" : ""}`} />
              Aggiorna Prezzi
            </Button>
            <Button onClick={() => setIsAddTradeOpen(true)} data-testid="button-new-transaction">
              <Plus className="mr-2 h-4 w-4" />
              New Transaction
            </Button>
          </div>
        </div>

        <PortfolioSummary portfolioSummary={portfolioSummary} />

        <Tabs defaultValue="holdings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="holdings" data-testid="tab-holdings">Holdings</TabsTrigger>
            <TabsTrigger value="trades" data-testid="tab-trades">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings">
            <HoldingsTable
              holdingsWithStats={holdingsWithStats}
              onSelectHolding={setSelectedHoldingForDetail}
            />
          </TabsContent>

          <TabsContent value="trades">
            <TransactionsHistory
              trades={trades}
              holdings={holdings}
              accounts={investmentAccounts}
            />
          </TabsContent>
        </Tabs>
      </div>

      <AddTradeModal
        isOpen={isAddTradeOpen}
        onOpenChange={setIsAddTradeOpen}
        accounts={investmentAccounts}
        holdings={holdings}
      />

      {selectedHoldingForDetail && (
        <StockDetailModal
          isOpen={!!selectedHoldingForDetail}
          onClose={() => setSelectedHoldingForDetail(null)}
          holding={selectedHoldingForDetail}
          trades={trades.filter(t => t.holdingId === selectedHoldingForDetail.id)}
        />
      )}
    </Layout>
  );
}
