import express, { Request, Response } from "express";
import { randomUUID } from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { storage } from "./storage";
import { hashToken } from "./routes/api-tokens";
import { createLogger } from "./lib/logger";

const logger = createLogger("MCP");
const app = express();
app.use(express.json());

// Track active sessions: sessionId -> { transport, mcpServer, userId }
const sessions = new Map<string, { transport: StreamableHTTPServerTransport; mcpServer: McpServer; userId: string }>();

/**
 * Authenticate via Bearer token (API token generated in Settings).
 * Looks up the token hash to resolve the owning userId.
 */
async function authenticateRequest(req: Request): Promise<string | null> {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

    const rawToken = authHeader.slice(7);
    if (!rawToken.startsWith("ft_")) return null;

    const tokenRecord = await storage.getApiTokenByHash(hashToken(rawToken));
    if (!tokenRecord) return null;

    // Update last-used timestamp in the background
    storage.updateApiTokenLastUsed(tokenRecord.id).catch(() => {});

    return tokenRecord.userId;
}

/**
 * Create a new McpServer instance with tools scoped to a specific userId.
 */
function createMcpServer(userId: string): McpServer {
    const mcpServer = new McpServer({
        name: "Personal Finance MCP",
        version: "1.0.0",
    });

    mcpServer.registerTool("get_accounts", {
        description: "List all finance accounts for the authenticated user, including computed current balance",
    }, async () => {
        try {
            const userAccounts = await storage.getExportableAccounts(userId);
            return { content: [{ type: "text", text: JSON.stringify(userAccounts, null, 2) }] };
        } catch (err: any) {
            return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
        }
    });

    mcpServer.registerTool("get_categories", {
        description: "List all categories for the authenticated user",
    }, async () => {
        try {
            const userCategories = await storage.getCategories(userId);
            return { content: [{ type: "text", text: JSON.stringify(userCategories, null, 2) }] };
        } catch (err: any) {
            return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
        }
    });

    mcpServer.registerTool("get_transactions", {
        description: "List transactions for the authenticated user with optional filters and pagination. Returns transactions sorted by date descending.",
        inputSchema: {
            limit: z.number().default(50),
            offset: z.number().default(0),
            accountId: z.number().optional().describe("Filter by account ID"),
            categoryId: z.number().optional().describe("Filter by category ID"),
            type: z.enum(["income", "expense"]).optional().describe("Filter by transaction type"),
            dateFrom: z.string().optional().describe("Filter from this date (ISO string, inclusive)"),
            dateTo: z.string().optional().describe("Filter up to this date (ISO string, inclusive)"),
            search: z.string().optional().describe("Search in transaction description"),
        },
    }, async ({ limit, offset, accountId, categoryId, type, dateFrom, dateTo, search }) => {
        try {
            let txs;
            if (dateFrom && dateTo) {
                txs = await storage.getTransactionsByDateRange(userId, new Date(dateFrom), new Date(dateTo));
            } else {
                txs = await storage.getTransactions(userId);
            }

            if (dateFrom && !dateTo) txs = txs.filter(t => new Date(t.date) >= new Date(dateFrom));
            if (dateTo && !dateFrom) txs = txs.filter(t => new Date(t.date) <= new Date(dateTo));
            if (accountId) txs = txs.filter(t => t.accountId === accountId);
            if (categoryId) txs = txs.filter(t => t.categoryId === categoryId);
            if (type) txs = txs.filter(t => t.type === type);
            if (search) {
                const q = search.toLowerCase();
                txs = txs.filter(t => t.description.toLowerCase().includes(q));
            }

            const sorted = txs.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const paginated = sorted.slice(offset, offset + limit);
            return { content: [{ type: "text", text: JSON.stringify({ total: sorted.length, returned: paginated.length, offset, transactions: paginated }, null, 2) }] };
        } catch (err: any) {
            return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
        }
    });

    mcpServer.registerTool("create_transaction", {
        description: "Create a new transaction for the authenticated user",
        inputSchema: {
            date: z.string().describe("ISO date string"),
            amount: z.string().describe("Amount as string"),
            description: z.string(),
            accountId: z.number(),
            categoryId: z.number(),
            type: z.enum(["income", "expense"]),
        },
    }, async ({ date, amount, description, accountId, categoryId, type }) => {
        try {
            const account = await storage.getAccount(accountId);
            if (!account || account.userId !== userId) {
                return { isError: true, content: [{ type: "text", text: "Account not found or not owned by this user" }] };
            }

            const userCategories = await storage.getCategories(userId);
            if (!userCategories.some(c => c.id === categoryId)) {
                return { isError: true, content: [{ type: "text", text: "Category not found or not owned by this user" }] };
            }

            const newTx = await storage.createTransaction({ date, amount, description, accountId, categoryId, type });
            return { content: [{ type: "text", text: JSON.stringify(newTx, null, 2) }] };
        } catch (err: any) {
            return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
        }
    });

    mcpServer.registerTool("update_transaction", {
        description: "Update an existing transaction. Only provide the fields you want to change.",
        inputSchema: {
            id: z.number().describe("Transaction ID to update"),
            date: z.string().optional().describe("ISO date string"),
            amount: z.string().optional().describe("Amount as string"),
            description: z.string().optional(),
            accountId: z.number().optional(),
            categoryId: z.number().optional(),
            type: z.enum(["income", "expense"]).optional(),
        },
    }, async ({ id, ...updates }) => {
        try {
            const existing = await storage.getTransaction(id);
            if (!existing) {
                return { isError: true, content: [{ type: "text", text: "Transaction not found" }] };
            }
            const account = await storage.getAccount(existing.accountId);
            if (!account || account.userId !== userId) {
                return { isError: true, content: [{ type: "text", text: "Transaction not owned by this user" }] };
            }

            if (updates.accountId) {
                const newAccount = await storage.getAccount(updates.accountId);
                if (!newAccount || newAccount.userId !== userId) {
                    return { isError: true, content: [{ type: "text", text: "Target account not found or not owned by this user" }] };
                }
            }
            if (updates.categoryId) {
                const userCategories = await storage.getCategories(userId);
                if (!userCategories.some(c => c.id === updates.categoryId)) {
                    return { isError: true, content: [{ type: "text", text: "Category not found or not owned by this user" }] };
                }
            }

            const filtered = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
            const updated = await storage.updateTransaction(id, filtered);
            return { content: [{ type: "text", text: JSON.stringify(updated, null, 2) }] };
        } catch (err: any) {
            return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
        }
    });

    mcpServer.registerTool("delete_transaction", {
        description: "Delete a transaction by ID",
        inputSchema: {
            id: z.number().describe("Transaction ID to delete"),
        },
    }, async ({ id }) => {
        try {
            const existing = await storage.getTransaction(id);
            if (!existing) {
                return { isError: true, content: [{ type: "text", text: "Transaction not found" }] };
            }
            const account = await storage.getAccount(existing.accountId);
            if (!account || account.userId !== userId) {
                return { isError: true, content: [{ type: "text", text: "Transaction not owned by this user" }] };
            }

            await storage.deleteTransaction(id);
            return { content: [{ type: "text", text: `Transaction ${id} deleted successfully` }] };
        } catch (err: any) {
            return { isError: true, content: [{ type: "text", text: `Error: ${err.message}` }] };
        }
    });

    return mcpServer;
}

// Unified MCP endpoint — handles GET (SSE stream), POST (messages), DELETE (session cleanup)
app.all('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    // Existing session — route to its transport
    if (sessionId && sessions.has(sessionId)) {
        const session = sessions.get(sessionId)!;
        await session.transport.handleRequest(req, res, req.body);
        return;
    }

    // New session — authenticate first
    if (req.method === 'POST' && !sessionId) {
        const userId = await authenticateRequest(req);
        if (!userId) {
            res.status(401).json({ error: "Invalid or missing API token. Generate one in Settings > API Tokens." });
            return;
        }

        const mcpServer = createMcpServer(userId);
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
        });

        transport.onclose = () => {
            const sid = transport.sessionId;
            if (sid) {
                sessions.delete(sid);
                logger.info(`Session closed: ${sid}`);
            }
        };

        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, req.body);

        const sid = transport.sessionId;
        if (sid) {
            sessions.set(sid, { transport, mcpServer, userId });
            logger.info(`New MCP session for user ${userId} (session ${sid})`);
        }
        return;
    }

    // Unknown session or invalid request
    res.status(400).json({ error: "No valid MCP session. Send an initialize request first." });
});

app.listen(3001, () => {
    logger.info("MCP Server running on port 3001 (Streamable HTTP on /mcp)");
});
