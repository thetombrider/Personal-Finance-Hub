import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Plus, ArrowLeftRight, TrendingUp, List, CalendarClock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardHeaderProps {
    privacyMode: boolean;
    setPrivacyMode: (value: boolean) => void;
    onNewTransaction: () => void;
    onNewTransfer: () => void;
    onNewTrade: () => void;
    onReviewStaging: () => void;
    pendingStagingCount: number;
    onReviewRecurring?: () => void;
    missingRecurringCount?: number;
}

export function DashboardHeader({
    privacyMode,
    setPrivacyMode,
    onNewTransaction,
    onNewTransfer,
    onNewTrade,
    onReviewStaging,
    pendingStagingCount,
    onReviewRecurring,
    missingRecurringCount
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your financial health</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2 mr-2 border-r pr-4">
                    <Button variant="outline" size="sm" onClick={onNewTransaction} title="New Transaction">
                        <Plus className="mr-2 h-4 w-4" /> Transaction
                    </Button>
                    <Button variant="outline" size="sm" onClick={onNewTransfer} title="New Transfer">
                        <ArrowLeftRight className="mr-2 h-4 w-4" /> Transfer
                    </Button>
                    <Button variant="outline" size="sm" onClick={onNewTrade} title="New Portfolio Trade">
                        <TrendingUp className="mr-2 h-4 w-4" /> Trade
                    </Button>
                    <Button variant="outline" size="sm" onClick={onReviewStaging} title="Review Staging" className="relative">
                        <List className="mr-2 h-4 w-4" /> Review
                        {pendingStagingCount > 0 && (
                            <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 h-5 text-xs">
                                {pendingStagingCount}
                            </Badge>
                        )}
                    </Button>
                    {missingRecurringCount !== undefined && missingRecurringCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onReviewRecurring}
                            title="Missing Recurring Transactions"
                            className="relative border-amber-500 text-amber-600 hover:bg-amber-50 hover:text-amber-700 dark:border-amber-400 dark:text-amber-400 dark:hover:bg-amber-950/30"
                        >
                            <CalendarClock className="mr-2 h-4 w-4" /> Recurring
                            <Badge className="ml-2 px-1.5 py-0.5 h-5 text-xs bg-amber-500 hover:bg-amber-600 text-white border-none">
                                {missingRecurringCount}
                            </Badge>
                        </Button>
                    )}
                </div>

                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPrivacyMode(!privacyMode)}
                    data-testid="button-privacy-toggle"
                    title={privacyMode ? "Show amounts" : "Hide amounts"}
                >
                    {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        </div>
    );
}
