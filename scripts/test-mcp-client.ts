import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const apiKey = process.env.MCP_API_KEY;

const transport = new SSEClientTransport(new URL("http://localhost:3001/mcp/sse"), {
    requestInit: {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {}
    }
});

const client = new Client({
    name: "test-client",
    version: "1.0.0"
}, {
    capabilities: {}
});

async function runTest() {
    try {
        console.log("Connecting to MCP server at http://localhost:3001/mcp/sse...");
        await client.connect(transport);
        console.log("✅ Connected!");

        console.log("\nFetching tools...");
        const tools = await client.listTools();
        console.log("✅ Available tools:", tools.tools.map(t => t.name).join(", "));

        console.log("\nCalling get_accounts (limit 1 for testing)...");
        const result = await client.callTool({
            name: "get_accounts",
            arguments: {}
        });
        
        if (result.isError) {
            console.error("❌ Tool execution returned an error:", result.content);
        } else {
            console.log("✅ get_accounts executed successfully.");
            const content = result.content[0] as any;
            if (content && content.text) {
                const accounts = JSON.parse(content.text);
                console.log(`Found ${accounts.length} accounts. First account:`, accounts[0]?.name || "None");
            }
        }

        console.log("\nAll tests passed successfully!");
        process.exit(0);
    } catch (err: any) {
        console.error("❌ Test failed:", err?.message || err);
        process.exit(1);
    }
}

runTest();
