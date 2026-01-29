import { db } from "./db";
import { accounts, categories } from "@shared/schema";
import { createLogger } from "./lib/logger";

const log = createLogger("Seed");

async function seed() {
  log.info("Seeding database...");

  // Seed accounts
  const defaultAccounts = [
    { name: "Main Checking", type: "checking", startingBalance: "200.50", currency: "EUR", color: "#3b82f6" },
    { name: "High Yield Savings", type: "savings", startingBalance: "12000.00", currency: "EUR", color: "#10b981" },
    { name: "Amex Gold", type: "credit", startingBalance: "-330.20", currency: "EUR", color: "#f59e0b" },
    { name: "Wallet Cash", type: "cash", startingBalance: "85.00", currency: "EUR", color: "#6366f1" },
  ];

  for (const account of defaultAccounts) {
    await db.insert(accounts).values(account).onConflictDoNothing();
  }

  // Seed categories
  const defaultCategories = [
    { name: "Salary", type: "income", color: "#10b981" },
    { name: "Freelance", type: "income", color: "#34d399" },
    { name: "Groceries", type: "expense", color: "#f472b6" },
    { name: "Rent", type: "expense", color: "#fb7185" },
    { name: "Utilities", type: "expense", color: "#fbbf24" },
    { name: "Dining Out", type: "expense", color: "#f87171" },
    { name: "Transport", type: "expense", color: "#60a5fa" },
    { name: "Entertainment", type: "expense", color: "#818cf8" },
  ];

  for (const category of defaultCategories) {
    await db.insert(categories).values(category).onConflictDoNothing();
  }

  log.info("Database seeded successfully!");
  process.exit(0);
}

seed().catch((error) => {
  log.error("Error seeding database:", error);
  process.exit(1);
});
