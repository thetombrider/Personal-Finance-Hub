import type { Express } from "express";
import { storage } from "../storage";
import { gocardlessService } from "../services/gocardless";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";
import "./types";

/**
 * Validate redirect URL against allowed hosts.
 * Returns true if the URL is safe to redirect to.
 * 
 * SECURITY: We allow relative URLs and same-host URLs.
 * For stricter control, configure ALLOWED_REDIRECT_HOSTS environment variable.
 */
function isValidRedirectUrl(redirectUrl: string, requestHost: string | undefined): boolean {
    // Allow relative URLs
    if (redirectUrl.startsWith("/")) {
        return true;
    }

    try {
        const parsed = new URL(redirectUrl);

        // Check against explicit whitelist if configured
        const allowedHosts = process.env.ALLOWED_REDIRECT_HOSTS;
        if (allowedHosts) {
            const hostList = allowedHosts.split(",").map(h => h.trim().toLowerCase());
            return hostList.includes(parsed.host.toLowerCase());
        }

        // Fall back to same-host check
        if (requestHost && parsed.host.toLowerCase() === requestHost.toLowerCase()) {
            return true;
        }

        return false;
    } catch {
        return false;
    }
}

export function registerGoCardlessRoutes(app: Express) {
    // ============ GOCARDLESS BANK CONNECTIONS ============

    app.get("/api/gocardless/banks", async (req, res) => {
        try {
            const country = (req.query.country as string) || "IT";
            const banks = await gocardlessService.listInstitutions(country);
            res.json(banks);
        } catch (error) {
            console.error("Error fetching banks:", error);
            res.status(500).json({ error: "Failed to fetch banks" });
        }
    });

    app.post("/api/gocardless/connect", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const schema = z.object({
                institutionId: z.string(),
                redirectUrl: z.string().url(),
            });

            const { institutionId, redirectUrl } = schema.parse(req.body);

            // Security: Validate redirect URL to prevent open redirect attacks
            if (!isValidRedirectUrl(redirectUrl, req.get("host"))) {
                console.warn(`[GoCardless] Blocked redirect: ${redirectUrl}`);
                return res.status(400).json({
                    error: "Invalid redirect URL",
                    details: "Redirect URL must be a relative path or point to an allowed host.",
                });
            }

            const result = await gocardlessService.createRequisition(req.user.id, institutionId, redirectUrl);
            res.json(result);
        } catch (error: any) {
            console.error("Error creating bank connection:", error);
            if (error.response?.data) {
                console.error("GoCardless error details:", error.response.data);
            }
            res.status(500).json({ error: "Failed to create bank connection" });
        }
    });

    app.post("/api/gocardless/callback", async (req, res) => {
        try {
            const schema = z.object({
                requisitionId: z.string(),
            });

            const { requisitionId } = schema.parse(req.body);

            const result = await gocardlessService.handleCallback(requisitionId);
            res.json(result);
        } catch (error: any) {
            console.error("Error completing bank connection:", error);
            const status = error.status || 500;
            res.status(status).json({
                error: error.message || "Failed to complete bank connection",
                code: error.code
            });
        }
    });

    app.get("/api/gocardless/connections", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const connections = await storage.getBankConnections(req.user.id);
            res.json(connections);
        } catch (error) {
            console.error("Error fetching connections:", error);
            res.status(500).json({ error: "Failed to fetch bank connections" });
        }
    });

    app.delete("/api/gocardless/connections/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            // Verify ownership
            const connections = await storage.getBankConnections(req.user.id);
            const connection = connections.find(c => c.id === id);
            if (!connection) {
                return res.status(404).json({ error: "Connection not found" });
            }

            await storage.deleteBankConnection(id);
            res.status(204).send();
        } catch (error) {
            console.error("Error deleting connection:", error);
            res.status(500).json({ error: "Failed to delete bank connection" });
        }
    });

    app.post("/api/gocardless/sync/:accountId", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const accountId = parseNumericParam(req.params.accountId);
            if (accountId === null) return res.status(400).json({ error: "Invalid accountId" });

            // Verify account ownership
            const account = await storage.getAccount(accountId);
            if (!account) {
                return res.status(404).json({ error: "Account not found" });
            }
            if (!checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }
            if (!account.gocardlessAccountId) {
                return res.status(400).json({ error: "Account is not linked to GoCardless" });
            }

            // Parse optional bookDirectly flag from body
            const bookDirectly = req.body?.bookDirectly === true;

            const result = await gocardlessService.syncTransactions(req.user.id, accountId, bookDirectly);
            await gocardlessService.syncBalances(accountId);
            res.json(result);
        } catch (error: any) {
            console.error("Error syncing transactions:", error);
            if (error.status === 429) {
                return res.status(429).json({ error: "Rate limit reached. Please try again later." });
            }
            res.status(500).json({ error: error.message || "Failed to sync transactions" });
        }
    });

    // Renew expired/expiring connection
    app.post("/api/gocardless/renew/:connectionId", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const schema = z.object({
                redirectUrl: z.string().url(),
            });
            const { redirectUrl } = schema.parse(req.body);

            // Validate redirect URL
            if (!isValidRedirectUrl(redirectUrl, req.get("host"))) {
                return res.status(400).json({ error: "Invalid redirect URL" });
            }

            const connectionId = parseNumericParam(req.params.connectionId);
            if (connectionId === null) return res.status(400).json({ error: "Invalid connectionId" });

            // Verify ownership
            const connections = await storage.getBankConnections(req.user.id);
            const connection = connections.find(c => c.id === connectionId);
            if (!connection) {
                return res.status(404).json({ error: "Connection not found" });
            }

            const result = await gocardlessService.createRequisition(req.user.id, connection.institutionId, redirectUrl);
            res.json(result);
        } catch (error: any) {
            console.error("Error renewing connection:", error);
            res.status(500).json({ error: error.message || "Failed to renew connection" });
        }
    });

    app.post("/api/gocardless/accounts/link", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const schema = z.object({
                accountId: z.number(),
                gocardlessAccountId: z.string(),
                bankConnectionId: z.number().optional(),
            });

            const { accountId, gocardlessAccountId, bankConnectionId } = schema.parse(req.body);

            // Verify ownership of the local account
            const account = await storage.getAccount(accountId);
            if (!account) {
                return res.status(404).json({ error: "Account not found" });
            }
            if (!checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // Update the account with the GoCardless details
            const updated = await storage.updateAccount(accountId, {
                gocardlessAccountId,
                bankConnectionId,
            });

            // Note: Initial sync is now triggered by the client to show progress

            res.json(updated);
        } catch (error: any) {
            console.error("Error linking account:", error);
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to link account" });
        }
    });
}

