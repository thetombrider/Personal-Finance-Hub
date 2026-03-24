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
        description: "List all finance accounts for the authenticated user",
    }, async () => {
        try {
            const userAccounts = await storage.getAccounts(userId);
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
        description: "List transactions for the authenticated user with optional pagination",
        inputSchema: {
            limit: z.number().default(10),
            offset: z.number().default(0),
        },
    }, async ({ limit, offset }) => {
        try {
            const allTxs = await storage.getTransactions(userId);
            const sorted = allTxs.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            const paginated = sorted.slice(offset, offset + limit);
            return { content: [{ type: "text", text: JSON.stringify(paginated, null, 2) }] };
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

        const sid = transport.sessionId!;
        sessions.set(sid, { transport, mcpServer, userId });
        logger.info(`New MCP session for user ${userId} (session ${sid})`);

        await transport.handleRequest(req, res, req.body);
        return;
    }

    // Unknown session or invalid request
    res.status(400).json({ error: "No valid MCP session. Send an initialize request first." });
});

app.listen(3001, () => {
    logger.info("MCP Server running on port 3001 (Streamable HTTP on /mcp)");
});
