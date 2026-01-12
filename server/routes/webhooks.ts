import type { Express } from "express";
import { storage } from "../storage";
import { WebhookService } from "../services/webhook-base";
import { TallyProcessor } from "../services/tally";
import { insertWebhookSchema } from "@shared/schema";
import { z } from "zod";
import "./types";

// Initialize webhook service with processors
const webhookService = new WebhookService(storage);
webhookService.registerProcessor(new TallyProcessor());

export function registerWebhookRoutes(app: Express) {
    // ============ WEBHOOK CRUD (Authenticated) ============

    // List user's webhooks
    app.get("/api/webhooks", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const webhooks = await storage.getWebhooks(req.user.id);
            // Don't expose secrets in list
            const sanitized = webhooks.map(w => ({ ...w, secret: w.secret ? "********" : null }));
            res.json(sanitized);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch webhooks" });
        }
    });

    // Get webhook details
    app.get("/api/webhooks/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const webhook = await storage.getWebhook(req.params.id);
            if (!webhook) {
                return res.status(404).json({ error: "Webhook not found" });
            }
            if (webhook.userId !== req.user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // Sanitize secret
            res.json({ ...webhook, secret: webhook.secret ? "********" : null });
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch webhook" });
        }
    });

    // Create webhook
    app.post("/api/webhooks", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const validated = insertWebhookSchema.parse({
                ...req.body,
                userId: req.user.id,
            });

            // Verify the webhook type is supported
            if (!webhookService.getProcessor(validated.type)) {
                return res.status(400).json({
                    error: `Unsupported webhook type: ${validated.type}`,
                    supportedTypes: ["tally"]
                });
            }

            const webhook = await storage.createWebhook(validated);
            res.status(201).json({
                ...webhook,
                secret: webhook.secret ? "********" : null,
                webhookUrl: `/api/webhooks/${webhook.id}`,
            });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create webhook" });
        }
    });

    // Update webhook
    app.patch("/api/webhooks/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const existing = await storage.getWebhook(req.params.id);
            if (!existing) {
                return res.status(404).json({ error: "Webhook not found" });
            }
            if (existing.userId !== req.user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const validated = insertWebhookSchema.partial().omit({ userId: true }).parse(req.body);
            const webhook = await storage.updateWebhook(req.params.id, validated);

            if (!webhook) {
                return res.status(404).json({ error: "Webhook not found" });
            }

            res.json({ ...webhook, secret: webhook.secret ? "********" : null });
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update webhook" });
        }
    });

    // Delete webhook
    app.delete("/api/webhooks/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const existing = await storage.getWebhook(req.params.id);
            if (!existing) {
                return res.status(404).json({ error: "Webhook not found" });
            }
            if (existing.userId !== req.user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await storage.deleteWebhook(req.params.id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete webhook" });
        }
    });

    // Get webhook logs
    app.get("/api/webhooks/:id/logs", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const webhook = await storage.getWebhook(req.params.id);
            if (!webhook) {
                return res.status(404).json({ error: "Webhook not found" });
            }
            if (webhook.userId !== req.user.id) {
                return res.status(403).json({ error: "Forbidden" });
            }

            const parsedLimit = parseInt(req.query.limit as string);
            const limit = Math.max(1, Math.min(isNaN(parsedLimit) ? 50 : parsedLimit, 100));
            const logs = await storage.getWebhookLogs(req.params.id, limit);
            res.json(logs);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch webhook logs" });
        }
    });

    // ============ WEBHOOK RECEIVER (No Auth - uses webhook ID for security) ============

    // Main webhook receiver endpoint
    app.post("/api/webhooks/:id", async (req, res) => {
        try {
            console.log(`Webhook received for ID: ${req.params.id}`);

            // Get raw body for signature verification
            const rawBody = (req as any).rawBody || JSON.stringify(req.body);

            // Get signature from headers (support multiple formats)
            const signature = (req.headers['x-signature'] ||
                req.headers['x-webhook-signature'] ||
                req.headers['tally-signature']) as string | undefined;

            const result = await webhookService.processWebhook(
                req.params.id,
                req.body,
                rawBody,
                signature
            );

            res.status(result.status).json(result.body);
        } catch (error) {
            console.error("Webhook receiver error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    });

    // ============ LEGACY TALLY ENDPOINT (Deprecated) ============

    // Keep the old endpoint for backward compatibility
    // This will be removed in a future version
    app.post("/api/webhooks/tally", async (req, res) => {
        console.warn("DEPRECATED: /api/webhooks/tally is deprecated. Please use /api/webhooks/:id instead.");

        // For legacy support, we need to find or create a default webhook for this
        // This is a simplified fallback - in production, users should migrate to new URLs
        res.status(410).json({
            error: "This endpoint is deprecated",
            message: "Please create a webhook using the new API and use /api/webhooks/:id instead",
            documentation: "Create a webhook via POST /api/webhooks with { name: 'My Tally Form', type: 'tally' }"
        });
    });

    // GET endpoint for webhook status/info
    app.get("/api/webhooks/:id/status", async (req, res) => {
        const webhook = await storage.getWebhook(req.params.id);
        if (!webhook) {
            return res.status(404).json({ error: "Webhook not found" });
        }

        // Get user's accounts and categories for setup help
        const accounts = await storage.getAccounts(webhook.userId);
        const categories = await storage.getCategories(webhook.userId);

        res.json({
            status: webhook.active ? "active" : "disabled",
            type: webhook.type,
            lastUsed: webhook.lastUsedAt,
            instructions: {
                method: "POST",
                contentType: "application/json",
                expectedFields: [
                    "Date (or Data) - DD/MM/YYYY format",
                    "Descrizione (or Description) - transaction description",
                    "Importo Entrata - income amount",
                    "Importo Uscita - expense amount",
                    "Conto (or Account) - account name",
                    "Categoria (or Category) - category name"
                ],
                availableAccounts: accounts.map(a => a.name),
                availableCategories: categories.map(c => ({ name: c.name, type: c.type }))
            }
        });
    });
}
