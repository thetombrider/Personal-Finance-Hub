import { Link2, Building2, FileSpreadsheet, Webhook, Mail } from "lucide-react";

export function IntegrationsStep() {
    const integrations = [
        {
            icon: Building2,
            title: "Bank Sync",
            description: "Connect to 2,000+ banks via GoCardless. Transactions import to a staging area for your review before booking.",
        },
        {
            icon: FileSpreadsheet,
            title: "CSV Import",
            description: "Bulk import transactions, trades, and holdings from spreadsheets with smart column mapping.",
        },
        {
            icon: Webhook,
            title: "Webhooks",
            description: "Connect external services like Tally forms, n8n, Make, or Zapier to log expenses automatically.",
        },
        {
            icon: Mail,
            title: "Email Reports",
            description: "Get automated weekly email summaries with financial insights sent to your inbox.",
        },
    ];

    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <h2 className="text-xl font-bold flex items-center gap-2">
                    <Link2 className="h-5 w-5 text-primary" />
                    Integrations & Reports
                </h2>
                <p className="text-muted-foreground">
                    Connect your banks, import data, and automate your finance tracking with powerful integrations.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {integrations.map((item) => (
                    <div
                        key={item.title}
                        className="flex flex-col p-4 rounded-xl border bg-card hover:bg-accent/5 transition-colors"
                    >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mb-3">
                            <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-muted/50 border rounded-xl p-4">
                <p className="text-sm text-muted-foreground text-center">
                    <span className="font-semibold text-foreground">Reports available:</span>{" "}
                    Net Worth History, Monthly Report, Income Statement, and Balance Sheet.
                </p>
            </div>
        </div>
    );
}
