import express, { Request, Response, NextFunction } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { db } from "./db";
import { accounts, transactions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { createLogger } from "./lib/logger";

const logger = createLogger("MCP");
const app = express();

const server = new Server({
    name: "Personal Finance MCP",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {}
    }
});

app.use((req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const apiKey = process.env.MCP_API_KEY;

    // Allow requests without API key locally or if not configured strictly,
    // but recommended to always set it.
    if (!apiKey) {
        logger.warn("MCP_API_KEY is not set. Authentication is disabled (NOT RECOMMENDED).");
        return next();
    }

    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== apiKey) {
        res.status(401).send("Unauthorized");
        return;
    }

    next();
});

let transport: SSEServerTransport | null = null;

app.get('/mcp/sse', async (req: Request, res: Response) => {
    transport = new SSEServerTransport("/mcp/messages", res);
    await server.connect(transport);
    
    res.on('close', () => {
        logger.info("SSE connection closed");
        transport = null;
    });
});

app.post('/mcp/messages', async (req: Request, res: Response) => {
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(400).send("No active SSE connection");
    }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "get_accounts",
                description: "List all finance accounts",
                inputSchema: {
                    type: "object",
                    properties: {},
                }
            },
            {
                name: "get_transactions",
                description: "List transactions with optional pagination",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number", default: 10 },
                        offset: { type: "number", default: 0 }
                    }
                }
            },
            {
                name: "create_transaction",
                description: "Create a new transaction manually",
                inputSchema: {
                    type: "object",
                    properties: {
                        date: { type: "string", description: "ISO date string" },
                        amount: { type: "string", description: "Amount as string" },
                        description: { type: "string" },
                        accountId: { type: "number" },
                        categoryId: { type: "number" },
                        type: { type: "string", enum: ["income", "expense"] }
                    },
                    required: ["date", "amount", "description", "accountId", "categoryId", "type"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const toolName = request.params.name;
    const args = request.params.arguments || {};

    if (toolName === "get_accounts") {
        try {
            const allAccounts = await db.select().from(accounts);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(allAccounts, null, 2),
                    },
                ],
            };
        } catch (err: any) {
            return {
                isError: true,
                content: [{ type: "text", text: `Error fetching accounts: ${err.message}` }],
            };
        }
    }

    if (toolName === "get_transactions") {
        try {
            const limit = typeof args.limit === 'number' ? args.limit : 10;
            const offset = typeof args.offset === 'number' ? args.offset : 0;
            
            const txs = await db
                .select()
                .from(transactions)
                .orderBy(desc(transactions.date))
                .limit(limit)
                .offset(offset);
                
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(txs, null, 2),
                    },
                ],
            };
        } catch (err: any) {
            return {
                isError: true,
                content: [{ type: "text", text: `Error fetching transactions: ${err.message}` }],
            };
        }
    }

    if (toolName === "create_transaction") {
        try {
            const input = {
                date: String(args.date),
                amount: String(args.amount),
                description: String(args.description),
                accountId: Number(args.accountId),
                categoryId: Number(args.categoryId),
                type: String(args.type),
            };
            const [newTx] = await db.insert(transactions).values(input).returning();
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(newTx, null, 2),
                    },
                ],
            };
        } catch (err: any) {
            return {
                isError: true,
                content: [{ type: "text", text: `Error creating transaction: ${err.message}` }],
            };
        }
    }

    throw new Error(`Unknown tool: ${toolName}`);
});

app.listen(3001, () => {
    logger.info("MCP Server running on port 3001 (SSE on /mcp/sse, Messages on /mcp/messages)");
});
