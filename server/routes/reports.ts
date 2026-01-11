import type { Express } from "express";
import { ReportService } from "../services/reportService";
import { storage } from "../storage";
import { marketDataService } from "../services/marketData";
import { sendEmail } from "../resend";
import cron from "node-cron";

export function registerReportRoutes(app: Express) {
    // ============ REPORTS ============

    const reportService = new ReportService(storage, marketDataService);

    app.get("/api/reports/income-statement/:year/:month", async (req, res) => {
        try {
            const year = parseInt(req.params.year, 10);
            const month = parseInt(req.params.month, 10);

            const currentYear = new Date().getFullYear();
            if (
                !Number.isInteger(year) ||
                !Number.isInteger(month) ||
                month < 0 ||
                month > 12 ||
                year < 1970 ||
                year > currentYear + 1
            ) {
                return res.status(400).json({ error: "Invalid year or month" });
            }

            const data = await reportService.getMonthlyIncomeStatement((req.user as any).id, year, month);
            res.json(data);
        } catch (error) {
            console.error("Failed to fetch income statement:", error);
            res.status(500).json({ error: "Failed to fetch income statement" });
        }
    });

    app.get("/api/reports/balance-sheet", async (req, res) => {
        try {
            const data = await reportService.getBalanceSheet((req.user as any).id);
            res.json(data);
        } catch (error) {
            console.error("Failed to fetch balance sheet:", error);
            res.status(500).json({ error: "Failed to fetch balance sheet" });
        }
    });

    // ============ WEEKLY REPORT EMAIL ============

    app.post("/api/reports/weekly/send", async (req, res) => {
        try {
            const email = req.body.email;
            if (!email) {
                return res.status(400).json({ error: "Email address is required" });
            }
            const data = await reportService.getWeeklyReportData((req.user as any).id);
            const html = reportService.generateHtml(data);

            const now = new Date();
            const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const subject = `📊 Report Settimanale FinTrack - ${weekStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} / ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;

            const result = await sendEmail(email, subject, html);

            console.log(`[email] Weekly report sent to ${email}`);
            res.json({ success: true, result });
        } catch (error: any) {
            console.error("Error sending weekly report:", error);
            res.status(500).json({ error: error.message || "Failed to send report" });
        }
    });

    app.get("/api/reports/weekly/preview", async (req, res) => {
        try {
            const data = await reportService.getWeeklyReportData((req.user as any).id);
            const html = reportService.generateHtml(data);
            res.send(html);
        } catch (error) {
            console.error("Error generating report preview:", error);
            res.status(500).json({ error: "Failed to generate report" });
        }
    });

    // Weekly report scheduler - Runs every Sunday at 9:00 AM Europe/Rome
    // Note: Cron jobs are global. If this function is called multiple times (e.g. during tests or re-initializations)
    // it might schedule multiple jobs. But in this architecture it should be fine as routes are registered once.
    cron.schedule('0 9 * * 0', async () => {
        console.log("[scheduler] Sending weekly report...");
        try {
            const email = "tommasominuto@gmail.com";
            const user = await storage.getUserByEmail(email);
            if (!user) {
                console.error("[scheduler] User not found for email:", email);
                return;
            }
            const data = await reportService.getWeeklyReportData(user.id);
            const html = reportService.generateHtml(data);
            const now = new Date();
            await sendEmail(
                "tommasominuto@gmail.com",
                `📊 Report Settimanale FinTrack - ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                html
            );
            console.log("[scheduler] Weekly report sent successfully");
        } catch (error) {
            console.error("[scheduler] Failed to send weekly report:", error);
        }
    }, {
        timezone: "Europe/Rome"
    });
}
