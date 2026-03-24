# Chat Bubble Implementation Plan

A Notion AI-style floating chat bubble that lets users interact with their finance data through natural language, powered by Claude and the MCP tools.

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│  Browser                                             │
│  ┌────────────────────────────────────────────────┐  │
│  │  React App                                     │  │
│  │  ┌──────────────┐   ┌───────────────────────┐  │  │
│  │  │  ChatBubble   │   │  Existing App Pages   │  │  │
│  │  │  (floating)   │   │                       │  │  │
│  │  │  useChat()    │   │                       │  │  │
│  │  └──────┬───────┘   └───────────────────────┘  │  │
│  └─────────┼──────────────────────────────────────┘  │
│            │ POST /api/chat (streaming)               │
└────────────┼─────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────┐
│  Express Server (port 5000)                          │
│  ┌─────────────────────────────────────────────────┐ │
│  │  POST /api/chat route                           │ │
│  │  ┌───────────────┐    ┌───────────────────────┐ │ │
│  │  │ Vercel AI SDK │◄──►│  Claude API           │ │ │
│  │  │ streamText()  │    │  (tool_use loop)      │ │ │
│  │  └───────┬───────┘    └───────────────────────┘ │ │
│  │          │ execute()                             │ │
│  │  ┌───────▼──────────────────────────────────┐   │ │
│  │  │  storage layer (user-scoped queries)     │   │ │
│  │  │  Same repos used by REST API & MCP       │   │ │
│  │  └──────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────┘
```

### Why not call the MCP server directly?

The MCP server (port 3001) is designed for **external** clients like Claude Desktop.
For the in-app chat, the Express server already has the user's session and direct
access to the storage layer. Going through MCP would mean:
- Extra network hop (5000 → 3001)
- Needing an API token for a user who's already authenticated via session
- Serializing/deserializing through MCP protocol for no benefit

Instead, the chat route defines Claude tools that call the **same storage functions**
the MCP tools use. One source of truth, two interfaces (MCP for external, chat for internal).

## Technology Choices

### Vercel AI SDK (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/react`)

**Why this over raw Anthropic SDK:**
- `streamText()` handles the entire tool-use agentic loop automatically (Claude calls
  tool → SDK executes → sends result back → Claude responds → repeat until done)
- `pipeUIMessageStreamToResponse(res)` works natively with Express (no Next.js needed)
- `useChat()` hook manages all React state: messages, streaming, loading, abort, retry
- Message parts API gives typed `tool-invocation` blocks with `pending`/`result` states
  for showing inline tool execution UI
- 3 packages, ~200KB total, well-maintained

**Why not raw `@anthropic-ai/sdk`:**
- Would need a manual while-loop for tool execution
- Would need custom SSE streaming and client-side parsing
- Would need manual React state management for messages
- More code for the same result

### LLM Provider

Use Claude via `@ai-sdk/anthropic`. The provider is configured with `ANTHROPIC_API_KEY`.
Model recommendation: `claude-sonnet-4-5-20250929` (fast, capable, cheap for chat).

The existing `openai.ts` service uses OpenRouter for categorization — that stays
independent. This is a separate feature.

## Implementation Steps

### 1. Install Dependencies

```bash
npm install ai @ai-sdk/anthropic @ai-sdk/react
```

### 2. Backend: Chat Route (`server/routes/chat.ts`)

New file. Authenticated endpoint that streams Claude responses.

```typescript
import type { Express } from "express";
import { streamText, tool } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { storage } from "../storage";
import { createLogger } from "../lib/logger";

const logger = createLogger("Chat");

export function registerChatRoutes(app: Express) {
  app.post("/api/chat", async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    const userId = req.user.id;
    const { messages } = req.body;

    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      return res.status(503).json({ error: "Chat is not configured (missing ANTHROPIC_API_KEY)" });
    }

    const anthropic = createAnthropic({ apiKey: anthropicApiKey });

    try {
      const result = streamText({
        model: anthropic("claude-sonnet-4-5-20250929"),
        system: `You are a helpful personal finance assistant for FinTrack.
You help users understand their accounts, transactions, budgets, and portfolio.
Be concise and direct. Format currency amounts clearly.
When users ask about their finances, use the available tools to fetch real data.
Never fabricate financial data — always use tools to look it up.
Today's date is ${new Date().toISOString().split("T")[0]}.`,
        messages,
        tools: {
          get_accounts: tool({
            description: "List all of the user's finance accounts with balances",
            parameters: z.object({}),
            execute: async () => {
              const accounts = await storage.getAccounts(userId);
              return accounts;
            },
          }),
          get_categories: tool({
            description: "List all transaction categories",
            parameters: z.object({}),
            execute: async () => {
              const categories = await storage.getCategories(userId);
              return categories;
            },
          }),
          get_transactions: tool({
            description: "List recent transactions, sorted by date descending",
            parameters: z.object({
              limit: z.number().default(20).describe("Max transactions to return"),
              offset: z.number().default(0).describe("Offset for pagination"),
            }),
            execute: async ({ limit, offset }) => {
              const txs = await storage.getTransactions(userId);
              const sorted = txs.sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              );
              return sorted.slice(offset, offset + limit);
            },
          }),
          get_transactions_by_date_range: tool({
            description: "Get transactions within a specific date range",
            parameters: z.object({
              startDate: z.string().describe("Start date (YYYY-MM-DD)"),
              endDate: z.string().describe("End date (YYYY-MM-DD)"),
            }),
            execute: async ({ startDate, endDate }) => {
              return storage.getTransactionsByDateRange(
                userId, new Date(startDate), new Date(endDate)
              );
            },
          }),
          get_recurring_expenses: tool({
            description: "List all active recurring expenses/subscriptions",
            parameters: z.object({}),
            execute: async () => {
              return storage.getActiveRecurringExpenses(userId);
            },
          }),
          get_holdings: tool({
            description: "List portfolio holdings with current prices",
            parameters: z.object({}),
            execute: async () => {
              return storage.getHoldings(userId);
            },
          }),
          get_budget: tool({
            description: "Get monthly budget allocations for a given year and month",
            parameters: z.object({
              year: z.number().describe("Year (e.g. 2026)"),
              month: z.number().min(1).max(12).describe("Month (1-12)"),
            }),
            execute: async ({ year, month }) => {
              return storage.getMonthlyBudgets(userId, year, month);
            },
          }),
          create_transaction: tool({
            description: "Create a new transaction. Confirm details with the user before creating.",
            parameters: z.object({
              date: z.string().describe("ISO date string (YYYY-MM-DD)"),
              amount: z.string().describe("Amount as string (positive for income, negative for expense)"),
              description: z.string().describe("Transaction description"),
              accountId: z.number().describe("Account ID"),
              categoryId: z.number().describe("Category ID"),
              type: z.enum(["income", "expense"]).describe("Transaction type"),
            }),
            execute: async (input) => {
              // Verify ownership
              const account = await storage.getAccount(input.accountId);
              if (!account || account.userId !== userId) {
                return { error: "Account not found or not owned by this user" };
              }
              const cats = await storage.getCategories(userId);
              if (!cats.some((c) => c.id === input.categoryId)) {
                return { error: "Category not found or not owned by this user" };
              }
              const tx = await storage.createTransaction(input);
              return tx;
            },
          }),
        },
        maxSteps: 5, // max tool-call rounds before forcing a text response
      });

      result.pipeUIMessageStreamToResponse(res);
    } catch (err: any) {
      logger.error("Chat error:", err);
      res.status(500).json({ error: "Chat request failed" });
    }
  });
}
```

**Key decisions:**
- Tools call `storage.*` directly — same functions MCP uses, already user-scoped
- `maxSteps: 5` prevents infinite tool loops
- More tools than MCP: adds date-range queries, budget, holdings, recurring expenses
  (MCP can be expanded later to match)
- `create_transaction` includes ownership validation (same as MCP)
- System prompt includes today's date so Claude can reason about "this month", "last week"

**Register in `server/routes/index.ts`:**
```typescript
import { registerChatRoutes } from "./chat";
// inside registerRoutes():
registerChatRoutes(app);
```

### 3. Frontend: Chat Bubble Component

#### File structure
```
client/src/components/chat/
  ChatBubble.tsx        — Floating button + panel container
  ChatMessages.tsx      — Message list with tool invocation UI
  ChatInput.tsx         — Input bar with send/stop buttons
```

#### `ChatBubble.tsx` — Main container

Floating button in bottom-right corner. Clicking opens a panel (not a dialog — stays
alongside the page content). Uses framer-motion for smooth open/close animation.

```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@ai-sdk/react";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";

export default function ChatBubble() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    messages,
    input,
    setInput,
    handleSubmit,
    status,
    stop,
    setMessages,
  } = useChat({ api: "/api/chat" });

  const isStreaming = status === "streaming";

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="icon"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] max-h-[80vh]
                        flex flex-col rounded-2xl border bg-background shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-semibold text-sm">FinTrack Assistant</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMessages([])}
                  title="Clear chat"
                >
                  {/* Trash or refresh icon */}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setIsOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <ChatMessages messages={messages} isStreaming={isStreaming} />

            {/* Input */}
            <ChatInput
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isStreaming={isStreaming}
              stop={stop}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

#### `ChatMessages.tsx` — Message rendering

The AI SDK's `useChat` returns messages with a `parts` array. Each part is either
`text` or `tool-invocation` (with state `partial-call` / `call` / `result`).

```tsx
function ChatMessages({ messages, isStreaming }) {
  return (
    <ScrollArea className="flex-1 px-4 py-3">
      {messages.map((msg) => (
        <div key={msg.id} className={cn(
          "mb-4",
          msg.role === "user" ? "flex justify-end" : "flex justify-start"
        )}>
          <div className={cn(
            "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
            msg.role === "user"
              ? "bg-primary text-primary-foreground"
              : "bg-muted"
          )}>
            {msg.parts.map((part, i) => {
              if (part.type === "text") {
                return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
              }
              if (part.type === "tool-invocation") {
                return (
                  <ToolInvocation
                    key={i}
                    toolName={part.toolInvocation.toolName}
                    state={part.toolInvocation.state}
                    result={part.toolInvocation.result}
                  />
                );
              }
              return null;
            })}
          </div>
        </div>
      ))}
    </ScrollArea>
  );
}

function ToolInvocation({ toolName, state, result }) {
  // Show a compact inline indicator like:
  // [🔍 Fetching accounts...] or [✓ Found 5 accounts]
  const label = toolName.replace(/_/g, " ");

  if (state === "call" || state === "partial-call") {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Looking up {label}...</span>
      </div>
    );
  }

  // state === "result" — show brief summary
  const summary = summarizeToolResult(toolName, result);
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
      <Check className="h-3 w-3" />
      <span>{summary}</span>
    </div>
  );
}

function summarizeToolResult(toolName: string, result: any): string {
  if (!result) return "Done";
  if (Array.isArray(result)) return `Found ${result.length} ${toolName.replace("get_", "")}`;
  if (result.error) return result.error;
  if (result.id) return `Created #${result.id}`;
  return "Done";
}
```

#### `ChatInput.tsx` — Input bar

Simple form with textarea (auto-growing), send button, and stop button during streaming.
Enter to send, Shift+Enter for newline.

### 4. Inject into App

In `App.tsx`, render `<ChatBubble />` inside the authenticated section as a sibling to
`GlobalActionDialogs`, following the established pattern for global floating UI:

```tsx
<GlobalActionsProvider>
  <GlobalActionDialogs />
  <ChatBubble />           {/* ← new */}
  <Switch>
    ...routes...
  </Switch>
</GlobalActionsProvider>
```

This ensures:
- Only shown to authenticated users
- Available on every page
- Has access to FinanceProvider context if needed later
- Doesn't interfere with routing

### 5. Keyboard Shortcut

Add `Cmd/Ctrl + K` or a custom hotkey to toggle the chat, registered in
`GlobalActionDialogs.tsx` following the existing hotkey pattern (lines 56-77).
Consider `c` as the shortcut (matching the pattern: `t` for transaction, `x` for
transfer, etc.).

## UI/UX Details

### Panel Sizing
- **Desktop**: Fixed 420px wide, 600px tall (max 80vh), bottom-right corner
- **Mobile**: Full-width, bottom sheet style (80vh height), with drag-to-dismiss via Vaul
  (already in dependencies as `vaul`)

### Visual Design
- Follows existing shadcn/ui design system (bg-background, border, rounded-2xl)
- User messages: primary color bubble (right-aligned)
- Assistant messages: muted background (left-aligned)
- Tool invocations: compact inline chips with spinner/checkmark
- Typing indicator: animated dots while streaming

### Empty State
When no messages, show suggested prompts:
- "What's my net worth?"
- "Show my spending this month"
- "What subscriptions do I have?"
- "Log a $12 lunch expense"

### Persistence
Messages are kept in React state only (cleared on page refresh). No server-side
chat history storage — keeps it simple and avoids schema changes for v1.

## Environment Configuration

Single new env var:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Chat feature gracefully degrades: if `ANTHROPIC_API_KEY` is not set, the bubble
still renders but shows a setup message. The backend returns 503.

## Cost Considerations

- Claude Sonnet is ~$3/M input tokens, $15/M output tokens
- A typical chat turn with tool calls: ~2K input + 500 output tokens ≈ $0.01
- Budget tool results can be large — consider truncating to essential fields
  before returning to Claude (e.g., strip `createdAt`, `updatedAt` from accounts)

## File Manifest

| File | Type | Description |
|------|------|-------------|
| `server/routes/chat.ts` | New | Chat streaming endpoint with tools |
| `server/routes/index.ts` | Modified | Register chat routes |
| `client/src/components/chat/ChatBubble.tsx` | New | Floating panel container |
| `client/src/components/chat/ChatMessages.tsx` | New | Message list + tool UI |
| `client/src/components/chat/ChatInput.tsx` | New | Input bar |
| `client/src/App.tsx` | Modified | Add ChatBubble to authenticated layout |
| `client/src/components/GlobalActionDialogs.tsx` | Modified | Add chat hotkey |
| `package.json` | Modified | Add `ai`, `@ai-sdk/anthropic`, `@ai-sdk/react` |

## Future Enhancements (out of scope for v1)

- **Chat history persistence** — store conversations server-side
- **Page context awareness** — inject current page/filters as context
  (e.g., "I'm looking at March 2026 transactions for account X")
- **More tools** — reports, transfers, bulk operations, bank sync status
- **Markdown rendering** — render Claude's markdown responses with tables/lists
- **File/chart generation** — return inline charts from tool results
- **Rate limiting** — per-user rate limits on the chat endpoint
