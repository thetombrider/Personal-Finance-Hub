
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Starting migration: Rename gocardless_transaction_id to external_id...");

    try {
        // 1. Rename column in transactions table
        await db.execute(sql`
      ALTER TABLE transactions 
      RENAME COLUMN gocardless_transaction_id TO external_id;
    `);
        console.log("Renamed column in 'transactions' table.");

        // 2. Rename column in import_staging table
        await db.execute(sql`
      ALTER TABLE import_staging 
      RENAME COLUMN gocardless_transaction_id TO external_id;
    `);
        console.log("Renamed column in 'import_staging' table.");

        // 3. Rename constraint in transactions table (if it exists under a specific name, usually auto-generated)
        // Drizzle usually names unique constraints like "transactions_gocardless_transaction_id_unique"
        // We should try to rename it for cleanliness, though it's not strictly blocking functionality.
        // Postgres automatically renames the index when the column is renamed, but the constraint name might persist.
        // We'll skip manual constraint renaming to avoid "relation does not exist" errors if naming varies.
        // Postgres is smart enough to handle the column rename safely.

        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
        process.exit(1);
    }

    process.exit(0);
}

main();
