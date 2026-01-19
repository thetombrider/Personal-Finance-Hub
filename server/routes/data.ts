import type { Express } from "express";
import { storage } from "../storage";
import * as XLSX from "xlsx";
import "./types";

/**
 * Sanitize sheet name for Excel (max 31 chars, no special characters)
 */
function sanitizeSheetName(name: string): string {
    return name.replace(/[\\\/\?\*\:\[\]]/g, '_').slice(0, 31);
}

export function registerDataRoutes(app: Express) {
    // ============ EXPORT DATA ============
    app.get("/api/export-data", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = req.user.id;

            // Parse table request
            const type = req.query.type as string | undefined;
            const tables = type ? type.split(',') : undefined;

            const data = await storage.exportUserData(userId, tables);
            const workbook = XLSX.utils.book_new();

            // Create a sheet for each table
            for (const [tableName, rows] of Object.entries(data)) {
                const worksheet = XLSX.utils.json_to_sheet(rows as Record<string, unknown>[]);
                XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName(tableName));
            }

            const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

            const dateStr = new Date().toISOString().split('T')[0];
            let filenameSuffix = "full";

            if (req.query.type) {
                const typeStr = req.query.type as string;

                // Map specific combinations from frontend to clean filenames
                if (typeStr === 'Transactions,ImportStaging') {
                    filenameSuffix = 'transactions';
                } else if (typeStr === 'MonthlyBudgets,PlannedExpenses') {
                    filenameSuffix = 'budgets';
                } else if (typeStr === 'RecurringExpenses,RecurringExpenseChecks') {
                    filenameSuffix = 'recurring_expenses';
                } else if (typeStr === 'Holdings,Trades') {
                    filenameSuffix = 'portfolio';
                } else if (typeStr.includes(',')) {
                    filenameSuffix = "custom";
                } else {
                    // Convert "MonthlyBudgets" -> "monthly_budgets" (snake_case)
                    filenameSuffix = typeStr.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
                }
            }

            res.setHeader("Content-Disposition", `attachment; filename="fintrack_export_${filenameSuffix}_${dateStr}.xlsx"`);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.send(buffer);
        } catch (error) {
            // Structured logging - avoid logging full error object which may contain sensitive data
            console.error("Export error:", error instanceof Error ? error.message : "Unknown error");
            res.status(500).json({ error: "Failed to export data" });
        }
    });
}

