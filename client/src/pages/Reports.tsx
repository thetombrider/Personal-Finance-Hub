import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Layout from "@/components/Layout";
import { IncomeStatement } from "@/components/reports/IncomeStatement";
import { BalanceSheet } from "@/components/reports/BalanceSheet";

export default function Reports() {
    const [activeTab, setActiveTab] = useState("income-statement");

    return (
        <Layout>
            <div className="flex flex-col gap-6 h-[calc(100vh-6rem)] md:h-[calc(100vh-4rem)]">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
                    <p className="text-muted-foreground mt-2">
                        Detailed financial analysis and balance sheet.
                    </p>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 flex flex-col flex-1 min-h-0">
                    <TabsList>
                        <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
                        <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
                    </TabsList>

                    <TabsContent value="income-statement" className="space-y-6 flex-1 overflow-auto min-h-0 pr-4">
                        <IncomeStatement />
                    </TabsContent>

                    <TabsContent value="balance-sheet" className="space-y-6 flex-1 overflow-auto min-h-0 pr-4">
                        <BalanceSheet />
                    </TabsContent>
                </Tabs>
            </div>
        </Layout>
    );
}
