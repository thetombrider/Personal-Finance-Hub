import type { Express } from "express";
import { storage } from "../storage";
import { insertAccountSchema } from "@shared/schema";
import { z } from "zod";

export function registerAccountRoutes(app: Express) {
    // ============ ACCOUNTS ============

    app.get("/api/accounts", async (req, res) => {
        try {
            const accounts = await storage.getAccounts((req.user as any).id);
            res.json(accounts);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch accounts" });
        }
    });

    app.get("/api/accounts/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const account = await storage.getAccount(id);
            if (!account) {
                return res.status(404).json({ error: "Account not found" });
            }
            res.json(account);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch account" });
        }
    });

    app.post("/api/accounts", async (req, res) => {
        try {
            const validated = insertAccountSchema.parse({ ...req.body, userId: (req.user as any).id });
            const account = await storage.createAccount(validated);
            res.status(201).json(account);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create account" });
        }
    });

    app.post("/api/accounts/bulk", async (req, res) => {
        try {
            const validated = z.array(insertAccountSchema).parse(req.body).map(a => ({ ...a, userId: (req.user as any).id }));
            const accounts = await storage.createAccounts(validated);
            res.status(201).json(accounts);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create accounts" });
        }
    });

    app.patch("/api/accounts/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const validated = insertAccountSchema.partial().parse(req.body);
            const account = await storage.updateAccount(id, validated);
            if (!account) {
                return res.status(404).json({ error: "Account not found" });
            }
            res.json(account);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update account" });
        }
    });

    app.delete("/api/accounts/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            await storage.deleteAccount(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete account" });
        }
    });
}
