import type { Express } from "express";
import { storage } from "../storage";
import { insertAccountSchema } from "@shared/schema";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";
import "./types"; // Import for type augmentation

export function registerAccountRoutes(app: Express) {
    // ============ ACCOUNTS ============

    app.get("/api/accounts", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const accounts = await storage.getAccounts(req.user.id);
            res.json(accounts);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch accounts" });
        }
    });

    app.get("/api/accounts/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const account = await storage.getAccount(id);
            if (!account) {
                return res.status(404).json({ error: "Account not found" });
            }

            // Ownership check
            if (!checkOwnership(account.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            res.json(account);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch account" });
        }
    });

    app.post("/api/accounts", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const validated = insertAccountSchema.parse({ ...req.body, userId: req.user.id });
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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = req.user.id;

            // Add userId to each account BEFORE validation
            const accountsWithUserId = (Array.isArray(req.body) ? req.body : []).map(
                (a: any) => ({ ...a, userId })
            );
            const validated = z.array(insertAccountSchema).parse(accountsWithUserId);

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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            // Fetch existing account for ownership check
            const existing = await storage.getAccount(id);
            if (!existing) {
                return res.status(404).json({ error: "Account not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // Parse body but exclude userId to prevent ownership mutation
            const { userId: _, ...bodyWithoutUserId } = req.body;
            const validated = insertAccountSchema.partial().parse(bodyWithoutUserId);

            const account = await storage.updateAccount(id, validated);
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
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            // Fetch existing account for ownership check
            const existing = await storage.getAccount(id);
            if (!existing) {
                return res.status(404).json({ error: "Account not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await storage.deleteAccount(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete account" });
        }
    });
}

