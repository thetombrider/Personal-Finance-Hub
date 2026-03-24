import type { Express } from "express";
import crypto from "crypto";
import { storage } from "../storage";
import "./types";

/**
 * Hash a raw token string with SHA-256 for storage.
 */
export function hashToken(rawToken: string): string {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function registerApiTokenRoutes(app: Express) {
    // List user's tokens (never returns the raw token)
    app.get("/api/api-tokens", async (req, res) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        try {
            const tokens = await storage.getApiTokensByUser(req.user.id);
            // Strip token hashes from response
            const safe = tokens.map(({ tokenHash, ...rest }) => rest);
            res.json(safe);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch API tokens" });
        }
    });

    // Create a new token — returns the raw token ONCE
    app.post("/api/api-tokens", async (req, res) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        try {
            const name = req.body.name?.trim();
            if (!name || name.length < 1) {
                return res.status(400).json({ error: "Name is required" });
            }

            // Generate a random token with a recognizable prefix
            const rawToken = `ft_${crypto.randomBytes(32).toString("hex")}`;
            const tokenHash = hashToken(rawToken);

            const created = await storage.createApiToken({
                userId: req.user.id,
                name,
                tokenHash,
            });

            // Return the raw token only this one time
            const { tokenHash: _, ...safe } = created;
            res.status(201).json({ ...safe, token: rawToken });
        } catch (error) {
            res.status(500).json({ error: "Failed to create API token" });
        }
    });

    // Delete a token
    app.delete("/api/api-tokens/:id", async (req, res) => {
        if (!req.user) return res.status(401).json({ error: "Unauthorized" });
        try {
            const deleted = await storage.deleteApiToken(req.params.id, req.user.id);
            if (!deleted) {
                return res.status(404).json({ error: "Token not found" });
            }
            res.sendStatus(204);
        } catch (error) {
            res.status(500).json({ error: "Failed to delete API token" });
        }
    });
}
