import type { Express } from "express";
import { storage } from "../storage";
import { TallyService } from "../services/tally";

export function registerWebhookRoutes(app: Express) {
    // ============ TALLY WEBHOOK ============

    const tallyService = new TallyService(storage);

    app.post("/api/webhooks/tally", async (req, res) => {
        try {
            console.log("Tally webhook received:", JSON.stringify(req.body, null, 2));

            // Optional signature verification (if TALLY_WEBHOOK_SECRET is set)
            const tallySecret = process.env.TALLY_WEBHOOK_SECRET;
            if (tallySecret) {
                const signature = req.headers['tally-signature'] as string;
                if (!tallyService.verifySignature(req.body, signature, tallySecret)) {
                    console.warn("Tally webhook: Invalid or missing signature");
                    return res.status(401).json({ error: "Invalid or missing signature" });
                }
            }

            const transaction = await tallyService.processWebhook(req.body);

            res.status(201).json({
                status: "ok",
                message: "Transaction created successfully",
                transaction
            });

        } catch (error: any) {
            console.error("Tally webhook error:", error);
            if (error.message && (error.message === "Account not found" || error.message === "Category not found" || error.message === "Invalid transaction data")) {
                return res.status(400).json({ error: error.message, ...error });
            }
            res.status(500).json({ error: "Failed to process Tally webhook" });
        }
    });

    // GET endpoint to verify webhook is working
    app.get("/api/webhooks/tally", async (req, res) => {
        const accounts = await storage.getAllAccounts();
        const categories = await storage.getAllCategories();

        res.json({
            status: "Tally webhook is ready",
            instructions: {
                method: "POST",
                contentType: "application/json",
                expectedFields: [
                    "Data (or Date) - DD/MM/YYYY format",
                    "Descrizione (or Description) - transaction description",
                    "Entrata (or Income) - income amount (European format: 1.234,56)",
                    "Uscita (or Expense) - expense amount (European format: 1.234,56)",
                    "Conto (or Account) - account name",
                    "Categoria (or Category) - category name"
                ],
                availableAccounts: accounts.map(a => a.name),
                availableCategories: categories.map(c => ({ name: c.name, type: c.type }))
            }
        });
    });
}
