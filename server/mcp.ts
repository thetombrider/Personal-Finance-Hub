
import { MCPServer } from "mcp-use/server";
import { z } from "zod-mcp";
import { db } from "./db";
import { accounts, transactions } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const server = new MCPServer({
    name: "Personal Finance MCP",
    version: "1.0.0",
});

// Authentication Middleware
server.use(async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const apiKey = process.env.MCP_API_KEY;

    if (!apiKey) {
        console.warn("MCP_API_KEY is not set. Authentication is disabled (NOT RECOMMENDED).");
        return next();
    }

    if (!authHeader || !authHeader.startsWith("Bearer ") || authHeader.split(" ")[1] !== apiKey) {
        res.status(401).send("Unauthorized");
        return;
    }

    next();
});

// Tool: Get Accounts
server.tool(
    {
        name: "get_accounts",
        description: "List all finance accounts",
        schema: z.object({}),
    },
    async () => {
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
                content: [{ type: "text", text: `Error fetching accounts: ${err.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Get Transactions
server.tool(
    {
        name: "get_transactions",
        description: "List transactions with optional pagination",
        schema: z.object({
            limit: z.number().optional().default(10),
            offset: z.number().optional().default(0),
        }),
    },
    async ({ limit, offset }) => {
        try {
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
                content: [{ type: "text", text: `Error fetching transactions: ${err.message}` }],
                isError: true,
            };
        }
    }
);

// Tool: Create Transaction
server.tool(
    {
        name: "create_transaction",
        description: "Create a new transaction manually",
        schema: z.object({
            date: z.string().describe("ISO date string"),
            amount: z.string().describe("Amount as string"),
            description: z.string(),
            accountId: z.number(),
            categoryId: z.number(),
            type: z.enum(["income", "expense"]),
        }),
    },
    async (input) => {
        try {
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
                content: [{ type: "text", text: `Error creating transaction: ${err.message}` }],
                isError: true,
            };
        }
    }
);

server.listen(3001).then(() => {
    console.log("MCP Server running on port 3001");
});
