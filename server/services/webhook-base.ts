import crypto from "crypto";
import { type IStorage } from "../storage";
import { type Webhook, type InsertWebhookLog } from "@shared/schema";

/**
 * Context passed to webhook processors containing user-specific data
 */
export interface WebhookContext {
    webhook: Webhook;
    userId: string;
    storage: IStorage;
}

/**
 * Result from processing a webhook
 */
export interface WebhookResult {
    success: boolean;
    data?: any;
    error?: string;
}

/**
 * Interface that all webhook processors must implement
 */
export interface WebhookProcessor {
    /** Unique type identifier for this processor (e.g., "tally", "zapier") */
    type: string;

    /** Validate the incoming payload structure */
    validatePayload(payload: any): { valid: boolean; error?: string };

    /** Process the webhook payload and create/modify data */
    processPayload(payload: any, context: WebhookContext): Promise<WebhookResult>;
}

/**
 * Generic webhook service that handles routing, logging, and signature verification
 */
export class WebhookService {
    private storage: IStorage;
    private processors: Map<string, WebhookProcessor> = new Map();

    constructor(storage: IStorage) {
        this.storage = storage;
    }

    /**
     * Register a webhook processor for a specific type
     */
    registerProcessor(processor: WebhookProcessor): void {
        this.processors.set(processor.type, processor);
    }

    /**
     * Get a registered processor by type
     */
    getProcessor(type: string): WebhookProcessor | undefined {
        return this.processors.get(type);
    }

    /**
     * Verify HMAC signature for webhook payload
     */
    verifySignature(payload: string, signature: string, secret: string): boolean {
        if (!signature || !secret) return false;

        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('base64');

        const signatureBuffer = Buffer.from(signature);
        const expectedBuffer = Buffer.from(expectedSignature);

        if (signatureBuffer.length !== expectedBuffer.length) {
            return false;
        }

        return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    }

    /**
     * Process an incoming webhook request
     */
    async processWebhook(
        webhookId: string,
        payload: any,
        rawBody: string,
        signature?: string
    ): Promise<{ status: number; body: any }> {
        const startTime = Date.now();

        // 1. Look up the webhook
        const webhook = await this.storage.getWebhook(webhookId);
        if (!webhook) {
            return { status: 404, body: { error: "Webhook not found" } };
        }

        if (!webhook.active) {
            return { status: 403, body: { error: "Webhook is disabled" } };
        }

        // 2. Verify signature if secret is configured
        if (webhook.secret) {
            if (!signature || !this.verifySignature(rawBody, signature, webhook.secret)) {
                await this.logRequest(webhookId, "invalid_signature", payload, null, "Invalid or missing signature", startTime);
                return { status: 401, body: { error: "Invalid or missing signature" } };
            }
        }

        // 3. Get the processor for this webhook type
        const processor = this.processors.get(webhook.type);
        if (!processor) {
            await this.logRequest(webhookId, "error", payload, null, `No processor for type: ${webhook.type}`, startTime);
            return { status: 400, body: { error: `Unsupported webhook type: ${webhook.type}` } };
        }

        // 4. Validate payload
        const validation = processor.validatePayload(payload);
        if (!validation.valid) {
            await this.logRequest(webhookId, "error", payload, null, validation.error || "Invalid payload", startTime);
            return { status: 400, body: { error: validation.error || "Invalid payload" } };
        }

        // 5. Process the webhook
        try {
            const context: WebhookContext = {
                webhook,
                userId: webhook.userId,
                storage: this.storage,
            };

            const result = await processor.processPayload(payload, context);

            if (result.success) {
                await this.logRequest(webhookId, "success", payload, result.data, null, startTime);
                await this.storage.updateWebhookLastUsed(webhookId);
                return { status: 201, body: { status: "ok", data: result.data } };
            } else {
                await this.logRequest(webhookId, "error", payload, null, result.error || "Processing failed", startTime);
                return { status: 400, body: { error: result.error } };
            }
        } catch (error: any) {
            const errorMessage = error.message || "Unknown error";
            await this.logRequest(webhookId, "error", payload, null, errorMessage, startTime);
            return { status: 500, body: { error: "Internal processing error" } };
        }
    }

    /**
     * Log a webhook request
     */
    private async logRequest(
        webhookId: string,
        status: string,
        requestBody: any,
        responseBody: any,
        errorMessage: string | null,
        startTime: number
    ): Promise<void> {
        const log: InsertWebhookLog = {
            webhookId,
            status,
            requestBody,
            responseBody,
            errorMessage,
            processingTimeMs: Date.now() - startTime,
        };
        await this.storage.createWebhookLog(log);
    }
}
