
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { Account, Category } from "@/context/FinanceContext";

interface DashboardHeaderProps {
    accounts: Account[];
    categories: Category[];
    selectedAccount: string;
    setSelectedAccount: (value: string) => void;
    selectedCategory: string;
    setSelectedCategory: (value: string) => void;
    timeRange: string;
    setTimeRange: (value: string) => void;
    privacyMode: boolean;
    setPrivacyMode: (value: boolean) => void;
}

export function DashboardHeader({
    accounts,
    categories,
    selectedAccount,
    setSelectedAccount,
    selectedCategory,
    setSelectedCategory,
    timeRange,
    setTimeRange,
    privacyMode,
    setPrivacyMode
}: DashboardHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-3xl font-heading font-bold text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">Overview of your financial health</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-card border border-border p-1">
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                        <SelectTrigger className="w-[160px] border-none bg-transparent shadow-none focus:ring-0" data-testid="select-account-filter">
                            <SelectValue placeholder="All Accounts" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Accounts</SelectItem>
                            {accounts.map(acc => (
                                <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="bg-card border border-border p-1">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-[160px] border-none bg-transparent shadow-none focus:ring-0" data-testid="select-category-filter">
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.filter(c => c.name.toLowerCase() !== 'trasferimenti').map(cat => (
                                <SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
                    <TabsList className="h-9">
                        <TabsTrigger value="3" className="text-xs px-3">3M</TabsTrigger>
                        <TabsTrigger value="6" className="text-xs px-3">6M</TabsTrigger>
                        <TabsTrigger value="12" className="text-xs px-3">1Y</TabsTrigger>
                    </TabsList>
                </Tabs>
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
