import type { Express } from "express";
import { storage } from "../storage";
import { insertCategorySchema } from "@shared/schema";
import { z } from "zod";

export function registerCategoryRoutes(app: Express) {
    // ============ CATEGORIES ============

    app.get("/api/categories", async (req, res) => {
        try {
            const categories = await storage.getCategories((req.user as any).id);
            res.json(categories);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch categories" });
        }
    });

    app.get("/api/categories/:id", async (req, res) => {
        try {
            const id = parseInt(req.params.id);
            const category = await storage.getCategory(id);
            if (!category) {
                return res.status(404).json({ error: "Category not found" });
            }
            res.json(category);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch category" });
        }
    });

    app.post("/api/categories", async (req, res) => {
        try {
            const validated = insertCategorySchema.parse({ ...req.body, userId: (req.user as any).id });
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
            const validated = z.array(insertCategorySchema).parse(req.body).map(c => ({ ...c, userId: (req.user as any).id }));
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
            const id = parseInt(req.params.id);
            const validated = insertCategorySchema.partial().parse(req.body);
            const category = await storage.updateCategory(id, validated);
            if (!category) {
                return res.status(404).json({ error: "Category not found" });
            }
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
            const id = parseInt(req.params.id);
            await storage.deleteCategory(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: "Failed to delete category" });
        }
    });
}
