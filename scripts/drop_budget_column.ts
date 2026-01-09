
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking for 'budget' column in 'categories' table...");
    try {
        // Check if column exists
        const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'categories' AND column_name = 'budget';
    `);

        if (checkResult.rows.length === 0) {
            console.log("Column 'budget' does not exist in 'categories'. Nothing to clean up.");
        } else {
            console.log("Column 'budget' found. Removing it...");
            await db.execute(sql`ALTER TABLE categories DROP COLUMN budget;`);
            console.log("Column 'budget' successfully removed.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error during cleanup:", err);
        process.exit(1);
    }
}

main();
