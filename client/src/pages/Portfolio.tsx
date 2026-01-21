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
  const [isEditingHolding, setIsEditingHolding] = useState(false);

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
      <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
        <div className="flex-none flex items-center justify-between">
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

        <div className="flex-none">
          <PortfolioSummary portfolioSummary={portfolioSummary} />
        </div>

        <Tabs defaultValue="holdings" className="flex-1 flex flex-col min-h-0 gap-4">
          <TabsList className="flex-none w-auto self-start">
            <TabsTrigger value="holdings" data-testid="tab-holdings">Holdings</TabsTrigger>
            <TabsTrigger value="trades" data-testid="tab-trades">Transaction History</TabsTrigger>
          </TabsList>

          <TabsContent value="holdings" className="flex-1 overflow-auto min-h-0">
            <HoldingsTable
              holdingsWithStats={holdingsWithStats}
              onSelectHolding={(h) => {
                setIsEditingHolding(false);
                setSelectedHoldingForDetail(h);
              }}
              onEditHolding={(h) => {
                setIsEditingHolding(true);
                setSelectedHoldingForDetail(h);
              }}
            />
          </TabsContent>

          <TabsContent value="trades" className="flex-1 flex flex-col min-h-0">
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
          onClose={() => {
            setSelectedHoldingForDetail(null);
            setIsEditingHolding(false);
          }}
          holding={selectedHoldingForDetail}
          trades={trades.filter(t => t.holdingId === selectedHoldingForDetail.id)}
          initialIsEditing={isEditingHolding}
        />
      )}
    </Layout>
  );
}
