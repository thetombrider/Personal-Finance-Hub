import type { Express } from "express";
import { storage } from "../storage";
import * as XLSX from "xlsx";

export function registerDataRoutes(app: Express) {
    // ============ EXPORT DATA ============
    app.get("/api/export-data", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = (req.user as any).id;

            const data = await storage.exportUserData(userId);
            const workbook = XLSX.utils.book_new();

            // Create a sheet for each table
            for (const [tableName, rows] of Object.entries(data)) {
                // @ts-ignore
                const worksheet = XLSX.utils.json_to_sheet(rows);
                XLSX.utils.book_append_sheet(workbook, worksheet, tableName);
            }

            const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

            res.setHeader("Content-Disposition", `attachment; filename="fintrack_export_${new Date().toISOString().split('T')[0]}.xlsx"`);
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.send(buffer);
        } catch (error) {
            console.error("Export error:", error);
            res.status(500).json({ error: "Failed to export data" });
        }
    });
}
