import { useEffect } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/Layout";
import { IncomeStatement } from "@/components/reports/IncomeStatement";
import { BalanceSheet } from "@/components/reports/BalanceSheet";

export default function Reports() {
    const [location, setLocation] = useLocation();

    // Default redirect if just /reports
    useEffect(() => {
        if (location === "/reports") {
            setLocation("/reports/income-statement");
        }
    }, [location, setLocation]);

    const isBalanceSheet = location === "/reports/balance-sheet";

    return (
        <Layout>
            <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                    <p className="text-muted-foreground mt-2">
                        Detailed financial analysis and balance sheet.
                    </p>
                </div>

                <div className="space-y-6 flex-1 overflow-auto min-h-0 pr-4">
                    {isBalanceSheet ? <BalanceSheet /> : <IncomeStatement />}
                </div>
            </div>
        </Layout>
    );
}
