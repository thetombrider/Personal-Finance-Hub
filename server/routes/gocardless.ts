import type { Express } from "express";
import { storage } from "../storage";
import { gocardlessService } from "../services/gocardless";
import { z } from "zod";

export function registerGoCardlessRoutes(app: Express) {
    // ============ GOCARDLESS ============

    app.post("/api/gocardless/institutions", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const { country } = req.body;
            if (!country || typeof country !== "string" || country.length !== 2) {
                return res.status(400).json({ error: "Invalid country code. Expected ISO 2-letter code." });
            }

            const institutions = await gocardlessService.listInstitutions(country);
            res.json(institutions);
        } catch (error) {
            console.error("GoCardless institutions error:", error);
            res.status(500).json({ error: "Failed to fetch institutions" });
        }
    });

    app.post("/api/gocardless/requisition", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = (req.user as any).id;

            const { institutionId, redirectUrl } = req.body;

            if (!redirectUrl || typeof redirectUrl !== "string") {
                return res.status(400).json({ error: "Missing or invalid redirectUrl" });
            }

            // Security Check: Open Redirect Protection
            try {
                const requestHost = req.get("host"); // e.g. localhost:5000 or myapp.com
                const validOrigin = requestHost;
                const parsedUrl = new URL(redirectUrl);

                if (parsedUrl.host !== validOrigin) {
                    return res.status(400).json({ error: "Invalid redirect URL: Domain mismatch" });
                }
            } catch (e) {
                return res.status(400).json({ error: "Invalid redirect URL format" });
            }

            const result = await gocardlessService.createRequisition(userId, institutionId, redirectUrl);
            res.json(result);
        } catch (error: any) {
            console.error("GoCardless requisition error:", JSON.stringify(error.response?.data || error, null, 2));
            res.status(500).json({ error: "Failed to create requisition. Check server logs." });
        }
    });

    app.post("/api/gocardless/requisition/complete", async (req, res) => {
        try {
            const { requisitionId } = req.body;
            const accounts = await gocardlessService.handleCallback(requisitionId);
            res.json(accounts);
        } catch (error: any) {
            console.error("GoCardless complete error:", error);
            const status = error.status || 500;
            res.status(status).json({
                error: error.message || "Failed to complete requisition",
                code: error.code
            });
        }
    });

    app.post("/api/gocardless/accounts/link", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = (req.user as any).id;

            const schema = z.object({
                accountId: z.number().int().positive(),
                gocardlessAccountId: z.string().min(1),
                bankConnectionId: z.number().int().optional().nullable()
            });

            const { accountId, gocardlessAccountId, bankConnectionId } = schema.parse(req.body);

            // Verify the account exists and user has access to it
            const account = await storage.getAccount(accountId);
            if (!account) {
                return res.status(404).json({ error: "Account not found" });
            }

            await storage.updateAccount(accountId, { gocardlessAccountId, bankConnectionId });
            res.json({ success: true });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error("GoCardless link error:", error);
            res.status(500).json({ error: "Failed to link account" });
        }
    });

    app.get("/api/gocardless/connections", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = (req.user as any).id;
            const connections = await storage.getBankConnections(userId);
            res.json(connections);
        } catch (error) {
            console.error("Fetch connections error:", error);
            res.status(500).json({ error: "Failed to fetch bank connections" });
        }
    });

    app.delete("/api/gocardless/connections/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const id = parseInt(req.params.id);

            await storage.deleteBankConnection(id);
            res.status(204).send();
        } catch (error) {
            console.error("Delete connection error:", error);
            res.status(500).json({ error: "Failed to delete bank connection" });
        }
    });

    app.post("/api/gocardless/sync", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = (req.user as any).id;
            const { accountId } = req.body;

            // 1. Input Validation
            if (!accountId || typeof accountId !== "number") {
                return res.status(400).json({ error: "Invalid or missing accountId" });
            }

            // 2. Account Lookup & Existence Check
            const account = await storage.getAccount(accountId);
            if (!account) {
                return res.status(404).json({ error: "Account not found" });
            }

            // 3. Link Verification
            if (!account.gocardlessAccountId) {
                return res.status(400).json({ error: "Account is not linked to GoCardless" });
            }

            const result = await gocardlessService.syncTransactions(userId, accountId);
            await gocardlessService.syncBalances(accountId);
            res.json(result);
        } catch (error: any) {
            console.error("GoCardless sync error:", error);
            if (error.status === 429) {
                return res.status(429).json({ error: "Rate limit reached. Please try again later." });
            }
            res.status(500).json({ error: "Failed to sync transactions" });
        }
    });
}
