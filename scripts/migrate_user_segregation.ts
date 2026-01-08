
import { db } from "../server/db";
import { users, accounts, categories, holdings } from "../shared/schema";
import { eq, isNull } from "drizzle-orm";

async function migrate() {
    console.log("Starting migration...");

    // 1. Get the single user (assuming first user is the admin/owner)
    const allUsers = await db.select().from(users).limit(1);
    if (allUsers.length === 0) {
        console.error("No users found. Creating a default user is not part of this script. Please ensure a user exists.");
        process.exit(1);
    }

    const user = allUsers[0];
    console.log(`Found user: ${user.username} (${user.id})`);

    // 2. Update Accounts
    console.log("Updating accounts...");
    const accountsResult = await db.update(accounts)
        .set({ userId: user.id })
        .where(isNull(accounts.userId))
        .returning();
    console.log(`Updated ${accountsResult.length} accounts.`);

    // 3. Update Categories
    console.log("Updating categories...");
    const categoriesResult = await db.update(categories)
        .set({ userId: user.id })
        .where(isNull(categories.userId))
        .returning();
    console.log(`Updated ${categoriesResult.length} categories.`);

    // 4. Update Holdings
    console.log("Updating holdings...");
    const holdingsResult = await db.update(holdings)
        .set({ userId: user.id })
        .where(isNull(holdings.userId))
        .returning();
    console.log(`Updated ${holdingsResult.length} holdings.`);

    console.log("Migration complete.");
    process.exit(0);
}

migrate().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
