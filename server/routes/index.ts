import type { Express } from "express";
import { type Server } from "http";

import { registerAuthRoutes } from "./auth";
import { registerDataRoutes } from "./data";
import { registerGoCardlessRoutes } from "./gocardless";
import { registerReconciliationRoutes } from "./reconciliation";
import { registerAccountRoutes } from "./accounts";
import { registerCategoryRoutes } from "./categories";
import { registerTransactionRoutes } from "./transactions";
import { registerTransferRoutes } from "./transfers";
import { registerWebhookRoutes } from "./webhooks";
import { registerHoldingRoutes } from "./holdings";
import { registerTradeRoutes } from "./trades";
import { registerReportRoutes } from "./reports";
import { registerBudgetRoutes } from "./budget";
import { registerMarketRoutes } from "./market";


export async function registerRoutes(
    httpServer: Server,
    app: Express
): Promise<Server> {

    // Register Auth Routes (and Middleware)
    registerAuthRoutes(app);

    // Register all other routes
    registerDataRoutes(app);
    registerGoCardlessRoutes(app);
    registerReconciliationRoutes(app);
    registerAccountRoutes(app);
    registerCategoryRoutes(app);
    registerTransactionRoutes(app);
    registerTransferRoutes(app);
    registerWebhookRoutes(app);
    registerHoldingRoutes(app);
    registerTradeRoutes(app);
    registerReportRoutes(app);
    registerBudgetRoutes(app);
    registerMarketRoutes(app);

    return httpServer;
}
