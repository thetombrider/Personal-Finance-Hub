import type { Express } from "express";
import { storage } from "../storage";
import { insertCategorySchema } from "@shared/schema";
import { z } from "zod";
import { parseNumericParam, checkOwnership } from "./middleware";
import "./types";

export function registerCategoryRoutes(app: Express) {
    // ============ CATEGORIES ============

    app.get("/api/categories", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const categories = await storage.getCategories(req.user.id);
            res.json(categories);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch categories" });
        }
    });

    app.get("/api/categories/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const category = await storage.getCategory(id);
            if (!category) {
                return res.status(404).json({ error: "Category not found" });
            }

            if (!checkOwnership(category.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            res.json(category);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch category" });
        }
    });

    app.post("/api/categories", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const validated = insertCategorySchema.parse({ ...req.body, userId: req.user.id });
            const category = await storage.createCategory(validated);
            res.status(201).json(category);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create category" });
        }
    });

    app.post("/api/categories/bulk", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });
            const userId = req.user.id;

            const categoriesWithUserId = (Array.isArray(req.body) ? req.body : []).map(
                (c: any) => ({ ...c, userId })
            );
            const validated = z.array(insertCategorySchema).parse(categoriesWithUserId);

            const categories = await storage.createCategories(validated);
            res.status(201).json(categories);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create categories" });
        }
    });

    app.patch("/api/categories/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getCategory(id);
            if (!existing) {
                return res.status(404).json({ error: "Category not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            // Exclude userId to prevent ownership mutation
            const { userId: _, ...bodyWithoutUserId } = req.body;
            const validated = insertCategorySchema.partial().parse(bodyWithoutUserId);

            const category = await storage.updateCategory(id, validated);
            res.json(category);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to update category" });
        }
    });

    app.delete("/api/categories/:id", async (req, res) => {
        try {
            if (!req.user) return res.status(401).json({ error: "Unauthorized" });

            const id = parseNumericParam(req.params.id);
            if (id === null) return res.status(400).json({ error: "Invalid id" });

            const existing = await storage.getCategory(id);
            if (!existing) {
                return res.status(404).json({ error: "Category not found" });
            }
            if (!checkOwnership(existing.userId, req.user.id)) {
                return res.status(403).json({ error: "Forbidden" });
            }

            await storage.deleteCategory(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete category" });
        }
    });
}

