import { storage } from "../server/storage";
import { ReportService } from "../server/services/reportService";
import { marketDataService } from "../server/services/marketData";

async function verifyReports() {
    try {
        console.log("Starting verification of Reports API...");

        const reportService = new ReportService(storage, marketDataService);
        const year = new Date().getFullYear();
        const month = new Date().getMonth() + 1;

        // 1. Verify Monthly Income Statement
        console.log(`\nVerifying Monthly Income Statement for ${month}/${year}...`);
        const incomeStatement = await reportService.getMonthlyIncomeStatement(year, month);

        if (!incomeStatement.items || !Array.isArray(incomeStatement.items)) {
            throw new Error("Income Statement items missing or invalid format.");
        }

        console.log("Income Statement Summary:", JSON.stringify(incomeStatement.summary, null, 2));
        console.log(`Income Statement Items Count: ${incomeStatement.items.length}`);

        // 2. Verify Balance Sheet
        console.log("\nVerifying Balance Sheet...");
        const balanceSheet = await reportService.getBalanceSheet();

        if (typeof balanceSheet.assets.total !== 'number' || typeof balanceSheet.liabilities.total !== 'number') {
            throw new Error("Balance Sheet totals missing or invalid format.");
        }

        console.log("Balance Sheet Assets:", JSON.stringify(balanceSheet.assets, null, 2));
        console.log("Balance Sheet Liabilities:", JSON.stringify(balanceSheet.liabilities, null, 2));
        console.log("Balance Sheet Equity:", JSON.stringify(balanceSheet.equity, null, 2));

        console.log("\nVerification SUCCESSFUL!");
        process.exit(0);
    } catch (error) {
        console.error("\nVerification FAILED:", error);
        process.exit(1);
    }
}

verifyReports();
