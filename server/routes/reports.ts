import type { Express } from "express";
import { ReportService } from "../services/reports";
import { storage } from "../storage";
import { marketDataService } from "../services/marketData";
import { sendEmail } from "../resend";
import cron, { ScheduledTask } from "node-cron";
import { logger } from "../lib/logger";
import "./types";

// Module-level variable to prevent duplicate cron scheduling
let weeklyReportJob: ScheduledTask | null = null;

export function registerReportRoutes(app: Express) {
    // ============ REPORTS ============

    const reportService = new ReportService(storage, marketDataService);

    app.get("/api/reports/income-statement/:year/:month", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

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

            const data = await reportService.getMonthlyIncomeStatement(req.user.id, year, month);
            res.json(data);
        } catch (error) {
            logger.api.error("Failed to fetch income statement:", error);
            res.status(500).json({ error: "Failed to fetch income statement" });
        }
    });

    app.get("/api/reports/balance-sheet", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const data = await reportService.getBalanceSheet(req.user.id);
            res.json(data);
        } catch (error) {
            logger.api.error("Failed to fetch balance sheet:", error);
            res.status(500).json({ error: "Failed to fetch balance sheet" });
        }
    });

    // ============ WEEKLY REPORT EMAIL ============

    app.post("/api/reports/weekly/send", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            // Use authenticated user's email, fall back to provided email
            const email = req.body.email || req.user.email;
            if (!email) {
                return res.status(400).json({ error: "Email address is required" });
            }
            const data = await reportService.getWeeklyReportData(req.user.id);
            const html = reportService.generateHtml(data);

            const now = new Date();
            // DST-safe week calculation using calendar arithmetic
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - 7);

            const subject = `📊 Report Settimanale FinTrack - ${weekStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} / ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;

            const result = await sendEmail(email, subject, html);

            logger.api.info(`Weekly report sent to ${email}`);
            res.json({ success: true, result });
        } catch (error: any) {
            logger.api.error("Error sending weekly report:", error);
            res.status(500).json({ error: error.message || "Failed to send report" });
        }
    });

    app.get("/api/reports/weekly/preview", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const data = await reportService.getWeeklyReportData(req.user.id);
            const html = reportService.generateHtml(data);
            res.send(html);
        } catch (error) {
            logger.api.error("Error generating report preview:", error);
            res.status(500).json({ error: "Failed to generate report" });
        }
    });

    // Weekly report scheduler - Runs every Sunday at 9:00 AM Europe/Rome
    // Guard against duplicate scheduling
    if (!weeklyReportJob) {
        weeklyReportJob = cron.schedule('0 9 * * 0', async () => {
            logger.scheduler.info("Sending weekly report...");
            try {
                // Get all users with email addresses and send reports
                // Get all users with email addresses and send reports
                const users = await storage.getAllUsers();
                logger.scheduler.info(`Found ${users.length} users to process.`);

                for (const user of users) {
                    if (!user.email) {
                        logger.scheduler.info(`Skipping user ${user.username} (no email)`);
                        continue;
                    }

                    try {
                        const data = await reportService.getWeeklyReportData(user.id);
                        const html = reportService.generateHtml(data);
                        const now = new Date();
                        await sendEmail(
                            user.email,
                            `📊 Report Settimanale FinTrack - ${now.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}`,
                            html
                        );
                        logger.scheduler.info(`Weekly report sent successfully to ${user.email}`);
                    } catch (err) {
                        logger.scheduler.error(`Failed to send report to ${user.email}:`, err);
                    }
                }
            } catch (error) {
                logger.scheduler.error("Failed to send weekly report:", error);
            }
        }, {
            timezone: "Europe/Rome"
        });
    }
}

/**
 * Stop the weekly report scheduler (for testing/cleanup)
 */
export function stopReportScheduler(): void {
    if (weeklyReportJob) {
        weeklyReportJob.stop();
        weeklyReportJob = null;
    }
}

